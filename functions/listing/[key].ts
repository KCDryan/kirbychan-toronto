/**
 * GET /listing/<ListingKey>/   one page per MLS® listing, rendered from the live feed.
 *
 * A new listing has a page the moment it is in the PropTx feed: nothing is built ahead. The page is
 * poured into the built shell (/homes-for-sale/listing-shell/) so it carries the site's header,
 * footer, styles and security headers.
 *
 * When a listing leaves the feed, a visitor is sent with a 301 to the neighbourhood guide for its
 * community when this site has one, otherwise to that neighbourhood's /homes-for-sale/ page, otherwise
 * to the Toronto search. A rental with no neighbourhood page keeps the rent filter. The redirect is
 * not stored here, so the next request that reaches us is a normal listing page again if the same
 * MLS key is back in the feed. Browsers and Google may still remember a 301. Only a gone listing
 * with no relevant page on this site answers 410. The photos, price and description are gone (IDX
 * rules: a withdrawn listing comes down). On that 410 page a signed-in visitor also sees the sold
 * price where TRREB recorded a sale. Sold data never reaches a visitor who is not signed in, a
 * crawler or the shared cache. Each sold lookup goes in the audit trail and counts against the
 * account's daily limit, the same as a sold search. A key this site never published is a 404.
 *
 * A listing the seller keeps off the internet (InternetEntireListingDisplayYN false) has no page.
 * A pasted key opens homes only: a parking space, a locker or a vacant lot is a 404.
 */
import site from '../../src/data/site.json';
import { AREAS, CITIES, HOME_CITY, PROPTX_BASE, areaOf, cleanKey, closedQuery, coverQuery, homeKinds, listingQuery, mediaQuery, photos, searchQuery } from '../../src/lib/proptx';
import { goneTarget, listingPage, medianFor, type Area, type Gone, type Listing, type Medians, type Sold } from '../../src/lib/listing-page';
import { COOKIE, SEARCHES_PER_DAY, audit, countSince, currentUser, ensureSchema, ipTag, keys, type D1, type User } from '../../src/lib/vow';
import { DETAIL, proptx, publicCard } from '../api/listings';

interface Env {
  PROPTX_IDX_TOKEN?: string;
  PROPTX_VOW_TOKEN?: string;
  VOW_SECRET?: string;
  VOW_DB?: D1;
  ASSETS: { fetch(input: URL | Request): Promise<Response> };
}
interface Context {
  request: Request;
  env: Env;
  params: { key: string };
  waitUntil(p: Promise<unknown>): void;
}

const SHELL = '/homes-for-sale/listing-shell/';
const TTL = 600;
const INDEX = (site as { indexListings?: boolean }).indexListings === true;

/**
 * public/_headers gives the shell these when Cloudflare serves it. They are set here as well, only
 * where missing, so a listing page can never go out without them. Photos come from PropTx's image
 * host and the enquiry form loads the Turnstile check. Same policy as public/_headers, minus the
 * video hosts, which a listing page does not use.
 */
const SECURITY: Record<string, string> = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'content-security-policy':
    "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; object-src 'none'; img-src 'self' data: https:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.googletagmanager.com https://static.cloudflareinsights.com https://admin.kirbify.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com https://www.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://cloudflareinsights.com https://admin.kirbify.com; upgrade-insecure-requests",
};

const LISTING_SCHEMA =
  'CREATE TABLE IF NOT EXISTS listing_pages (key TEXT PRIMARY KEY, address TEXT, community TEXT, city TEXT, lease INTEGER NOT NULL DEFAULT 0, first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL)';
/**
 * Creates the table, or brings the one already in production up to date. SQLite has no
 * ADD COLUMN IF NOT EXISTS, so a column is added only when the table lacks it, and a second
 * run (or a second Worker racing the first) finds nothing to do.
 */
