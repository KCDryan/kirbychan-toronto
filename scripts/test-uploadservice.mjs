/**
 * Checks the service page API (functions/api/uploadservice/[action].ts) against an in-memory database
 * with OneCut Content and the deploy hook mocked. Needs a built site: it reads dist/uploadservice/catalog.json.
 *
 * Usage: npm run build && node scripts/test-uploadservice.mjs
 */
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import site from '../src/data/site.json' with { type: 'json' };
import { schemaProblem, styleProblem, toMdx } from './service-mdx.mjs';

let passed = 0;
const ok = (cond, msg) => {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  passed++;
  console.log(`  ok  ${msg}`);
};

const out = mkdtempSync(join(tmpdir(), 'uploadservice-test-'));
await build({
  entryPoints: { svc: 'functions/api/uploadservice/[action].ts', upload: 'functions/api/upload/[action].ts', live: 'functions/services/[[path]].ts' },
  bundle: true, format: 'esm', platform: 'neutral', mainFields: ['module', 'main'], outdir: out, outExtension: { '.js': '.mjs' }, logLevel: 'error',
});
const { onRequest: svc } = await import(pathToFileURL(join(out, 'svc.mjs')).href);
const { onRequest: live } = await import(pathToFileURL(join(out, 'live.mjs')).href);
const { onRequest: upload } = await import(pathToFileURL(join(out, 'upload.mjs')).href);

const sqlite = new DatabaseSync(':memory:');
const bound = (sql, v) => (/\?\d/.test(sql) ? [Object.fromEntries(v.map((val, i) => [i + 1, val]))] : v);
const db = {
  prepare: (sql) => ({
    bind: (...v) => ({
      first: async () => sqlite.prepare(sql).get(...bound(sql, v)) ?? null,
      // D1 reports how many rows a statement changed under meta.changes.
      run: async () => ({ meta: { changes: Number(sqlite.prepare(sql).run(...bound(sql, v)).changes) } }),
      all: async () => ({ results: sqlite.prepare(sql).all(...bound(sql, v)) }),
    }),
  }),
};

const ORIGIN = site.url;
const PASSWORD = 'shared test pass 42';
const catalogJson = readFileSync('dist/uploadservice/catalog.json', 'utf8');
const assets = { fetch: async (u) => (new URL(u).pathname === '/uploadservice/catalog.json' ? new Response(catalogJson) : new Response('', { status: 404 })) };
const HOOK = 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/test';

let onecut = { status: 200, lines: [] };
let seen = null;
let hookCalls = 0;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u === 'https://onecutcontent.com/api/v1/account') return Response.json({ plan: 'pro', pro: true });
  if (u === 'https://onecutcontent.com/api/v1/service-pages') {
    seen = { auth: init.headers.authorization, accept: init.headers.accept, body: JSON.parse(init.body) };
    if (onecut.status !== 200) return Response.json({ error: onecut.error ?? 'No.' }, { status: onecut.status });
    return new Response(onecut.lines.map((l) => JSON.stringify(l) + '\n').join(''), { headers: { 'content-type': 'application/x-ndjson' } });
  }
  if (u === HOOK) {
    hookCalls++;
    return new Response('{}');
  }
  throw new Error(`unexpected fetch ${u}`);
};

const env = { VOW_DB: db, UPLOAD_PASSWORD: PASSWORD, ASSETS: assets };
let cookie = '';
const call = async (mod, action, body, { method, e = env, headers = {} } = {}) => {
  const post = body !== undefined;
  const res = await mod({
    request: new Request(`${ORIGIN}/api/${mod === svc ? 'uploadservice' : 'upload'}/${action}`, {
      method: method ?? (post ? 'POST' : 'GET'),
      headers: { ...(post ? { 'content-type': 'application/json', origin: ORIGIN } : {}), ...(cookie ? { cookie } : {}), ...headers },
      body: post ? JSON.stringify(body) : undefined,
    }),
    env: e,
    params: { action },
    waitUntil() {},
  });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {}
  return { status: res.status, data, text };
};
const s = (action, body, opts) => call(svc, action, body, opts);

