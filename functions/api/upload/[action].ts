/**
 * /api/upload/me         GET   signed in or not, and whether uploads are set up
 * /api/upload/login      POST  password
 * /api/upload/logout     POST
 * /api/upload/preview    POST  post   the finished page, exactly as it will look
 * /api/upload/publish    POST  post   live at once; replace: true to update a post already up
 * /api/upload/list       GET   uploaded posts, newest first
 * /api/upload/unpublish  POST  slug
 * /api/upload/export     GET   public: live uploaded posts, read by scripts/pull-uploads.mjs at build
 *
 * One shared password, set by the owner as the UPLOAD_PASSWORD secret in Cloudflare. Ten wrong
 * passwords from one address in an hour, or fifty from anywhere, pause sign in for the hour.
 */
import { randomHex, same, sameOrigin, sha256 } from '../../../src/lib/vow';
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
    const { results } = await db.prepare('SELECT live, post FROM uploads ORDER BY updated DESC LIMIT 200').bind().all<{ live: number; post: string }>();
    return json({
      posts: results.map((r) => {
        const p = JSON.parse(r.post) as Post;
        return { slug: p.slug, headline: p.headline, live: r.live === 1, updated: p.updated, url: postUrl(p.slug) };
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
      return html ? json({ html, exists: !!existing?.live }) : problem('The preview could not be made. Please try again.', 500);
    }
    // A post built into the site (not uploaded here) keeps its address.
    if (!existing && (await env.ASSETS!.fetch(new URL(`/blog/${post.slug}/`, request.url))).ok) {
      return problem('The site already has a post with this title. Change the title a little and try again.', 409);
    }
    if (existing?.live && body.replace !== true) return json({ error: 'exists', url: postUrl(post.slug) }, 409);
    await db
      .prepare('INSERT INTO uploads (slug, live, post, updated) VALUES (?, 1, ?, ?) ON CONFLICT(slug) DO UPDATE SET live = 1, post = excluded.post, updated = excluded.updated')
      .bind(post.slug, JSON.stringify(post), now)
      .run();
    waitUntil(rebuild(env));
    return json({ ok: true, url: postUrl(post.slug) });
  }

  if (action === 'unpublish' && request.method === 'POST') {
    const slug = typeof body.slug === 'string' ? body.slug : '';
    await db.prepare('UPDATE uploads SET live = 0, updated = ? WHERE slug = ?').bind(Date.now(), slug).run();
    waitUntil(rebuild(env));
    return json({ ok: true });
  }

  return problem('Not found.', 404);
}