export async function ensureListingTable(db: D1): Promise<void> {
  await db.prepare(LISTING_SCHEMA).bind().run();
  const have = new Set(((await db.prepare("SELECT name FROM pragma_table_info('listing_pages')").bind().all<{ name: string }>()).results ?? []).map((c) => c.name));
  for (const [name, def] of [['city', 'TEXT'], ['lease', 'INTEGER NOT NULL DEFAULT 0']]) {
    if (have.has(name)) continue;
    try {
      await db.prepare(`ALTER TABLE listing_pages ADD COLUMN ${name} ${def}`).bind().run();
    } catch (e) {
      if (!/duplicate column/i.test(String(e))) throw e;
    }
  }
}
/** Remembers a listing while it is active, so its page can stay up after it leaves the feed. */
export const remember = (db: D1, key: string, address: string | null, community: string | null, city: string | null, lease: boolean, now = Date.now()) =>
  db
    .prepare('INSERT INTO listing_pages (key, address, community, city, lease, first_seen, last_seen) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6) ON CONFLICT(key) DO UPDATE SET address = ?2, community = ?3, city = ?4, lease = ?5, last_seen = ?6')
    .bind(key, address, community, city, lease ? 1 : 0, now);
/** A seller who takes a listing off the internet takes its page with it. */
/**
 * A page of the feed remembered in one statement. D1 allows 100 bound values a statement and a
 * Worker a limited number of statements a request, so the rows travel as one JSON value.
 */
export const rememberMany = (db: D1, rows: [key: string, address: string | null, community: string | null, city: string | null][], now = Date.now()) =>
  db
    .prepare(
      "INSERT INTO listing_pages (key, address, community, city, lease, first_seen, last_seen) SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]'), json_extract(value, '$[3]'), 0, ?2, ?2 FROM json_each(?1) WHERE true " +
        'ON CONFLICT(key) DO UPDATE SET address = excluded.address, community = excluded.community, city = excluded.city, lease = 0, last_seen = excluded.last_seen',
    )
    .bind(JSON.stringify(rows), now);
export const forget = (db: D1, keys: string[]) => db.prepare('DELETE FROM listing_pages WHERE key IN (SELECT value FROM json_each(?1))').bind(JSON.stringify(keys));

async function notFound(env: Env, request: Request): Promise<Response> {
  const page = await env.ASSETS.fetch(new URL('/404.html', request.url));
  return new Response(page.body, { status: 404, headers: page.headers });
}

