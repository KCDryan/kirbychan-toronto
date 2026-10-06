/**
 * GET /listing/<ListingKey>/   one page per MLS® listing, rendered from the live feed.
 *
 * A new listing has a page the moment it is in the PropTx feed: nothing is built ahead. The page is
 * poured into the built shell (/homes-for-sale/listing-shell/) so it carries the site's header,
 * footer, styles and security headers.
 *
 * When a listing leaves the feed its page stays up at the same address and says it is no longer
 * available. The photos, price and description are gone (IDX rules: a withdrawn listing comes down).
 * A signed-in visitor also sees the sold price where TRREB recorded a sale. Sold data never reaches
 * a visitor who is not signed in, a crawler or the shared cache. Each sold lookup goes in the audit
 * trail and counts against the account's daily limit, the same as a sold search.
 *
 * A listing the seller keeps off the internet (InternetEntireListingDisplayYN false) has no page.
 */
import site from '../../src/data/site.json';
import { AREAS, CITIES, HOME_CITY, NOT_HOMES, PROPTX_BASE, areaOf, cleanKey, closedQuery, coverQuery, homeKinds, listingQuery, mediaQuery, photos, searchQuery } from '../../src/lib/proptx';
import { listingPage, medianFor, type Area, type Listing, type Medians, type Sold } from '../../src/lib/listing-page';
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

export const LISTING_SCHEMA =
  'CREATE TABLE IF NOT EXISTS listing_pages (key TEXT PRIMARY KEY, address TEXT, community TEXT, first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL)';
/** Remembers a listing while it is active, so its page can stay up after it leaves the feed. */
export const remember = (db: D1, key: string, address: string | null, community: string | null, now = Date.now()) =>
  db
    .prepare('INSERT INTO listing_pages (key, address, community, first_seen, last_seen) VALUES (?1, ?2, ?3, ?4, ?4) ON CONFLICT(key) DO UPDATE SET address = ?2, community = ?3, last_seen = ?4')
    .bind(key, address, community, now);
/** A seller who takes a listing off the internet takes its page with it. */
/**
 * A page of the feed remembered in one statement. D1 allows 100 bound values a statement and a
 * Worker a limited number of statements a request, so the rows travel as one JSON value.
 */
export const rememberMany = (db: D1, rows: [key: string, address: string | null, community: string | null][], now = Date.now()) =>
  db
    .prepare(
      "INSERT INTO listing_pages (key, address, community, first_seen, last_seen) SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]'), ?2, ?2 FROM json_each(?1) WHERE true " +
        'ON CONFLICT(key) DO UPDATE SET address = excluded.address, community = excluded.community, last_seen = excluded.last_seen',
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
  let gone: { key: string; address: string | null; community: string | null } | undefined;
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
      if (env.VOW_DB) ctx.waitUntil(forget(env.VOW_DB, [key]).run().catch(() => undefined));
      return notFound(env, request);
    }
    if (r) {
      const all = photos(media.value as Parameters<typeof photos>[0]);
      const facts = Object.fromEntries(DETAIL.map((f) => [f, r[f]]).filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)));
      listing = { ...(publicCard(r, all[0]) as unknown as Listing), remarks: (r.PublicRemarks as string) ?? null, crossStreet: (r.CrossStreet as string) ?? null, tour: (r.VirtualTourURLUnbranded as string) ?? null, photos: all, facts };
      if (env.VOW_DB) {
        const db = env.VOW_DB;
        // publicCard has already dropped an address the seller keeps off the internet, so none is stored.
        ctx.waitUntil(db.prepare(LISTING_SCHEMA).bind().run().then(() => remember(db, key, listing!.address, listing!.community).run()).catch(() => undefined));
      }
    }
  } catch (err) {
    console.error(err);
    // The feed did not answer. Saying "no longer available" would be a false statement, so say nothing yet.
    return new Response('The listing feed is not answering. Please try again in a minute.', { status: 503, headers: { 'retry-after': '60', 'cache-control': 'no-store' } });
  }

  if (!listing) {
    if (!env.VOW_DB) return notFound(env, request);
    try {
      await env.VOW_DB.prepare(LISTING_SCHEMA).bind().run();
      gone = (await env.VOW_DB.prepare('SELECT key, address, community FROM listing_pages WHERE key = ?1').bind(key).first<NonNullable<typeof gone>>()) ?? undefined;
    } catch {
      gone = undefined;
    }
    // A key this site never showed is not a page.
    if (!gone) return notFound(env, request);
    if (user && k && env.PROPTX_VOW_TOKEN) {
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

  // The neighbourhood this listing sits in and what else is listed there.
  const community = listing?.community ?? gone?.community ?? null;
  const slug = areaOf(community);
  const toronto = !listing || /^Toronto\b/i.test(listing.city ?? '');
  let area: Area | undefined;
  let medians: Medians | undefined;
  try {
    const data = (await (await env.ASSETS.fetch(new URL('/listing-areas.json', request.url))).json()) as { areas: Record<string, Omit<Area, 'slug'>>; medians: Medians };
    if (slug && toronto && data.areas[slug]) area = { slug, ...data.areas[slug] };
    medians = data.medians;
  } catch {
    area = undefined;
  }
  // Similar homes come from the same neighbourhood where we cover it. Otherwise from the same city.
  const otherCity = toronto ? undefined : CITIES.find((c) => c === listing?.city);
  const similarIn = slug && toronto && AREAS[slug] ? AREAS[slug].label : (otherCity ?? HOME_CITY);
  if (toronto || otherCity) {
    try {
      const params = new URLSearchParams(slug && toronto && AREAS[slug] ? { area: slug } : otherCity ? { city: otherCity } : {});
      const home = homeKinds({ PropertySubType: listing?.type ?? '' })[0];
      if (home) params.set('home', home);
      if (listing?.lease) params.set('for', 'lease');
      if (listing?.beds) params.set('beds', String(Math.min(listing.beds, 5)));
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
  // home in another city or a parking space still has its page for visitors, without being indexed.
  // A listing that has left the market keeps its address for visitors but is not offered to search
  // engines: the page has little on it, and a withdrawn listing should fade from results.
  const index = INDEX && !!listing && toronto && !listing.lease && !NOT_HOMES.includes(listing.type ?? '');
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
  headers.set('content-type', 'text/html; charset=utf-8');
  // Sold data is for the signed-in visitor alone.
  headers.set('cache-control', signedIn ? 'private, no-store' : `public, max-age=${TTL}`);
  const res = new Response(html, { status: 200, headers });
  if (!signedIn) ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

/** Link checkers and previews ask with HEAD. Without this they would get a 404 for a page that exists. */
export async function onRequestHead(ctx: Context): Promise<Response> {
  const res = await onRequestGet(ctx);
  return new Response(null, { status: res.status, headers: res.headers });
}
