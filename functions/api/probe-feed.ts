// TEMPORARY diagnostic. Returns status codes and token shape only, never the token or listing data. Delete after use.
import { PROPTX_BASE } from '../../src/lib/proptx';
const shape = (t?: string) => t === undefined ? null : ({
  length: t.length, trimmedLength: t.trim().length, hasWhitespace: /\s/.test(t), startsWithBearer: /^bearer\s/i.test(t.trim()),
  dotParts: t.trim().split('.').length, quoted: /^["']|["']$/.test(t.trim()),
});
export async function onRequestGet({ request, env }: { request: Request; env: { PROPTX_IDX_TOKEN?: string; PROPTX_VOW_TOKEN?: string } }) {
  if (new URL(request.url).searchParams.get('k') !== 'e38056d0e257bd811c1d0d3c') return new Response('no', { status: 404 });
  const tries: Record<string, unknown> = {};
  for (const [name, raw] of Object.entries({ idx: env.PROPTX_IDX_TOKEN, vow: env.PROPTX_VOW_TOKEN })) {
    if (!raw) continue;
    const tok = raw.trim().replace(/^bearer\s+/i, '').replace(/^["']|["']$/g, '');
    for (const path of ['Property?$top=1&$select=ListingKey', "Property?$top=1&$select=City&$filter=" + encodeURIComponent("City eq 'Toronto'")]) {
      const r = await fetch(`${PROPTX_BASE}/${path}`, { headers: { authorization: `Bearer ${tok}`, accept: 'application/json' } });
      const txt = await r.text();
      tries[name + ' ' + path.slice(0, 40)] = { status: r.status, bodyStart: r.ok ? txt.slice(0, 60).replace(/"ListingKey":"[^"]*"/, '"ListingKey":"x"') : txt.slice(0, 160) };
    }
  }
  return Response.json({ idx: shape(env.PROPTX_IDX_TOKEN), vow: shape(env.PROPTX_VOW_TOKEN), tries });
}
