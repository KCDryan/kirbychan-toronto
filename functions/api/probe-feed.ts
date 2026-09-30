// TEMPORARY diagnostic. Returns tallies only (no listing data). Delete after use.
import { PROPTX_BASE, AREAS } from '../../src/lib/proptx';
export async function onRequestGet({ request, env }: { request: Request; env: { PROPTX_IDX_TOKEN?: string } }) {
  if (new URL(request.url).searchParams.get('k') !== 'e38056d0e257bd811c1d0d3c' || !env.PROPTX_IDX_TOKEN) return new Response('no', { status: 404 });
  const filter = "ContractStatus eq 'Available' and startswith(PropertyType,'Residential') and TransactionType eq 'For Sale' and startswith(City,'Toronto')";
  const city: Record<string, number> = {}, region: Record<string, number> = {}, sub: Record<string, number> = {};
  let next: string | null = `Property?$top=1000&$count=true&$select=City,CityRegion,PropertySubType&$filter=${encodeURIComponent(filter)}`;
  let count: unknown = null, pages = 0, rows = 0;
  while (next && pages < 40) {
    const res = await fetch(`${PROPTX_BASE}/${next}`, { headers: { authorization: `Bearer ${env.PROPTX_IDX_TOKEN}` } });
    if (!res.ok) return Response.json({ error: res.status, body: (await res.text()).slice(0, 200) }, { status: 503 });
    const d = (await res.json()) as { value: Record<string, unknown>[]; '@odata.count'?: number; '@odata.nextLink'?: string };
    if (count === null) count = d['@odata.count'] ?? null;
    for (const r of d.value) { rows++; city[String(r.City)] = (city[String(r.City)] ?? 0) + 1; region[String(r.CityRegion)] = (region[String(r.CityRegion)] ?? 0) + 1; sub[String(r.PropertySubType)] = (sub[String(r.PropertySubType)] ?? 0) + 1; }
    next = d['@odata.nextLink']?.replace(`${PROPTX_BASE}/`, '') ?? null; pages++;
  }
  const areas = Object.fromEntries(Object.entries(AREAS).map(([k, a]) => [k, Object.fromEntries(a.communities.map((c) => [c, region[c] ?? 0]))]));
  return Response.json({ count, rows, pages, complete: !next, city, sub, areas, regions: Object.keys(region).length, regionSample: Object.entries(region).sort((a, b) => b[1] - a[1]).slice(0, 200) });
}
