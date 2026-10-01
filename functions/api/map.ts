/**
 * GET /api/map   pins for the map search, same params as /api/listings (home, area, price, beds, city, for)
 *
 * Every matching listing with only what a pin needs: key, position, price and a few facts. Photos and
 * details load one at a time from /api/listings?id= when a pin is chosen. Listings whose seller hid
 * the address or the listing are never looked up and never pinned.
 *
 * PropTx's IDX feed leaves Latitude and Longitude empty, so addresses are geocoded with Geocodio
 * (GEOCODIO_API_KEY; Canada supported, results may be stored) and kept in D1 table geocodes_v2, so
 * each listing is looked up once. Lookups run after the answer is sent, so a visitor never waits for
 * them; new pins appear on a later visit. The daily listing-counts workflow calls this endpoint so
 * new listings are placed each morning.
 *
 * Geocodio gives 2,500 lookups a day free. The key is shared with kirbychanmarkham.com, so this site
 * spends at most GEOCODIO_DAILY_LIMIT (default 2,000) in any 24 hours, leaving room for Markham's.
 * The owner wants the free lookups only: never raise it past the free quota.
 *
 * With no city or neighbourhood chosen the map covers the whole GTA (GTA in src/lib/proptx.ts).
 * Toronto addresses are looked up first, so the view the map opens on fills in first.
 */
import { MAP_PAGE, PROPTX_BASE, mapQuery } from '../../src/lib/proptx';
import type { D1 } from '../../src/lib/vow';

interface Context {
  request: Request;
  env: { PROPTX_IDX_TOKEN?: string; GEOCODIO_API_KEY?: string; GEOCODIO_DAILY_LIMIT?: string; VOW_DB?: D1 };
  waitUntil(p: Promise<unknown>): void;
}

/** On since 2026-10-01: five test addresses came back rooftop inside Toronto and the owner chose the free pace. */
const LOOKUPS_ON = true;
/** Below this Geocodio accuracy the point is a street or area guess, not the house, so no pin. */
const MIN_ACCURACY = 0.8;
/** Most new lookups one request starts. */
const MAX_LOOKUPS = 1000;
/** 40 pages of 1,000 covers every GTA search, inside the 50 subrequests a request may make. */
const MAX_PAGES = 40;
/** PropTx pages fetched at once. */
const AT_ONCE = 8;
/** Anything outside southern Ontario is a wrong match (for example a same-named US street). */
const ONTARIO = { s: 41.6, n: 46.5, w: -83.2, e: -74.3 };
type Geo = { key: string; lat: number | null; lng: number | null };

let tableReady: Promise<unknown> | null = null;
const ensureTable = (db: D1) =>
  (tableReady ??= db
    .prepare('CREATE TABLE IF NOT EXISTS geocodes_v2 (key TEXT PRIMARY KEY, lat REAL, lng REAL, accuracy REAL, address TEXT NOT NULL, at INTEGER NOT NULL)')
    .bind()
    .run()
    .catch((e) => {
      tableReady = null;
      throw e;
    }));

/**
 * The address as Geocodio reads it best: street number, name and suffix, then city, province,
 * postal code and country. Unit numbers and parking levels are left out, "Canada" stops a match on
 * a same-named street in the United States, and TRREB's district code ("Toronto C01") is dropped.
 */
export function geocodeAddress(r: Record<string, unknown>): string | null {
  const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const street = [r.StreetNumber, r.StreetName, r.StreetSuffix, r.StreetDirSuffix].map(s).filter(Boolean).join(' ');
  const city = s(r.City).replace(/\s+[CEW]\d{2}$/i, '');
  if (!street || !city) return null;
  return [street, city, `${s(r.StateOrProvince) || 'ON'} ${s(r.PostalCode)}`.trim(), 'Canada'].join(', ');
}

/** accuracy -1 marks an address being looked up right now, so a second request does not look it up again. */
const CLAIMED = -1;
const CLAIM_MS = 10 * 60e3;

/**
 * Stored positions for these listings, in one query. A row with null lat means "looked up, no
 * reliable point" or "being looked up". A claim older than ten minutes failed and is tried again.
 */
async function stored(db: D1, keys: string[]): Promise<Map<string, Geo>> {
  const { results } = await db
    .prepare('SELECT key, lat, lng FROM geocodes_v2 WHERE key IN (SELECT value FROM json_each(?)) AND NOT (accuracy = ? AND at < ?)')
    .bind(JSON.stringify(keys), CLAIMED, Date.now() - CLAIM_MS)
    .all<Geo>();
  return new Map(results.map((r) => [r.key, r]));
}

/** Lookups spent in the last 24 hours: every lookup leaves a row. */
async function spentToday(db: D1): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM geocodes_v2 WHERE at > ?').bind(Date.now() - 864e5).first<{ n: number }>();
  return row?.n ?? 0;
}