const catalog = JSON.parse(catalogJson);
const guide = catalog.links.find((l) => l.kind === 'guide');
const post = catalog.links.find((l) => l.kind === 'post');
const pad = 'A plain sentence about how the work goes, for a reader who wants to know. '.repeat(40);
const goodPage = {
  name: 'Pre-construction assignment sales',
  h1: 'Selling a pre-construction condo assignment in Toronto',
  accent: 'assignment',
  title: 'Pre-Construction Assignment Sales in Toronto',
  description: 'How we help an owner sell a pre-construction condo before closing: reading the builder agreement, pricing the assignment and finding a buyer in Toronto.',
  summary: 'How we help an owner sell a pre-construction condo assignment before it closes.',
  problem: 'A plain sentence about how the work goes, for a reader who wants to know. '.repeat(10).trim(),
  proof_hood: '/leaside-toronto/',
  proof: 'Leaside has its own shops and a short drive to the downtown core. The neighbourhood guide lists the streets, the transit and the commute a reader can check before deciding where to start. Read that guide, then ask what the homes on those streets have sold for.',
  steps: [1, 2, 3].map((i) => ({ title: `Step ${i} title`, body: `The body of step number ${i}, written out in a full sentence for the reader.` })),
  body: `## When it applies\nSee [the guide](${guide.url}), [a post](${post.url}) and [elsewhere](https://evil.example/x). A neighborhood <b>note</b>.\n\n## Local specifics\n${pad}`,
  faq: [1, 2, 3].map((i) => ({ q: `Question ${i}?`, a: `A full answer number ${i} for this question, in plain words.` })),
  focus_keyword: 'pre-construction assignment toronto',
  related_posts: [post.url, '/blog/not-listed/'],
};

console.log('Service pages');
ok(catalog.links.length > 30 && guide && post, 'the built catalog lists the site\'s own posts and guides');
ok((await s('list')).status === 401 && (await s('publish', { page: goodPage })).status === 401 && (await s('chat', { messages: [] })).status === 401, 'every action but me and export needs a session');
ok((await s('get', { slug: 'x' })).status === 401 && (await s('unpublish', { slug: 'x' })).status === 401, 'reading and removing need a session too');
ok((await s('me')).data.signedIn === false && (await s('export')).data.services.length === 0, 'me answers signed out, and export is public and empty');
ok((await s('export', undefined, { e: { ...env, UPLOAD_PASSWORD: 'short' } })).status === 503, 'with no usable password nothing works');

await call(upload, 'login', { password: PASSWORD });
ok(/^__Host-kc_upload=/.test(cookie), 'the same sign in the blog upload uses starts the session');
ok((await s('publish', { page: goodPage }, { headers: { origin: 'https://evil.example' } })).status === 200 ? false : true, 'a post from another site is refused');
ok((await s('publish', { page: goodPage }, { headers: { 'content-type': 'text/plain' } })).status !== 200, 'a post that is not JSON is refused');
ok((await s('me')).data.connected === false, 'signed in with no OneCut account: not connected');
const noKey = await s('chat', { messages: [{ role: 'user', content: 'a page' }] });
ok(noKey.status === 403 && noKey.data.connect === true, 'chat needs a connected OneCut account');
await call(upload, 'connect', { key: 'oc_live_bbbbbbbbbbbbbbbbbbbbbbbb' });
ok((await s('me')).data.connected === true, 'after connecting at /upload/ the service page chat sees it');

