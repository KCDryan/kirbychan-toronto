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
 * /api/upload/connect    POST  key    the agent's OneCut Content website key (client websites only)
 * /api/upload/write      POST  topic  OneCut Content writes the article; answers one JSON line per step, the
 *                              last one {done, blog}. Uses the connected OneCut account and its tokens
 *
 * Client websites (requireOneCutPro in src/data/site.json) also need a OneCut Content account on Pro
 * or above. After signing in, the agent pastes their website key from onecutcontent.com once; it is
 * checked there, then kept encrypted in the database. An ONECUT_API_KEY secret works too. No key,
 * a revoked key or a lower plan closes everything except signing in, connecting and export, so
 * posts already published stay on the site.
 *
 * With oneCutOnly in site.json as well, OneCut Content is the only way to make a post: each article
 * it finishes writing comes with a one-use ticket, and a new post is not saved without one. Posts
 * already saved can still be edited, unpublished and removed.
 * ponytail: the ticket proves an article was written, not that the saved words are that article. A
 * signed-in owner editing requests by hand could swap the text. Bind the ticket to a hash of the
 * article if that ever matters.
 */
import { randomHex, same, sameOrigin, sha256 } from '../../../src/lib/vow';
import { oneCutPro, oneCutVerdict, sealKey, unsealKey } from '../../../src/lib/onecut';
import { COOKIE, signedIn } from '../../../src/lib/upload-auth';
export { oneCutPro, oneCutVerdict, sealKey, unsealKey };
import site from '../../../src/data/site.json';
import { SHELL, cleanPost, ensureUploadSchema, fillShell, getUpload, rebuild, type Post, type UploadEnv } from '../../../src/lib/uploads';

interface Context {
  request: Request;
  env: UploadEnv;
  params: { action: string };
  waitUntil(p: Promise<unknown>): void;
}

const SESSION_HOURS = 12;
const HOUR = 36e5;

const json = (body: unknown, status = 200, cookie?: string) => {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  if (cookie) headers.append('set-cookie', cookie);
  return new Response(JSON.stringify(body), { status, headers });
};
const problem = (message: string, status = 400) => json({ error: message }, status);

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

  // Client websites: signed in is not enough, the OneCut account has to be on Pro.
  const oneCutKey = async () => {
    const row = await db.prepare("SELECT value FROM upload_settings WHERE name = 'onecut_key'").bind().first<{ value: string }>();
    return ((row && (await unsealKey(password, row.value))) || env.ONECUT_API_KEY || '').trim();
  };
  const oneCutOnly = (site as { oneCutOnly?: boolean }).oneCutOnly === true;
  const needsPro = async () => (site as { requireOneCutPro?: boolean }).requireOneCutPro === true && !(await oneCutPro(await oneCutKey()));

  if (action === 'me') {
    const inside = await signedIn(env, request);
    if (!inside) return json({ ready: true, signedIn: false });
    // canWrite: a OneCut account is connected, so the page offers "Write a new post".
    return (await needsPro()) ? json({ ready: true, signedIn: true, needsPro: true }) : json({ ready: true, signedIn: true, ...((await oneCutKey()) ? { canWrite: true } : {}), ...(oneCutOnly ? { oneCutOnly: true } : {}) });
  }
  if (!(await signedIn(env, request))) return problem('Please sign in again.', 401);

  if (action === 'connect' && request.method === 'POST') {
    const key = typeof body.key === 'string' ? body.key.trim() : '';
    if (!/^oc_live_[\w-]{16,200}$/.test(key)) return problem('That does not look like a OneCut website key. It starts with oc_live_.');
    const verdict = await oneCutVerdict(key);
    if (verdict === 'bad-key') return problem('OneCut does not know this key. Create a new website key in your OneCut account and paste it here.');
    if (verdict === 'not-pro') return problem('This OneCut account is not on Pro. Publishing blog posts needs OneCut Content Pro.', 403);
    if (verdict === 'unknown') return problem('OneCut could not be reached. Please try again in a minute.', 503);
    await db.prepare("INSERT OR REPLACE INTO upload_settings (name, value) VALUES ('onecut_key', ?)").bind(await sealKey(password, key)).run();
    return json({ ok: true });
  }

  if (action === 'logout' && request.method === 'POST') {
    const token = request.headers.get('cookie')?.match(/__Host-kc_upload=([0-9a-f]{64})/)?.[1] ?? '';
    await db.prepare('DELETE FROM upload_sessions WHERE hash = ?').bind(await sha256(token)).run();
    return json({ ok: true }, 200, `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
  }

  if (action !== 'logout' && (await needsPro())) return problem('Publishing blog posts needs a OneCut Content Pro account.', 403);

  if (action === 'write' && request.method === 'POST') {
    const key = await oneCutKey();
    if (!key) return problem('Connect a OneCut Content account first.', 403);
    const topic = typeof body.topic === 'string' ? body.topic.replace(/\s+/g, ' ').trim().slice(0, 200) : '';
    if (topic.length < 3) return problem('Tell us what the post should be about.');
    let res: Response;
    try {
      res = await fetch('https://onecutcontent.com/api/v1/blogs', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', accept: 'application/x-ndjson' },
        body: JSON.stringify({ topic, words: 1500 }),
      });
    } catch {
      return problem('OneCut could not be reached. Please try again in a minute.', 503);
    }
    if (!res.ok || !res.body) {
      const said = ((await res.json().catch(() => ({}))) as { error?: string }).error;
      return problem(said || 'OneCut could not write the post. Please try again.', res.status === 402 || res.status === 429 ? res.status : 502);
    }
    // Passed straight through: a line per step as OneCut works, then the finished article. When it
    // did finish, one more line carries the ticket that lets this article be saved as a new post.
    let tail = '';
    const decoder = new TextDecoder();
    const ticketed = res.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          tail = (tail + decoder.decode(chunk, { stream: true })).slice(-200_000);
          controller.enqueue(chunk);
        },
        async flush(controller) {
          if (!/"done":\s*true/.test(tail)) return;
          const ticket = randomHex();
          const now = Date.now();
          await db.prepare('DELETE FROM upload_tickets WHERE expires < ?').bind(now).run();
          await db.prepare('INSERT INTO upload_tickets (hash, expires) VALUES (?, ?)').bind(await sha256(ticket), now + 24 * HOUR).run();
          controller.enqueue(new TextEncoder().encode(`\n${JSON.stringify({ ticket })}\n`));
        },
      })
    );
    return new Response(ticketed, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
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
    // OneCut only: a new post needs the ticket from an article OneCut wrote. It is used up when saved.
    if (oneCutOnly && (!existing || existing.removed)) {
      const ticket = typeof body.ticket === 'string' && /^[0-9a-f]{64}$/.test(body.ticket) ? await sha256(body.ticket) : '';
      const row = ticket ? await db.prepare('SELECT expires FROM upload_tickets WHERE hash = ?').bind(ticket).first<{ expires: number }>() : null;
      if (!row || row.expires < now) return problem('New posts on this website are written with OneCut Content. Press "Write a new post" to start one.', 403);
      await db.prepare('DELETE FROM upload_tickets WHERE hash = ?').bind(ticket).run();
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
