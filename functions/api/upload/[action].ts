/**
 * /api/upload/me         GET   signed in or not, and whether uploads are set up
 * /api/upload/login      POST  password
 * /api/upload/logout     POST
 * /api/upload/preview    POST  post   the finished page, exactly as it will look
 * /api/upload/publish    POST  post   live at once (or saved only, when post.draft); replace: true to update a post already up
 * /api/upload/get        POST  slug   a saved post, to edit it
 * /api/upload/list       GET   uploaded posts, newest first
 * /api/upload/unpublish  POST  slug   removes the post from the website and from the list (live = -1;
 *                              the row stays so the built copy answers 404 until the next build)
 * /api/upload/export     GET   public: live uploaded posts, read by scripts/pull-uploads.mjs at build
 *
 * One shared password, set by the owner as the UPLOAD_PASSWORD secret in Cloudflare. Ten wrong
 * passwords from one address in an hour, or fifty from anywhere, pause sign in for the hour.
 *
 * Client websites (requireOneCutPro in src/data/site.json) also need a OneCut Content account on Pro
 * or above: the agent's OneCut API key is the ONECUT_API_KEY secret, and onecutcontent.com is asked
 * what plan it is on. No key, a revoked key or a lower plan closes everything except export, so
 * posts already published stay on the site.
 */
import { randomHex, same, sameOrigin, sha256 } from '../../../src/lib/vow';
import site from '../../../src/data/site.json';
import { SHELL, cleanPost, ensureUploadSchema, fillShell, getUpload, rebuild, type Post, type UploadEnv } from '../../../src/lib/uploads';

interface Context {
  request: Request;
  env: UploadEnv;
  params: { action: string };
  waitUntil(p: Promise<unknown>): void;
}

const COOKIE = '__Host-kc_upload';
const SESSION_HOURS = 12;
const HOUR = 36e5;

const json = (body: unknown, status = 200, cookie?: string) => {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  if (cookie) headers.append('set-cookie', cookie);
  return new Response(JSON.stringify(body), { status, headers });
};
const problem = (message: string, status = 400) => json({ error: message }, status);

/**
 * Whether the site's OneCut account is on Pro or above. The answer is kept for ten minutes.
 * ponytail: if onecutcontent.com cannot be reached (not a yes or a no), uploads stay open, since the
 * password still guards them. Close on outage instead if plans are ever dodged this way.
 */
export async function oneCutPro(key: string | undefined, fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!key?.trim()) return false;
  const cache = typeof caches === 'undefined' ? undefined : (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(`https://onecut.invalid/pro/${await sha256(key.trim())}`);
  const hit = await cache?.match(cacheKey);
  if (hit) return (await hit.text()) === '1';
  let pro = true;
  try {
    const res = await fetcher('https://onecutcontent.com/api/v1/account', { headers: { authorization: `Bearer ${key.trim()}` }, signal: AbortSignal.timeout(8000) });
    if (res.ok) pro = ((await res.json()) as { pro?: boolean }).pro === true;
    else if (res.status === 401 || res.status === 402) pro = false;
    else return true;
  } catch {
    return true;
  }
  await cache?.put(cacheKey, new Response(pro ? '1' : '0', { headers: { 'cache-control': 'max-age=600' } }));
  return pro;
}

async function signedIn(env: UploadEnv, request: Request): Promise<boolean> {
  const token = request.headers.get('cookie')?.match(/(?:^|;\s*)__Host-kc_upload=([0-9a-f]{64})/)?.[1];
  if (!token) return false;
  const row = await env.VOW_DB!.prepare('SELECT expires FROM upload_sessions WHERE hash = ?').bind(await sha256(token)).first<{ expires: number }>();
  return !!row && row.expires > Date.now();
}

async function page(env: UploadEnv, request: Request, post: Post): Promise<string | null> {
  const res = await env.ASSETS!.fetch(new URL(`${SHELL}${post.category}/`, request.url));
  return res.ok ? fillShell(await res.text(), post) : null;
}