/** Geocodio's answer for each address: a point only when it is the house itself, inside Ontario. */
export async function geocode(apiKey: string, todo: { key: string; address: string }[]) {
  const res = await fetch('https://api.geocod.io/v2/geocode', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(Object.fromEntries(todo.map((t) => [t.key, t.address]))),
  });
  if (!res.ok) throw new Error(`Geocodio ${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as {
    results: Record<string, { response?: { results?: { location: { lat: number; lng: number }; accuracy: number; accuracy_type: string; formatted_address: string }[] } }>;
  };
  return todo.map((t) => {
    const best = data.results?.[t.key]?.response?.results?.[0];
    const inside = best && best.location.lat > ONTARIO.s && best.location.lat < ONTARIO.n && best.location.lng > ONTARIO.w && best.location.lng < ONTARIO.e;
    const good = !!best && best.accuracy >= MIN_ACCURACY && !!inside;
    return { ...t, lat: good ? best.location.lat : null, lng: good ? best.location.lng : null, accuracy: best?.accuracy ?? null, type: best?.accuracy_type, found: best?.formatted_address };
  });
}

/** Writes rows in batches of 100: one D1 call per batch, not one per row. */
async function write(db: D1, rows: { key: string; lat: number | null; lng: number | null; accuracy: number | null; address: string }[]) {
  const now = Date.now();
  const writes = rows.map((g) =>
    db.prepare('INSERT OR REPLACE INTO geocodes_v2 (key, lat, lng, accuracy, address, at) VALUES (?, ?, ?, ?, ?, ?)').bind(g.key, g.lat, g.lng, g.accuracy, g.address, now)
  );
  for (let i = 0; i < writes.length; i += 100) await db.batch!(writes.slice(i, i + 100));
}

/** Looks up and saves new addresses. On a Geocodio failure the claims are dropped so the next request retries. */
async function lookup(db: D1, apiKey: string, todo: { key: string; address: string }[]) {
  try {
    await write(db, await geocode(apiKey, todo));
  } catch (e) {
    console.error(String(e));
    await db.prepare('DELETE FROM geocodes_v2 WHERE accuracy = ? AND key IN (SELECT value FROM json_each(?))').bind(CLAIMED, JSON.stringify(todo.map((t) => t.key))).run();
  }
}

const json = (body: unknown, status = 200, ttl = 300) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': status === 200 ? `public, max-age=${ttl}` : 'no-store', 'x-robots-tag': 'noindex' },
  });

export async function onRequestGet({ request, env, waitUntil }: Context): Promise<Response> {
  const token = env.PROPTX_IDX_TOKEN?.trim();
  if (!token) return json({ error: 'not-configured' }, 503);
  const url = new URL(request.url);
  const params = new URLSearchParams();
  for (const k of ['home', 'area', 'price', 'beds', 'city', 'for']) {
    const v = url.searchParams.get(k);
    if (v) params.set(k, v.slice(0, 40));
  }
  const cacheKey = new Request(`${url.origin}/api/map?${params}`);
  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;
  if (!env.VOW_DB) return json({ error: 'map-not-configured' }, 503);
  await ensureTable(env.VOW_DB);

  const page = async (n: number) => {
    const res = await fetch(`${PROPTX_BASE}/Property?${mapQuery(params, n)}`, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`PropTx map ${res.status} ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as { value: Record<string, unknown>[]; '@odata.count'?: number };
  };
  let rows: Record<string, unknown>[];
  let total: number;
  try {
    const first = await page(0);
    total = first['@odata.count'] ?? first.value.length;
    const pages = Math.min(Math.ceil(total / MAP_PAGE), MAX_PAGES);
    const rest: Awaited<ReturnType<typeof page>>[] = [];
    for (let n = 1; n < pages; n += AT_ONCE) {
      rest.push(...(await Promise.all(Array.from({ length: Math.min(AT_ONCE, pages - n) }, (_, i) => page(n + i)))));
    }
    rows = [first, ...rest].flatMap((p) => p.value);
  } catch (e) {
    console.error(String(e));
    return json({ error: 'upstream' }, 503);
  }

  // Seller choices first: a hidden listing or a hidden address never gets a pin or a lookup.
  const shown = rows.filter((r) => r.InternetEntireListingDisplayYN !== false && r.InternetAddressDisplayYN !== false && geocodeAddress(r));
  const known = await stored(env.VOW_DB, shown.map((r) => String(r.ListingKey)));
  const isToronto = (r: Record<string, unknown>) => String(r.City ?? '').startsWith('Toronto');
  const todo = shown
    .filter((r) => !known.has(String(r.ListingKey)))
    .sort((a, b) => Number(isToronto(b)) - Number(isToronto(a)))
    .map((r) => ({ key: String(r.ListingKey), address: geocodeAddress(r)! }));

  let pending = false;
  if (LOOKUPS_ON && env.GEOCODIO_API_KEY && todo.length) {
    const db = env.VOW_DB;
    const limit = Math.min(Number(env.GEOCODIO_DAILY_LIMIT) || 2000, 2400);
    const room = Math.min(MAX_LOOKUPS, limit - (await spentToday(db)));
    if (room > 0) {
      pending = true;
      const batch = todo.slice(0, room);
      // Claimed before answering, so a request arriving meanwhile skips these addresses.
      await write(db, batch.map((t) => ({ ...t, lat: null, lng: null, accuracy: CLAIMED })));
      waitUntil(lookup(db, env.GEOCODIO_API_KEY.trim(), batch));
    }
  }

  const pins: unknown[] = [];
  for (const r of shown) {
    const g = known.get(String(r.ListingKey));
    if (!g || g.lat == null || g.lng == null) continue;
    pins.push({
      k: r.ListingKey,
      la: Math.round(g.lat * 1e5) / 1e5,
      ln: Math.round(g.lng * 1e5) / 1e5,
      p: r.ListPrice,
      b: r.BedroomsTotal,
      ba: r.BathroomsTotalInteger,
      t: typeof r.PropertySubType === 'string' ? r.PropertySubType.trim() : null,
      s: Array.isArray(r.ArchitecturalStyle) ? r.ArchitecturalStyle.join(', ') : null,
      a: r.UnparsedAddress,
    });
  }
  // While addresses are still being placed, the answer is kept a minute instead of five.
  const res = json({ pins, total, hidden: total - pins.length, more: total > rows.length }, 200, pending || todo.length ? 60 : 300);
  waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
