// TEMPORARY check: reports only whether VOW_SECRET is usable. Never returns the value. Delete after use.
import { keys } from '../../src/lib/vow';
export async function onRequestGet({ request, env }: { request: Request; env: { VOW_SECRET?: string; VOW_DB?: unknown } }) {
  if (new URL(request.url).searchParams.get('k') !== 'e38056d0e257bd811c1d0d3c') return new Response('no', { status: 404 });
  const s = env.VOW_SECRET ?? '';
  let bytes = 0;
  try { bytes = atob(s.trim()).length; } catch { bytes = -1; }
  return Response.json({ set: !!s, usable: keys(s) !== null, decodedBytes: bytes, hadWhitespace: /\s/.test(s), db: !!env.VOW_DB });
}