// A blog post published at /upload/ since the last build is offered to the writer as a page it may link.
sqlite.prepare('INSERT INTO uploads (slug, live, post, updated) VALUES (?, 1, ?, 1)').run('fresh-post-from-onecut', JSON.stringify({ slug: 'fresh-post-from-onecut', headline: 'A Fresh Post From OneCut', summary: 'What the fresh post says.' }));
onecut = { status: 200, lines: [{ stage: 'Researching keywords' }, { stage: 'Keywords chosen', focus: 'x', related: [], from: 'searches' }, { done: true, reply: 'Here it is.', page: goodPage }] };
const messages = Array.from({ length: 15 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `message ${i}` }));
messages.push({ role: 'user', content: 'a pre-construction assignment page' });
const chat = await s('chat', { messages, draft: { name: 'old draft' } });
ok(chat.status === 200 && chat.text.trim().split('\n').length === 3 && JSON.parse(chat.text.trim().split('\n')[2]).done === true, 'chat passes OneCut\'s steps and its page straight through');
ok(seen.auth === 'Bearer oc_live_bbbbbbbbbbbbbbbbbbbbbbbb' && seen.accept === 'application/x-ndjson', 'chat uses the connected key and asks for the step stream');
ok(seen.body.messages.length === 12 && seen.body.messages.at(-1).content === 'a pre-construction assignment page' && seen.body.draft.name === 'old draft', 'only the last 12 messages go, with the draft');
ok(seen.body.site.name === site.name && seen.body.site.phone === site.contact.phone && seen.body.site.rules.some((r) => r.includes('em dashes')), 'the writer is told the business facts and the house style');
ok(seen.body.links.some((l) => l.url === guide.url && l.note) && seen.body.links.some((l) => l.url === '/blog/fresh-post-from-onecut/' && l.kind === 'post'), 'the writer gets the built pages with excerpts and the posts published since the build');
ok(seen.body.existing.some((e) => e.url === guide.url), 'pages the site already has are listed so the writer will not repeat one');
onecut = { status: 402, error: 'A service page costs 2 tokens and you do not have that many left this month.' };
const broke = await s('chat', { messages: [{ role: 'user', content: 'a page' }] });
ok(broke.status === 402 && /tokens/.test(broke.data.error), 'running out of OneCut tokens reaches the page in OneCut\'s words');
onecut = { status: 401 };
const revoked = await s('chat', { messages: [{ role: 'user', content: 'a page' }] });
ok(revoked.status === 403 && revoked.data.connect === true, 'a revoked key sends the person back to reconnect');
ok((await s('chat', { messages: [{ role: 'assistant', content: 'hi' }] })).status === 400, 'a chat that does not end with the person speaking is refused');

// Publishing
ok((await s('publish', { page: { ...goodPage, steps: [] } })).status === 400, 'a page the build could not take is refused with a reason');
ok((await s('publish', { page: goodPage, slug: 'Bad Slug' })).status === 400, 'a web address with capitals or spaces is refused');
const res = await s('publish', { page: goodPage, slug: 'downsizing' });
ok(res.status === 409, 'a service address the site already has cannot be taken');
let pub = await s('publish', { page: goodPage, draft: false });
ok(pub.status === 200 && pub.data.slug === 'pre-construction-assignment-sales' && pub.data.url === `${ORIGIN}/services/pre-construction-assignment-sales/` && pub.data.rebuilding === false, 'publishing saves the page and says the rebuild will wait for morning when there is no hook');
const saved = (await s('get', { slug: 'pre-construction-assignment-sales' })).data;
ok(saved.live === true && saved.page.body.includes(`[the guide](${guide.url})`) && !saved.page.body.includes('evil.example') && !saved.page.body.includes('<b>') && saved.page.body.includes('neighbourhood'), 'the saved page keeps its own links and loses the others, and gets the house style');
ok(JSON.stringify(saved.page.related_posts) === JSON.stringify([post.url]), 'only posts the site has stay as related posts');
ok((await s('publish', { page: goodPage })).data.error === 'exists', 'publishing the same name again asks before replacing');
const withHook = { ...env, DEPLOY_HOOK_URL: HOOK };
hookCalls = 0;
pub = await s('publish', { page: goodPage, replace: true }, { e: withHook });
ok(pub.status === 200 && pub.data.rebuilding === true && hookCalls === 1, 'with a deploy hook a published page starts one rebuild');
hookCalls = 0;
await s('publish', { page: { ...goodPage, name: 'Another draft page here' }, draft: true }, { e: withHook });
ok(hookCalls === 0, 'saving a draft does not rebuild the site');
const listed = (await s('list')).data.services;
ok(listed.length === 2 && listed.find((x) => x.slug === 'pre-construction-assignment-sales').live === true && listed.find((x) => x.slug === 'another-draft-page-here').draft === true, 'the list shows live pages and drafts');
const exported = (await s('export')).data.services;
ok(exported.length === 1 && exported[0].slug === 'pre-construction-assignment-sales', 'the public export carries live pages only');

