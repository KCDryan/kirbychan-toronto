/**
 * TEMPORARY. GET /api/map-probe geocodes 5 Toronto listings and shows the result, so the address
 * format is checked before any full lookup. It saves no positions. It calls Geocodio once only: the
 * answer is kept and shown again on later visits, so it can never spend more than 5 lookups.
 * Remove after the check.
 */
import { PROPTX_BASE, mapQuery } from '../../src/lib/proptx';
import type { D1 } from '../../src/lib/vow';
import { geocode, geocodeAddress } from './map';

interface Context {
  env: { PROPTX_IDX_TOKEN?: string; GEOCODIO_API_KEY?: string; VOW_DB?: D1 };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 1), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export async function onRequestGet({ env }: Context): Promise<Response> {
  if (!env.PROPTX_IDX_TOKEN || !env.GEOCODIO_API_KEY || !env.VOW_DB) return json({ error: 'GEOCODIO_API_KEY, PROPTX_IDX_TOKEN or VOW_DB missing' }, 503);
  const db = env.VOW_DB;
  await db.prepare('CREATE TABLE IF NOT EXISTS map_probe (id INTEGER PRIMARY KEY, result TEXT NOT NULL)').bind().run();
  const done = await db.prepare('SELECT result FROM map_probe WHERE id = 1').bind().first<{ result: string }>();
  if (done) return json({ cached: true, ...JSON.parse(done.result) });
  // Claim the single run before calling Geocodio, so two visits at once cannot both spend lookups.
  const claim = (await db.prepare("INSERT OR IGNORE INTO map_probe (id, result) VALUES (1, '{\"running\":true}')").bind().run()) as { meta?: { changes?: number } };
  if (claim.meta?.changes === 0) return json({ running: true });

  const res = await fetch(`${PROPTX_BASE}/Property?${mapQuery(new URLSearchParams(), 0)}`, { headers: { authorization: `Bearer ${env.PROPTX_IDX_TOKEN.trim()}` } });
  const rows = ((await res.json()) as { value: Record<string, unknown>[] }).value ?? [];
  // Five shown addresses spread across the results, not five on one street.
  const shown = rows.filter((r) => r.InternetEntireListingDisplayYN !== false && r.InternetAddressDisplayYN !== false && geocodeAddress(r));
  const five = [0, 1, 2, 3, 4].map((i) => shown[Math.floor((i * shown.length) / 5)]).filter(Boolean);
  let result;
  try {
    result = { checked: await geocode(env.GEOCODIO_API_KEY.trim(), five.map((r) => ({ key: String(r.ListingKey), address: geocodeAddress(r)! }))) };
  } catch (e) {
    await db.prepare('DELETE FROM map_probe WHERE id = 1').bind().run();
    return json({ error: String(e) }, 502);
  }
  await db.prepare('UPDATE map_probe SET result = ? WHERE id = 1').bind(JSON.stringify(result)).run();
  return json(result);
}
