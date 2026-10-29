/**
 * /api/uploadservice/me         GET   signed in or not, and whether a OneCut Content account is connected
 * /api/uploadservice/logout     POST
 * /api/uploadservice/chat       POST  messages, draft   OneCut Content writes or changes the page; answers one JSON line
 *                                      per step, the last one {done, reply, page}
 * /api/uploadservice/publish    POST  page, slug, draft, replace   saves it and starts a rebuild; it is live after the build
 * /api/uploadservice/get        POST  slug   a saved page, to change it
 * /api/uploadservice/list       GET   saved pages, newest first
 * /api/uploadservice/unpublish  POST  slug   takes the page down at the next build
 * /api/uploadservice/export     GET   public: live pages, read by scripts/pull-uploads.mjs at build
 *
 * Sign in is /api/upload/login: one password, one session for both upload pages. The page is written by
 * OneCut Content (POST /api/v1/service-pages, Pro only) with the website key connected at /upload/, so
 * the site holds no AI key. Nothing is served from here: a published page is saved in the database and
 * written into the build as src/content/services/<slug>.mdx, so it is built, listed and in the sitemap like
 * any service page and carries the site's security headers.
 */
import site from '../../../src/data/site.json';
import { sameOrigin } from '../../../src/lib/vow';
import { oneCutPro, unsealKey } from '../../../src/lib/onecut';
import { COOKIE, signedIn } from '../../../src/lib/upload-auth';
import { sha256 } from '../../../src/lib/vow';
import { RESERVED, cleanServiceUpload, slugFor, type CatalogLink, type ServicePage } from '../../../src/lib/service-uploads';
import type { UploadEnv } from '../../../src/lib/uploads';

interface Context {
  request: Request;
  env: UploadEnv;
  params: { action: string };
}

const json = (body: unknown, status = 200, cookie?: string) => {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  if (cookie) headers.append('set-cookie', cookie);
  return new Response(JSON.stringify(body), { status, headers });
};
const problem = (message: string, status = 400, extra: Record<string, unknown> = {}) => json({ error: message, ...extra }, status);

const SCHEMA = 'CREATE TABLE IF NOT EXISTS service_uploads (slug TEXT PRIMARY KEY, live INTEGER NOT NULL, page TEXT NOT NULL, published INTEGER NOT NULL, updated INTEGER NOT NULL)';
let ready: Promise<unknown> | null = null;
const ensure = (db: NonNullable<UploadEnv['VOW_DB']>) =>
  (ready ??= db.prepare(SCHEMA).bind().run().catch((e) => {
    ready = null;
    throw e;
  }));

type Row = { slug: string; live: number; page: string; published: number; updated: number };

/** The site's own pages with a line on what each says, plus the addresses a new page may not take. */
async function catalog(env: UploadEnv, request: Request): Promise<{ links: CatalogLink[]; reserved: Set<string> }> {
  const built = (await (await env.ASSETS!.fetch(new URL('/uploadservice/catalog.json', request.url))).json().catch(() => ({}))) as { links?: CatalogLink[]; reserved?: string[] };
  const links = new Map((built.links ?? []).map((l) => [l.url, l]));
  const db = env.VOW_DB!;
  // Posts published at /upload/ and service pages published here since the last build.
  const posts = await db.prepare('SELECT post FROM uploads WHERE live = 1 ORDER BY updated DESC LIMIT 100').bind().all<{ post: string }>().catch(() => ({ results: [] as { post: string }[] }));
  for (const r of posts.results) {
    const p = JSON.parse(r.post) as { slug: string; headline: string; summary: string };
    const url = `/blog/${p.slug}/`;
    if (!links.has(url)) links.set(url, { url, title: p.headline, kind: 'post', note: p.summary.slice(0, 300) });
  }
  const services = await db.prepare('SELECT slug, page FROM service_uploads WHERE live = 1').bind().all<Pick<Row, 'slug' | 'page'>>();
  for (const r of services.results) {
    const p = JSON.parse(r.page) as ServicePage;
    const url = `/services/${r.slug}/`;
    if (!links.has(url)) links.set(url, { url, title: p.name, kind: 'service', note: p.summary.slice(0, 300) });
  }
  return { links: [...links.values()], reserved: new Set([...(built.reserved ?? []), ...RESERVED]) };
}