// The page is on the site the moment it is published
const shellHtml = readFileSync('dist/services/upload-shell/index.html', 'utf8');
const liveAssets = { fetch: async (u) => {
  const path = new URL(u).pathname;
  if (path === '/services/upload-shell/') return new Response(shellHtml, { headers: { 'content-type': 'text/html', 'x-robots-tag': 'noindex, nofollow' } });
  if (path === '/404.html') return new Response('<h1>Not found</h1>');
  return assets.fetch(u);
} };
let builtHtml = null;
const get = (path, method = 'GET') => live({ request: new Request(`${ORIGIN}${path}`, { method }), env: { ...env, ASSETS: liveAssets }, next: async () => (builtHtml ? new Response(builtHtml, { headers: { 'content-type': 'text/html' } }) : new Response('nf', { status: 404 })) });
const page = await get('/services/pre-construction-assignment-sales/');
const html = await page.text();
ok(page.status === 200 && page.headers.get('x-robots-tag') === null && !html.includes('KCSVC') && !html.includes('noindex'), 'a published page is served at once, indexable, with no leftover marks');
ok(html.includes(goodPage.h1) && html.includes('<link rel="canonical" href="https://kirbychantoronto.com/services/pre-construction-assignment-sales/"') && !html.includes('upload-shell'), 'it has its heading and its own canonical address');
ok((html.match(/<li class="step"/g) ?? []).length === goodPage.steps.length && (html.match(/<details class="faq__item"/g) ?? []).length === goodPage.faq.length, 'it shows exactly its own steps and questions');
ok(html.includes('data-proof') && html.includes('Read the Leaside guide') && /<img src="[^"]*"[^>]*alt="[^"]+"/.test(html.slice(html.indexOf('data-proof'))) && !html.includes('data-kcsvc-photos'), 'it shows the neighbourhood proof block with its photo');
ok(/<meta property="og:image" content="[^"]*leaside[^"]*"/i.test(html), 'the share image is the neighbourhood photo');
ok(html.includes('Photo: <a href="https://commons.wikimedia.org') && html.includes('CC BY-SA'), 'the photo carries its credit and licence');
ok(html.includes('"@type":"FAQPage"') && html.includes(JSON.stringify(goodPage.faq[0].q).slice(1, -1)), 'its structured data carries its own questions');
builtHtml = `<span hidden data-upload="${exported[0].updated}"></span>BUILT`;
ok((await (await get('/services/pre-construction-assignment-sales')).text()).includes('BUILT'), 'once a build has caught up the built page is served');
builtHtml = null;
ok((await get('/services/another-draft-page-here/')).status === 404, 'a draft is not on the site');
ok((await get('/services/some-built-page/')).status === 404 && (await get('/services/')).status === 404, 'other addresses fall through to the built site');

// What the build does with the export
const p = exported[0];
ok(schemaProblem(p.slug, p.page) === '' && styleProblem(toMdx(p.slug, p.page, p.updated, 100)) === '', 'a saved page passes the build\'s own checks, so it cannot stop a deploy');
ok(schemaProblem(p.slug, { ...p.page, description: 'short' }) !== '' && styleProblem('A neighborhood, and more') !== '', 'the build skips a page that would break it');

hookCalls = 0;
ok((await s('unpublish', { slug: 'pre-construction-assignment-sales' }, { e: withHook })).data.ok === true && hookCalls === 1, 'removing a page takes it down at the next build');
builtHtml = '<html>BUILT</html>';
ok((await get('/services/pre-construction-assignment-sales/')).status === 404, 'a removed page is gone at once, even while a built copy exists');
builtHtml = null;
ok((await s('export')).data.services.length === 0 && (await s('list')).data.services.length === 1, 'a removed page is out of the export and the list');
ok((await s('unpublish', { slug: 'nothing-here' })).status === 404, 'removing a page that is not there says so');
ok((await s('publish', { page: goodPage })).status === 200, 'a removed address can be used again');

await s('logout', {});
ok((await s('list')).status === 401, 'signing out ends the session');
console.log(`\nService page test passed: ${passed} checks.`);
