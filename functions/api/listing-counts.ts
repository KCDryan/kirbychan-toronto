/**
 * GET /api/listing-counts
 *
 * How many Toronto homes are for sale right now, by neighbourhood and home type. Read once a day
 * by .github/workflows/refresh-listing-counts.yml, which saves it to src/data/listing-counts.json
 * so the counts are in the static pages. Counts only: no prices or other listing data.
 */
import { HOME_CITY, PROPTX_BASE, areaOf, cityFilter, homeKinds } from '../../src/lib/proptx';

interface Context {
  request: Request;
  env: { PROPTX_IDX_TOKEN?: string };
  waitUntil(p: Promise<unknown>): void;
}

const FILTER = `ContractStatus eq 'Available' and startswith(PropertyType,'Residential') and TransactionType eq 'For Sale' and ${cityFilter(HOME_CITY)}`;

export async function onRequestGet({ request, env, waitUntil }: Context): Promise<Response> {
  if (!env.PROPTX_IDX_TOKEN) return new Response('{"error":"not-configured"}', { status: 503 });
  // Up to forty PropTx calls per answer, so one answer is shared for an hour whoever asks.
  const cacheKey = new Request(new URL('/api/listing-counts', request.url));
  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;
  type Counts = { total: number; bungalow: number; condo: number; townhouse: number; house: number };
  const blank = (): Counts => ({ total: 0, bungalow: 0, condo: 0, townhouse: 0, house: 0 });
  const toronto = blank();
  const areas: Record<string, Counts> = {};

  // Pages are requested by offset, ordered by ListingKey so they do not overlap. PropTx's own
  // @odata.nextLink stopped resolving ("Resource not found"), so it is not used.
  const PAGE = 1000;
  const query = `$top=${PAGE}&$orderby=ListingKey&$select=CityRegion,PropertySubType,ArchitecturalStyle&$filter=${encodeURIComponent(FILTER)}`;
  let done = false;
  // ponytail: 40 pages of 1,000 covers Toronto's residential listings with room to spare and stays under
  // Cloudflare's 50 subrequest limit. If the city ever lists more, split the count by district.
  for (let i = 0; !done && i < 40; i++) {
    const res: Response = await fetch(`${PROPTX_BASE}/Property?${query}&$skip=${i * PAGE}`, { headers: { authorization: `Bearer ${env.PROPTX_IDX_TOKEN.trim()}` } });
    if (!res.ok) return new Response(JSON.stringify({ error: 'upstream', status: res.status, page: i + 1, detail: (await res.text()).slice(0, 200) }), { status: 503 });
    const data = (await res.json()) as { value: Record<string, unknown>[] };
    for (const r of data.value) {
      const kinds = homeKinds(r) as (keyof Counts)[];
      const area = areaOf(r.CityRegion);
      const buckets = area ? [toronto, (areas[area] ??= blank())] : [toronto];
      for (const b of buckets) {
        b.total++;
        for (const k of kinds) b[k]++;
      }
    }
    done = data.value.length < PAGE;
  }

  const res = new Response(JSON.stringify({ updated: new Date().toISOString(), toronto, areas, complete: done }, null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=3600', 'x-robots-tag': 'noindex' },
  });
  waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
