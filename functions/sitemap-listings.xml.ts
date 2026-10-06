/**
 * GET /sitemap-listings.xml   every active Toronto home for sale, straight from the feed.
 *
 * It also records each active listing in the database, so a listing nobody opened still keeps its
 * page after it leaves the feed. The daily counts workflow calls it once a day for that reason.
 * Until site.json "indexListings" is true the list is empty: the listings are remembered but not
 * offered to search engines.
 */
import site from '../src/data/site.json';
import { LIST_PAGE, activeQuery } from '../src/lib/proptx';
import type { D1 } from '../src/lib/vow';
import { proptx } from './api/listings';
import { ensureListingTable, forget, rememberMany } from './listing/[key]';

interface Context {
  request: Request;
  env: { PROPTX_IDX_TOKEN?: string; VOW_DB?: D1 };
  waitUntil(p: Promise<unknown>): void;
}

const INDEX = (site as { indexListings?: boolean }).indexListings === true;
/** ponytail: 20 pages is 20,000 listings, about twice Toronto's count in October 2026. Raise it if x-listings ever reads 20000. Split the sitemap before 50,000. */
const MAX_PAGES = 20;
const headers = { 'x-content-type-options': 'nosniff' };
const xml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

export async function onRequestGet({ request, env, waitUntil }: Context): Promise<Response> {
  if (!env.PROPTX_IDX_TOKEN) return new Response('not configured', { status: 503, headers });
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(new URL('/sitemap-listings.xml?v=1', request.url));
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const rows: Record<string, unknown>[] = [];
  try {
    for (let i = 0; i < MAX_PAGES; i++) {
      const data = await proptx(env.PROPTX_IDX_TOKEN, `Property?${activeQuery(i)}`);
      rows.push(...data.value);
      if (data.value.length < LIST_PAGE) break;
    }
  } catch (err) {
    console.error(err);
    return new Response('feed not answering', { status: 503, headers: { ...headers, 'retry-after': '300' } });
  }
  // Seller choices: a listing kept off the internet has no page. A hidden address is not stored.
  // A key is checked like any other input before it is written into the XML.
  const valid = rows.filter((r) => /^[A-Z]{1,3}\d{5,10}$/.test(String(r.ListingKey)));
  const shown = valid.filter((r) => r.InternetEntireListingDisplayYN !== false);
  const hidden = valid.filter((r) => r.InternetEntireListingDisplayYN === false).map((r) => String(r.ListingKey));

  if (env.VOW_DB) {
    const db = env.VOW_DB;
    waitUntil(
      (async () => {
        await ensureListingTable(db);
        for (let i = 0; i < shown.length; i += LIST_PAGE) {
          await rememberMany(db, shown.slice(i, i + LIST_PAGE).map((r) => [String(r.ListingKey), r.InternetAddressDisplayYN === false ? null : ((r.UnparsedAddress as string) ?? null), (r.CityRegion as string) ?? null, (r.City as string) ?? null])).run();
        }
        if (hidden.length) await forget(db, hidden).run();
      })().catch((e) => console.error(e)),
    );
  }

  const urls = INDEX
    ? shown.map((r) => `<url><loc>${site.url}/listing/${xml(String(r.ListingKey))}/</loc>${typeof r.ModificationTimestamp === 'string' ? `<lastmod>${xml(r.ModificationTimestamp)}</lastmod>` : ''}</url>`).join('')
    : '';
  const res = new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { ...headers, 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=21600', 'x-listings': String(shown.length) },
  });
  waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

/** Tools that check a sitemap with HEAD get the same answer without the body. */
export async function onRequestHead(ctx: Context): Promise<Response> {
  const res = await onRequestGet(ctx);
  return new Response(null, { status: res.status, headers: res.headers });
}
