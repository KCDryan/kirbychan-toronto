// TEMPORARY diagnostic. Returns tallies and status codes only (no listing data). Delete after use.
import { PROPTX_BASE, AREAS } from '../../src/lib/proptx';
export async function onRequestGet({ request, env }: { request: Request; env: { PROPTX_IDX_TOKEN?: string } }) {
  if (new URL(request.url).searchParams.get('k') !== 'e38056d0e257bd811c1d0d3c' || !env.PROPTX_IDX_TOKEN) return new Response('no', { status: 404 });
  const tok = env.PROPTX_IDX_TOKEN.trim();
  const get = (path: string) => fetch(`${PROPTX_BASE}/${path}`, { headers: { authorization: `Bearer ${tok}` } });
  const base = "ContractStatus eq 'Available' and startswith(PropertyType,'Residential') and TransactionType eq 'For Sale'";
  const variants: Record<string, string> = { startswithCity: `${base} and startswith(City,'Toronto')`, eqToronto: `${base} and City eq 'Toronto'` };
  const tests: Record<string, unknown> = {};
  for (const [name, f] of Object.entries(variants)) {
    const r = await get(`Property?$top=5&$count=true&$select=City,CityRegion&$filter=${encodeURIComponent(f)}`);
    const b = r.ok ? ((await r.json()) as { value: { City: string }[]; '@odata.count'?: number }) : null;
    tests[name] = b ? { status: r.status, count: b['@odata.count'] ?? null, cities: b.value.map((v) => v.City) } : { status: r.status, body: (await r.text()).slice(0, 150) };
  }
  const pick = (tests.startswithCity as { status: number }).status === 200 ? variants.startswithCity : variants.eqToronto;
  const city: Record<string, number> = {}, region: Record<string, number> = {}, sub: Record<string, number> = {};
  let next: string | null = `Property?$top=1000&$select=City,CityRegion,PropertySubType&$filter=${encodeURIComponent(pick)}`;
  let pages = 0, rows = 0, err: unknown = null;
  while (next && pages < 40) {
    const res = await get(next);
    if (!res.ok) { err = res.status; break; }
    const d = (await res.json()) as { value: Record<string, unknown>[]; '@odata.nextLink'?: string };
    for (const r of d.value) { rows++; city[String(r.City)] = (city[String(r.City)] ?? 0) + 1; region[String(r.CityRegion)] = (region[String(r.CityRegion)] ?? 0) + 1; sub[String(r.PropertySubType)] = (sub[String(r.PropertySubType)] ?? 0) + 1; }
    next = d['@odata.nextLink']?.replace(`${PROPTX_BASE}/`, '') ?? null; pages++;
  }
  const areas = Object.fromEntries(Object.entries(AREAS).map(([k, a]) => [k, Object.fromEntries(a.communities.map((c) => [c, region[c] ?? 0]))]));
  return Response.json({ tests, pick, err, rows, pages, complete: !next, city, sub, areas, regions: Object.keys(region).length, regionAll: Object.entries(region).sort((a, b) => b[1] - a[1]) });
}