export async function onRequest({ request, env, params, waitUntil }: Context): Promise<Response> {
  const action = params.action;
  const postUrl = (slug: string) => `${new URL(request.url).origin}/blog/${slug}/`;
  const db = env.VOW_DB;
  const password = env.UPLOAD_PASSWORD?.trim() ?? '';
  // Export stays open so posts already published are still built into the site.
  if ((site as { requireOneCutPro?: boolean }).requireOneCutPro === true && action !== 'export' && !(await oneCutPro(env.ONECUT_API_KEY))) {
    return action === 'me' ? json({ ready: false, signedIn: false, needsPro: true }) : problem('Publishing blog posts needs a OneCut Content Pro account.', 403);
  }
  if (!db || password.length < 12) return action === 'me' ? json({ ready: false, signedIn: false }) : problem('Uploads are not set up yet.', 503);
  await ensureUploadSchema(db);

  if (action === 'export' && request.method === 'GET') {
    const { results } = await db.prepare('SELECT post FROM uploads WHERE live = 1 ORDER BY updated DESC').bind().all<{ post: string }>();
    return json({ posts: results.map((r) => JSON.parse(r.post)) });
  }

  if (request.method === 'POST') {
    if (!sameOrigin(request) || !request.headers.get('content-type')?.startsWith('application/json')) return problem('Refused.', 403);
  } else if (request.method !== 'GET') return problem('Not allowed.', 405);
  const body = request.method === 'POST' ? ((await request.json().catch(() => ({}))) as Record<string, unknown>) : {};

  if (action === 'login' && request.method === 'POST') {
    const now = Date.now();
    const ip = await sha256(`${password}|${request.headers.get('cf-connecting-ip') ?? ''}`);
    const fails = await db.prepare('SELECT COUNT(*) AS n, SUM(ip = ?) AS mine FROM upload_fails WHERE at > ?').bind(ip, now - HOUR).first<{ n: number; mine: number | null }>();
    if ((fails?.mine ?? 0) >= 10 || (fails?.n ?? 0) >= 50) return problem('Too many wrong passwords. Please wait an hour and try again.', 429);
    const given = typeof body.password === 'string' ? body.password.trim() : '';
    if (!same(await sha256(given), await sha256(password))) {
      await db.prepare('INSERT INTO upload_fails (ip, at) VALUES (?, ?)').bind(ip, now).run();
      return problem('That password is not right. Please try again.', 401);
    }
    const token = randomHex();
    await db.prepare('DELETE FROM upload_sessions WHERE expires < ?').bind(now).run();
    await db.prepare('INSERT INTO upload_sessions (hash, expires) VALUES (?, ?)').bind(await sha256(token), now + SESSION_HOURS * HOUR).run();
    return json({ ok: true }, 200, `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`);
  }

  if (action === 'me') return json({ ready: true, signedIn: await signedIn(env, request) });
  if (!(await signedIn(env, request))) return problem('Please sign in again.', 401);

  if (action === 'logout' && request.method === 'POST') {
    const token = request.headers.get('cookie')?.match(/__Host-kc_upload=([0-9a-f]{64})/)?.[1] ?? '';
    await db.prepare('DELETE FROM upload_sessions WHERE hash = ?').bind(await sha256(token)).run();
    return json({ ok: true }, 200, `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
  }

  if (action === 'list' && request.method === 'GET') {
    const { results } = await db.prepare('SELECT live, post FROM uploads WHERE live >= 0 ORDER BY updated DESC LIMIT 200').bind().all<{ live: number; post: string }>();
    return json({
      posts: results.map((r) => {
        const p = JSON.parse(r.post) as Post;
        return { slug: p.slug, headline: p.headline, live: r.live === 1, draft: !!p.draft, updated: p.updated, url: postUrl(p.slug) };
      }),
    });
  }

  if ((action === 'preview' || action === 'publish') && request.method === 'POST') {
    const post = cleanPost(body.post);
    if (typeof post === 'string') return problem(post);
    const existing = await getUpload(db, post.slug);
    const now = Date.now();
    post.published = existing?.post.published ?? now;
    post.updated = now;

    if (action === 'preview') {
      const html = await page(env, request, post);
      return html ? json({ html, exists: !!existing && !existing.removed }) : problem('The preview could not be made. Please try again.', 500);
    }
    // A post built into the site (not uploaded here) keeps its address.
    if (!existing && (await env.ASSETS!.fetch(new URL(`/blog/${post.slug}/`, request.url))).ok) {
      return problem('The site already has a post with this title. Change the title a little and try again.', 409);
    }
    // Same title as a post in the list (live or draft): ask before replacing it.
    if (existing && !existing.removed && body.replace !== true) return json({ error: 'exists', live: existing.live, url: postUrl(post.slug) }, 409);
    await db
      .prepare('INSERT INTO uploads (slug, live, post, updated) VALUES (?, ?, ?, ?) ON CONFLICT(slug) DO UPDATE SET live = excluded.live, post = excluded.post, updated = excluded.updated')
      .bind(post.slug, post.draft ? 0 : 1, JSON.stringify(post), now)
      .run();
    if (!post.draft || existing?.live) waitUntil(rebuild(env));
    return json({ ok: true, draft: post.draft, url: postUrl(post.slug) });
  }

  if (action === 'get' && request.method === 'POST') {
    const found = await getUpload(db, typeof body.slug === 'string' ? body.slug : '');
    return found ? json({ post: found.post, live: found.live }) : problem('That post was not found.', 404);
  }

  if (action === 'unpublish' && request.method === 'POST') {
    const slug = typeof body.slug === 'string' ? body.slug : '';
    await db.prepare('UPDATE uploads SET live = -1, updated = ? WHERE slug = ?').bind(Date.now(), slug).run();
    waitUntil(rebuild(env));
    return json({ ok: true });
  }

  return problem('Not found.', 404);
}
