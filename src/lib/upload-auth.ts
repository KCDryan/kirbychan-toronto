/**
 * The upload session: the shared password signs in at /upload/ and sets one cookie, and every upload
 * API (blog posts, service pages) checks it here.
 */
import { sha256 } from './vow';
import type { D1 } from './vow';

export const COOKIE = '__Host-kc_upload';

export async function signedIn(env: { VOW_DB?: D1 }, request: Request): Promise<boolean> {
  const token = request.headers.get('cookie')?.match(/(?:^|;\s*)__Host-kc_upload=([0-9a-f]{64})/)?.[1];
  if (!token) return false;
  const row = await env.VOW_DB!.prepare('SELECT expires FROM upload_sessions WHERE hash = ?').bind(await sha256(token)).first<{ expires: number }>();
  return !!row && row.expires > Date.now();
}
