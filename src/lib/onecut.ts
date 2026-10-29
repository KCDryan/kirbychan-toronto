/**
 * The OneCut Content account connected to this website: what plan it is on, and the website key kept
 * encrypted in the database. Shared by the blog upload API and the service page API.
 */
import { sha256 } from './vow';

export type Verdict = 'pro' | 'not-pro' | 'bad-key' | 'unknown';

/** What onecutcontent.com says about this key's account. 'unknown' when it cannot be reached. */
export async function oneCutVerdict(key: string, fetcher: typeof fetch = fetch): Promise<Verdict> {
  try {
    const res = await fetcher('https://onecutcontent.com/api/v1/account', { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
    if (res.ok) return ((await res.json()) as { pro?: boolean }).pro === true ? 'pro' : 'not-pro';
    return res.status === 401 ? 'bad-key' : res.status === 402 ? 'not-pro' : 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Whether the site's OneCut account is on Pro or above. The answer is kept for ten minutes.
 * ponytail: if onecutcontent.com cannot be reached (not a yes or a no), uploads stay open, since the
 * password still guards them. Close on outage instead if plans are ever dodged this way.
 */
export async function oneCutPro(key: string | undefined, fetcher: typeof fetch = fetch): Promise<boolean> {
  key = key?.trim();
  if (!key) return false;
  const cache = typeof caches === 'undefined' ? undefined : (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(`https://onecut.invalid/pro/${await sha256(key)}`);
  const hit = await cache?.match(cacheKey);
  if (hit) return (await hit.text()) === '1';
  const verdict = await oneCutVerdict(key, fetcher);
  if (verdict === 'unknown') return true;
  await cache?.put(cacheKey, new Response(verdict === 'pro' ? '1' : '0', { headers: { 'cache-control': 'max-age=600' } }));
  return verdict === 'pro';
}

// The website key at rest: AES-256-GCM under a key made from the upload password, stored as "iv.ciphertext".
// Changing the password makes it unreadable, and the agent pastes the key again.
const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b as ArrayBuffer)));
const unb64 = (t: string) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
const aesKey = async (password: string) =>
  crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`onecut-key|${password}`)), 'AES-GCM', false, ['encrypt', 'decrypt']);
export async function sealKey(password: string, key: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return `${b64(iv)}.${b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(password), new TextEncoder().encode(key)))}`;
}
export async function unsealKey(password: string, sealed: string): Promise<string> {
  try {
    const [iv, ct] = sealed.split('.');
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await aesKey(password), unb64(ct)));
  } catch {
    return '';
  }
}