export async function onRequestGet(ctx: Context): Promise<Response> {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const key = cleanKey(ctx.params.key);
  if (!key || !env.PROPTX_IDX_TOKEN) return notFound(env, request);
  if (url.pathname !== `/listing/${key}/`) return Response.redirect(`${url.origin}/listing/${key}/`, 301);

  // A signed-in visitor may see sold data, so their page is never read from or written to the shared cache.
  let user: User | null = null;
  const k = env.VOW_DB && (request.headers.get('cookie') ?? '').includes(`${COOKIE}=`) ? keys(env.VOW_SECRET) : null;
  if (k) {
    try {
      await ensureSchema(env.VOW_DB!);
      user = await currentUser(env.VOW_DB!, await k, request);
    } catch {
      user = null;
    }
  }
  const signedIn = Boolean(user);
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(`${url.origin}/listing/${key}/?v=1`);
  if (!signedIn) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  let listing: Listing | null = null;
  let gone: Gone | undefined;
  let sold: Sold | undefined;
  let similar: Listing[] = [];
  try {
    const [found, media] = await Promise.all([
      proptx(env.PROPTX_IDX_TOKEN, `Property?${listingQuery(key)}`),
      proptx(env.PROPTX_IDX_TOKEN, `Media?${mediaQuery(key)}`),
    ]);
    const r = found.value[0];
    if (r && r.InternetEntireListingDisplayYN === false) {
      // The seller has asked for no internet display: no page and nothing kept from an earlier visit.
      if (env.VOW_DB) {
        const db = env.VOW_DB;
        ctx.waitUntil(ensureListingTable(db).then(() => forget(db, [key]).run()).catch(() => undefined));
      }
      return notFound(env, request);
    }
    if (r) {
      const all = photos(media.value as Parameters<typeof photos>[0]);
      const facts = Object.fromEntries(DETAIL.map((f) => [f, r[f]]).filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)));
      listing = { ...(publicCard(r, all[0]) as unknown as Listing), remarks: (r.PublicRemarks as string) ?? null, crossStreet: (r.CrossStreet as string) ?? null, tour: (r.VirtualTourURLUnbranded as string) ?? null, photos: all, facts };
      if (env.VOW_DB) {
        const db = env.VOW_DB;
        // publicCard has already dropped an address the seller keeps off the internet, so none is stored.
        const l = listing;
        ctx.waitUntil(ensureListingTable(db).then(() => remember(db, key, l.address, l.community, l.city, l.lease === true).run()).catch(() => undefined));
      }
    }
  } catch (err) {
    console.error(err);
    // The feed did not answer. Saying "no longer available" would be a false statement, so say nothing yet.
    return new Response('The listing feed is not answering. Please try again in a minute.', { status: 503, headers: { 'retry-after': '60', 'cache-control': 'no-store', 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex' } });
  }

  if (!listing) {
    if (!env.VOW_DB) return notFound(env, request);
    try {
      await ensureListingTable(env.VOW_DB);
      const row = await env.VOW_DB.prepare('SELECT key, address, community, city, lease FROM listing_pages WHERE key = ?1').bind(key).first<{ key: string; address: string | null; community: string | null; city: string | null; lease: number }>();
      gone = row ? { ...row, lease: row.lease === 1 } : undefined;
    } catch {
      gone = undefined;
    }
    // A key this site never showed is not a page.
    if (!gone) return notFound(env, request);
  }

  // The neighbourhood this listing sits in and what else is listed there.
  const community = listing?.community ?? gone?.community ?? null;
  const slug = areaOf(community);
  // A listing that left the feed with no city on file is treated as Toronto, as before the city was stored.
  const cityName = listing?.city ?? gone?.city ?? null;
  const toronto = !cityName || /^Toronto\b/i.test(cityName);
  const lease = listing?.lease ?? gone?.lease ?? false;
  let area: Area | undefined;
  let medians: Medians | undefined;
  try {
    const data = (await (await env.ASSETS.fetch(new URL('/listing-areas.json', request.url))).json()) as { areas: Record<string, Omit<Area, 'slug'>>; medians: Medians };
    if (slug && toronto && data.areas[slug]) area = { slug, ...data.areas[slug] };
    medians = data.medians;
  } catch {
    area = undefined;
  }

  if (!listing && gone) {
    const target = goneTarget(gone, area?.path);
    if (target) {
      // Not cached. A 301 that we stored would hide the same key when it is listed again.
      // Clients may cache it anyway. That trade-off is noted for whoever reads the code.
      return new Response(null, { status: 301, headers: { location: new URL(target, url.origin).href, 'cache-control': 'no-store' } });
    }
    if (user && k && env.PROPTX_VOW_TOKEN && !gone.lease) {
      try {
        const db = env.VOW_DB;
        // VOW rules: every look at sold data is logged and an account has a daily limit, so sold prices cannot be scraped page by page.
        if ((await countSince(db, 'user_id', user.id, ['search'], 864e5)) < SEARCHES_PER_DAY) {
          await audit(db, user.id, 'search', `listing=${key}`, await ipTag(await k, request));
          const res = await fetch(`${PROPTX_BASE}/Property?${closedQuery(key)}`, { headers: { authorization: `Bearer ${env.PROPTX_VOW_TOKEN.trim()}`, accept: 'application/json' } });
          const row = res.ok ? ((await res.json()) as { value: Record<string, unknown>[] }).value[0] : undefined;
          // A listing the seller kept off the internet stays off, sold or not.
          if (row && row.MlsStatus === 'Sold' && row.InternetEntireListingDisplayYN !== false) sold = { price: typeof row.ClosePrice === 'number' ? row.ClosePrice : null, date: typeof row.CloseDate === 'string' ? row.CloseDate.slice(0, 10) : null };
        }
      } catch {
        sold = undefined;
      }
    }
  }
  // Similar homes come from the same neighbourhood where we cover it. Otherwise from the same city.
  const otherCity = toronto ? undefined : CITIES.find((c) => c === cityName);
  const similarIn = slug && toronto && AREAS[slug] ? AREAS[slug].label : (otherCity ?? HOME_CITY);
  if (toronto || otherCity) {
    try {
      const params = new URLSearchParams(slug && toronto && AREAS[slug] ? { area: slug } : otherCity ? { city: otherCity } : {});
      const home = homeKinds({ PropertySubType: listing?.type ?? '' })[0];
      if (home) params.set('home', home);
      if (lease) params.set('for', 'lease');
      if (listing?.beds) params.set('bedrooms', String(Math.min(listing.beds, 5)));
      const data = await proptx(env.PROPTX_IDX_TOKEN, `Property?${searchQuery(params)}`);
      const rows = data.value.filter((r) => r.InternetEntireListingDisplayYN !== false && r.ListingKey !== key).slice(0, 6);
      const covers = new Map<string, string>();
      if (rows.length) {
        const media = await proptx(env.PROPTX_IDX_TOKEN, `Media?${coverQuery(rows.map((r) => String(r.ListingKey)))}`);
        for (const m of media.value) if (m.MediaURL && !covers.has(String(m.ResourceRecordKey))) covers.set(String(m.ResourceRecordKey), String(m.MediaURL));
      }
      similar = rows.map((r) => publicCard(r, covers.get(String(r.ListingKey))) as unknown as Listing);
    } catch {
      similar = [];
    }
  }

  const page = listingPage({ origin: site.url, phone: { label: site.contact.phone, href: site.contact.phoneHref }, listing, gone, area, median: listing ? medianFor(listing, medians) : undefined, similar, similarIn, sold, signedIn });

  const shell = await env.ASSETS.fetch(new URL(SHELL, request.url));
  if (!shell.ok) return notFound(env, request);
  // Search engines are offered what the listings sitemap lists: Toronto homes for sale. A lease, a
  // home in another city still has its page for visitors, without being indexed.
  // Reaching here without a live listing means 410: there was no neighbourhood or search page to send them to.
  const index = INDEX && !!listing && toronto && !listing.lease;
  const attr = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  let html = (await shell.text())
    .split(`${site.url}${SHELL}`).join(`${site.url}/listing/${key}/`)
    // The enquiry form records the page it was sent from: that must be this listing, not the shell.
    .split(`"${SHELL}"`).join(`"/listing/${key}/"`)
    .split('%%LISTING_TITLE%%').join(attr(page.title))
    .split('%%LISTING_DESCRIPTION%%').join(attr(page.description))
    .split('%%LISTING_H1%%').join(attr(page.h1))
    .split('%%LISTING_CRUMB%%').join(attr(page.crumb))
    .split('%%LISTING_BODY%%').join(page.body);
  if (index) html = html.replace(/<meta name="robots" content="noindex"\s*\/?>/, '');

  const headers = new Headers(shell.headers);
  headers.delete('etag');
  headers.delete('x-robots-tag');
  if (!index) headers.set('x-robots-tag', 'noindex');
  for (const [name, value] of Object.entries(SECURITY)) if (!headers.has(name)) headers.set(name, value);
  headers.set('content-type', 'text/html; charset=utf-8');
  // Sold data is for the signed-in visitor alone.
  headers.set('cache-control', signedIn ? 'private, no-store' : `public, max-age=${TTL}`);
  // 410 only after the feed confirmed the key is gone and no relevant page exists. A feed outage already returned 503 above.
  const res = new Response(html, { status: listing ? 200 : 410, headers });
  if (!signedIn) ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

/** Link checkers and previews ask with HEAD. Without this they would get a 404 for a page that exists. */
export async function onRequestHead(ctx: Context): Promise<Response> {
  const res = await onRequestGet(ctx);
  return new Response(null, { status: res.status, headers: res.headers });
}