const hasHook = (env: UploadEnv) => !!env.DEPLOY_HOOK_URL?.trim().startsWith('https://api.cloudflare.com/');
async function rebuild(env: UploadEnv) {
  if (hasHook(env)) await fetch(env.DEPLOY_HOOK_URL!.trim(), { method: 'POST' }).catch(() => undefined);
}

export async function onRequest({ request, env, params }: Context): Promise<Response> {
  const action = params.action;
  const db = env.VOW_DB;
  const password = env.UPLOAD_PASSWORD?.trim() ?? '';
  if (!db || password.length < 12) return action === 'me' ? json({ ready: false, signedIn: false }) : problem('Uploads are not set up yet.', 503);
  await ensure(db);

  if (action === 'export' && request.method === 'GET') {
    const { results } = await db.prepare('SELECT slug, page, published, updated FROM service_uploads WHERE live = 1 ORDER BY updated DESC').bind().all<Row>();
    return json({ services: results.map((r) => ({ slug: r.slug, page: JSON.parse(r.page), published: r.published, updated: r.updated })) });
  }

  if (request.method === 'POST') {
    if (!sameOrigin(request) || !request.headers.get('content-type')?.startsWith('application/json')) return problem('Refused.', 403);
  } else if (request.method !== 'GET') return problem('Not allowed.', 405);
  const body = request.method === 'POST' ? ((await request.json().catch(() => ({}))) as Record<string, unknown>) : {};

  const oneCutKey = async () => {
    const row = await db.prepare("SELECT value FROM upload_settings WHERE name = 'onecut_key'").bind().first<{ value: string }>().catch(() => null);
    return ((row && (await unsealKey(password, row.value))) || env.ONECUT_API_KEY || '').trim();
  };

  if (action === 'me') {
    const inside = await signedIn(env, request);
    if (!inside) return json({ ready: true, signedIn: false });
    const key = await oneCutKey();
    if (!key) return json({ ready: true, signedIn: true, connected: false });
    return (await oneCutPro(key)) ? json({ ready: true, signedIn: true, connected: true }) : json({ ready: true, signedIn: true, connected: false, needsPro: true });
  }
  if (!(await signedIn(env, request))) return problem('Please sign in again.', 401);

  if (action === 'logout' && request.method === 'POST') {
    const token = request.headers.get('cookie')?.match(/__Host-kc_upload=([0-9a-f]{64})/)?.[1] ?? '';
    await db.prepare('DELETE FROM upload_sessions WHERE hash = ?').bind(await sha256(token)).run();
    return json({ ok: true }, 200, `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
  }

  if (action === 'list' && request.method === 'GET') {
    const { results } = await db.prepare('SELECT slug, live, page, updated FROM service_uploads WHERE live >= 0 ORDER BY updated DESC LIMIT 200').bind().all<Row>();
    const origin = new URL(request.url).origin;
    return json({ services: results.map((r) => ({ slug: r.slug, name: (JSON.parse(r.page) as ServicePage).name, live: r.live === 1, draft: r.live === 0, updated: r.updated, url: `${origin}/services/${r.slug}/` })) });
  }

  if (action === 'get' && request.method === 'POST') {
    const slug = typeof body.slug === 'string' ? body.slug : '';
    const r = await db.prepare('SELECT slug, live, page FROM service_uploads WHERE slug = ? AND live >= 0').bind(slug).first<Row>();
    return r ? json({ slug: r.slug, live: r.live === 1, draft: r.live === 0, page: JSON.parse(r.page) }) : problem('That page was not found.', 404);
  }

  if (action === 'unpublish' && request.method === 'POST') {
    const slug = typeof body.slug === 'string' ? body.slug : '';
    const done = await db.prepare('UPDATE service_uploads SET live = -1, updated = ? WHERE slug = ? AND live >= 0').bind(Date.now(), slug).run();
    if (!(done as { meta?: { changes?: number } }).meta?.changes) return problem('That page was not found.', 404);
    await rebuild(env);
    return json({ ok: true, rebuilding: hasHook(env) });
  }

  if (action === 'chat' && request.method === 'POST') {
    const key = await oneCutKey();
    if (!key) return problem('Connect a OneCut Content account first. It takes a minute on the blog upload page.', 403, { connect: true });
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .slice(-12)
      .map((m) => ({ role: (m as { role?: string })?.role === 'assistant' ? 'assistant' : 'user', content: String((m as { content?: unknown })?.content ?? '').slice(0, 2000) }))
      .filter((m) => m.content.trim());
    if (!messages.length || messages[messages.length - 1].role !== 'user') return problem('Tell us what page you want.');
    const { links } = await catalog(env, request);
    const existing = links.filter((l) => l.kind === 'service' || l.kind === 'guide').map((l) => ({ url: l.url, name: l.title }));
    let res: Response;
    try {
      res = await fetch('https://onecutcontent.com/api/v1/service-pages', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', accept: 'application/x-ndjson' },
        body: JSON.stringify({
          messages,
          draft: body.draft && typeof body.draft === 'object' ? body.draft : null,
          site: {
            name: site.name,
            brokerage: site.brokerage.legalName,
            registrant: `${site.brokerage.registrant}, ${site.brokerage.registrationCategory}`,
            area: 'Toronto, Ontario',
            phone: site.contact.phone,
            locale: 'en-CA',
            rules: [
              'Canadian English: neighbourhood, centre, colour.',
              'No em dashes or en dashes anywhere. Write ranges as "3 to 6 months".',
              'No comma directly before "and" or "or".',
              'No exclamation marks, italics or emoji.',
              'No predictions, guarantees or superlatives.',
              'Describe homes and services, never who they suit by age, family status or other protected grounds.',
            ],
          },
          links,
          existing,
        }),
      });
    } catch {
      return problem('OneCut could not be reached. Please try again in a minute.', 503);
    }
    if (!res.ok || !res.body) {
      const said = ((await res.json().catch(() => ({}))) as { error?: string }).error;
      if (res.status === 401) return problem('OneCut no longer accepts the connected key. Connect your account again on the blog upload page.', 403, { connect: true });
      return problem(said || 'OneCut could not write the page. Please try again.', res.status === 402 || res.status === 403 || res.status === 429 ? res.status : 502);
    }
    // Passed straight through: a line per step as OneCut works, then the page.
    return new Response(res.body, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
  }

  if (action === 'publish' && request.method === 'POST') {
    const { links, reserved } = await catalog(env, request);
    const page = cleanServiceUpload(body.page, links);
    if (typeof page === 'string') return problem(page);
    const slug = typeof body.slug === 'string' && body.slug ? body.slug : slugFor(page.name);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 60) return problem('The web address for this page is not valid. Use lowercase letters, numbers and hyphens.');
    const existing = await db.prepare('SELECT slug, live, published FROM service_uploads WHERE slug = ?').bind(slug).first<Row>();
    // A generated page may be replaced. Nothing else may be taken: a service page the site already has, or one of its guides' old addresses.
    if (!existing && reserved.has(slug)) return problem('That web address belongs to a page the site already has. Change the address a little and try again.', 409);
    if (existing && existing.live >= 0 && body.replace !== true) return json({ error: 'exists', live: existing.live === 1 }, 409);
    const now = Date.now();
    const draft = body.draft === true;
    await db
      .prepare('INSERT INTO service_uploads (slug, live, page, published, updated) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(slug) DO UPDATE SET live = ?2, page = ?3, updated = ?5')
      .bind(slug, draft ? 0 : 1, JSON.stringify(page), existing?.published ?? now, now)
      .run();
    // A draft that was live comes down, so it needs a build too.
    const wasLive = existing?.live === 1;
    if (!draft || wasLive) await rebuild(env);
    return json({ ok: true, slug, url: `${new URL(request.url).origin}/services/${slug}/`, draft, rebuilding: (!draft || wasLive) && hasHook(env) });
  }

  return problem('Not found.', 404);
}
