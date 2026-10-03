/**
 * Blog posts uploaded at /upload/. They are saved in D1 and go live the moment they are published:
 * functions/blog/[[path]].ts renders them into a page the site built with the real blog layout
 * (/blog/upload-shell/<category>/), so they look exactly like every other post. The next site build
 * (scripts/pull-uploads.mjs) also writes them into the blog collection, so the blog list, category
 * pages, sitemap and RSS feed include them.
 *
 *   node --experimental-strip-types src/lib/uploads.ts   (self-check)
 */
import MarkdownIt from 'markdown-it';
import { BLOG_CATEGORIES, readingMinutes, wordCount } from './blog.ts';
import { longDate } from './format.ts';
import type { D1 } from './vow.ts';
import { HOODS, SERVICES, autoLinks } from './post-links.ts';

export interface UploadEnv {
  VOW_DB?: D1;
  UPLOAD_PASSWORD?: string;
  /** Optional: the agent's OneCut Content key as a secret. Normally they paste it on the upload page instead. */
  ONECUT_API_KEY?: string;
  DEPLOY_HOOK_URL?: string;
  ASSETS?: { fetch(input: Request | URL | string): Promise<Response> };
}

export interface Post {
  slug: string;
  category: string;
  headline: string;
  summary: string;
  quickAnswer: string;
  faq: { q: string; a: string }[];
  sources: { name: string; url: string }[];
  markdown: string;
  author: string;
  authorTitle: string;
  related: string[];
  relatedServices: string[];
  draft: boolean;
  published: number;
  updated: number;
}

export const SHELL = '/blog/upload-shell/';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS uploads (slug TEXT PRIMARY KEY, live INTEGER NOT NULL, post TEXT NOT NULL, updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS upload_sessions (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS upload_fails (ip TEXT NOT NULL, at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS upload_settings (name TEXT PRIMARY KEY, value TEXT NOT NULL)`;
let ready: Promise<unknown> | null = null;
export const ensureUploadSchema = (db: D1) =>
  (ready ??= (async () => {
    for (const sql of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) await db.prepare(sql).bind().run();
  })().catch((e) => {
    ready = null;
    throw e;
  }));

export async function getUpload(db: D1, slug: string): Promise<{ live: boolean; removed: boolean; post: Post } | null> {
  const row = await db.prepare('SELECT live, post FROM uploads WHERE slug = ?').bind(slug).first<{ live: number; post: string }>();
  return row ? { live: row.live === 1, removed: row.live === -1, post: { author: '', authorTitle: '', related: [], relatedServices: [], draft: false, ...JSON.parse(row.post) } } : null;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const SAFE_URL = /^(https?:\/\/|\/|#|mailto:|tel:)/i;

/**
 * Checks a post sent from the upload page and makes it safe. The rules are the blog collection's,
 * so a post that goes live can never stop the next site build. Returns the post or a plain English
 * problem for the person uploading.
 */
export function cleanPost(raw: unknown): Post | string {
  const r = (raw ?? {}) as Record<string, unknown>;
  const headline = str(r.headline, 200);
  const summary = str(r.summary, 1000);
  const slug = typeof r.slug === 'string' ? r.slug : '';
  const category = typeof r.category === 'string' ? r.category : '';
  if (headline.length < 10 || headline.length > 90) return `The title must be 10 to 90 characters long. It is ${headline.length}.`;
  if (summary.length < 50) return 'The article needs a short summary of at least 50 characters. Add a meta description or an opening paragraph.';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 90) return 'The web address for this post is not valid.';
  if (!(category in BLOG_CATEGORIES)) return 'Please choose a topic for this post.';
  let markdown = typeof r.markdown === 'string' ? r.markdown.trim() : '';
  if (markdown.length > 200_000) return 'This article is too long to upload.';
  if (wordCount(markdown) < 100) return 'This article is too short. Paste the whole article, not just part of it.';
  // No raw HTML and no unsafe links in the post: every < becomes text and other link types become plain text.
  markdown = markdown
    .replace(/(^|[^\\])</g, '$1&lt;')
    .replace(/\]\(\s*<?([^)\s>]*)>?([^)]*)\)/g, (m, url, rest) => (SAFE_URL.test(url) ? m : `](#${rest})`))
    .replace(/^(\s*\[[^\]]+\]:\s*)(\S+)/gm, (m, lead, url) => (SAFE_URL.test(url) ? m : `${lead}#`));
  const list = (v: unknown) => (Array.isArray(v) ? v.slice(0, 40) : []);
  const faq = list(r.faq)
    .map((f) => ({ q: str(f?.q, 300), a: str(f?.a, 3000) }))
    .filter((f) => f.q && f.a);
  const sources = list(r.sources)
    .map((s) => ({ name: str(s?.name, 300), url: str(s?.url, 1000) }))
    .filter((s) => s.name.length >= 2 && /^https:\/\/[^\s"<>]+$/.test(s.url));
  return {
    slug,
    category,
    headline,
    summary: summary.length > 300 ? summary.slice(0, 300).replace(/\s+\S*$/, '') : summary,
    quickAnswer: str(r.quickAnswer, 2000),
    faq,
    sources,
    markdown,
    author: str(r.author, 80),
    authorTitle: str(r.authorTitle, 80),
    related: [...new Set(list(r.related))].filter((id): id is string => typeof id === 'string' && id in HOODS),
    relatedServices: [...new Set(list(r.relatedServices))].filter((id): id is string => typeof id === 'string' && id in SERVICES),
    draft: r.draft === true,
    published: 0,
    updated: 0,
  };
}

/** Same heading ids as Astro's (github-slugger), so links to a section keep working after the rebuild. */
const slugger = () => {
  const seen = new Map<string, number>();
  return (text: string) => {
    const base = text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '').replace(/ /g, '-');
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n ? `${base}-${n}` : base;
  };
};

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
// GFM, like Astro, only links bare addresses that start with http or www.
md.linkify.set({ fuzzyLink: false });

/** The post body as HTML, plus its h2 headings for the table of contents. */
export function renderBody(markdown: string) {
  const tokens = md.parse(markdown, {});
  const slug = slugger();
  const headings: { id: string; text: string }[] = [];
  tokens.forEach((t, i) => {
    if (t.type !== 'heading_open') return;
    const text = (tokens[i + 1].children ?? []).filter((c) => c.type === 'text' || c.type === 'code_inline').map((c) => c.content).join('');
    const id = slug(text);
    t.attrSet('id', id);
    if (t.tag === 'h2') headings.push({ id, text });
  });
  return { html: md.renderer.render(tokens, md.options, {}), headings };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const clip = (text: string, max: number) => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 1)).replace(/[\s,;:.]+$/, '');
};

/** Marks in the shell page (src/pages/blog/upload-shell/[category].astro), each replaced once. */
export const SHELL_DATE = new Date('2001-02-03T12:00:00.000Z');
const TOKEN = /KCUPLOAD-[A-Z]+(?:-\d+)?/g;

/**
 * Fills the shell page with a post. Repeated parts (questions, sources, contents) are copied once
 * per item first, then every mark is replaced in a single pass, so nothing in the post itself is
 * ever read as a mark.
 */
export function fillShell(shell: string, post: Post): string {
  const { html: body, headings } = renderBody(post.markdown);
  const words = wordCount(post.markdown);
  const path = `/blog/${post.slug}/`;
  const published = new Date(post.published);
  const repeat = (re: RegExp, n: number, mark: string) =>
    (html: string) => html.replace(re, (block) => Array.from({ length: n }, (_, i) => block.replace(new RegExp(`(${mark}[A-Z]*)`, 'g'), `$1-${i}`)).join(''));

  let html = shell
    .replace(/(https:\/\/kirbychantoronto\.com)?\/blog\/upload-shell\/[a-z-]+\//g, (_m, origin) => `${origin ?? ''}${path}`)
    .replaceAll('/blog/kcupload-slug/', path)
    .replace(/\s*<meta name="robots" content="noindex"\s*\/?>/, '');
  // Byline, and the "Keep exploring" links: the post's choices, or what the layout would pick for it.
  if (post.author) html = html.replace(/(<p class="post-meta"[^>]*>\s*<span[^>]*>)By [^<]*/, '$1KCUPLOAD-BYLINE');
  const auto = autoLinks(`${post.headline} ${clip(post.summary, 160)}`, post.category);
  const keep = (attr: string, ids: string[]) => {
    const items = new Map([...html.matchAll(new RegExp(`<li ${attr}="([a-z-]+)"[^>]*>[\\s\\S]*?</li>`, 'g'))].map((m) => [m[1], m[0]]));
    let first = true;
    html = html.replace(new RegExp(`\\s*<li ${attr}="[a-z-]+"[^>]*>[\\s\\S]*?</li>`, 'g'), () => (first ? ((first = false), ids.map((id) => items.get(id) ?? '').join('')) : ''));
  };
  const hoods = post.related.length ? post.related : auto.hoods;
  keep('data-hood', hoods);
  const photos = JSON.parse(html.match(/<template data-hood-photos="([^"]*)"><\/template>/)?.[1].replace(/&#34;|&quot;/g, '"').replace(/&amp;/g, '&') ?? '{}');
  html = html.replace(/\s*<template data-hood-photos="[^"]*"><\/template>/, '');
  const share = hoods.length === 1 ? photos[hoods[0]] : undefined;
  const defaultShare = html.match(/<meta property="og:image" content="([^"]*)"/)?.[1] ?? '';
  const shareUrl = share ? new URL(share, defaultShare).href : '';
  if (shareUrl) html = html.replace(/(<meta (?:property="og:image"|name="twitter:image") content=")[^"]*/g, `$1${shareUrl}`);
  keep('data-service', post.relatedServices.length ? post.relatedServices : auto.services);
  html = html.replace(/<section class="post-links"[\s\S]*?<\/section>/, (s) => (s.includes('<li') ? s : ''));
  if (!post.quickAnswer) html = html.replace(/<div class="takeaway"[^>]*>[\s\S]*?<\/div>/, '');
  html = post.faq.length
    ? repeat(/<details class="faq__item"[\s\S]*?<\/details>/, post.faq.length, 'KCUPLOAD-FAQ')(html)
    : html.replace(/<section class="faq"[\s\S]*?<\/section>/, '');
  html = post.sources.length
    ? repeat(/<li[^>]*>\s*<a href="KCUPLOAD-SRCURL"[\s\S]*?<\/li>/, post.sources.length, 'KCUPLOAD-SRC')(html.replace('https://kcupload.invalid/', 'KCUPLOAD-SRCURL'))
    : html.replace(/<section class="post-sources"[\s\S]*?<\/section>/, '');
  const tocItems = /(<li[^>]*>\s*<a href="#KCUPLOAD-TOCID"[\s\S]*?<\/li>\s*){3}/;
  html = headings.length > 2
    ? html.replace(tocItems, (three) => repeat(/^[\s\S]*$/, headings.length, 'KCUPLOAD-TOC')(three.match(/<li[\s\S]*?<\/li>/)![0]))
    : html.replace(/<nav class="toc"[\s\S]*?<\/nav>/, '');

  // Structured data is rebuilt as objects, then held aside so the single pass below skips it.
  const values: Record<string, string> = {
    'KCUPLOAD-HONE': post.headline,
    'KCUPLOAD-TITLE': clip(post.headline, 60),
    'KCUPLOAD-DESC': clip(post.summary, 160),
    'KCUPLOAD-SUB': post.summary,
    'KCUPLOAD-TAKEAWAY': post.quickAnswer || post.summary,
    'KCUPLOAD-MIN': String(readingMinutes(words)),
    'KCUPLOAD-BYLINE': `By ${post.authorTitle ? `${post.author}, ${post.authorTitle}` : post.author}`,
    'KCUPLOAD-DATE': longDate(published),
    'KCUPLOAD-ISO': published.toISOString(),
  };
  post.faq.forEach((f, i) => Object.assign(values, { [`KCUPLOAD-FAQQ-${i}`]: f.q, [`KCUPLOAD-FAQA-${i}`]: f.a }));
  post.sources.forEach((s, i) => Object.assign(values, { [`KCUPLOAD-SRCNAME-${i}`]: s.name, [`KCUPLOAD-SRCURL-${i}`]: s.url }));
  headings.forEach((h, i) => Object.assign(values, { [`KCUPLOAD-TOCID-${i}`]: h.id, [`KCUPLOAD-TOCTEXT-${i}`]: h.text }));

  const ld: string[] = [];
  const swap = (s: string) =>
    s === SHELL_DATE.toISOString() ? values['KCUPLOAD-ISO']
    : s === SHELL_DATE.toISOString().slice(0, 10) ? values['KCUPLOAD-ISO'].slice(0, 10)
    : s.replace(/KCUPLOAD-[A-Z]+/g, (t) => values[t] ?? t);
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return swap(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const o = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
      if (o['@type'] === 'FAQPage') o.mainEntity = post.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }));
      if (o['@type'] === 'BlogPosting') {
        o.wordCount = words;
        if (shareUrl) o.image = shareUrl;
        if (post.author) o.author = { '@type': 'Person', name: post.author, worksFor: { '@id': (o.publisher as { '@id': string })['@id'] } };
      }
      return o;
    }
    return v;
  };
  html = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (_m, open, json, close) => {
    const data = JSON.parse(json);
    if (data['@type'] === 'FAQPage' && !post.faq.length) return '';
    ld.push(open + JSON.stringify(walk(data)).replace(/</g, '\\u003c') + close);
    return `KCUPLOAD-LD-${ld.length - 1}`;
  });

  html = html.replaceAll(SHELL_DATE.toISOString(), 'KCUPLOAD-ISO').replaceAll(longDate(SHELL_DATE), 'KCUPLOAD-DATE');
  return html.replace(TOKEN, (t) => {
    if (t === 'KCUPLOAD-BODY') return body;
    if (t.startsWith('KCUPLOAD-LD-')) return ld[Number(t.slice(12))];
    return t in values ? esc(values[t]) : t;
  });
}

/** Asks Cloudflare for a fresh build, so the blog list, sitemap and feed catch up within minutes. */
export async function rebuild(env: UploadEnv) {
  const hook = env.DEPLOY_HOOK_URL?.trim();
  if (hook?.startsWith('https://api.cloudflare.com/')) await fetch(hook, { method: 'POST' }).catch(() => undefined);
}

// Self-check: node --experimental-strip-types src/lib/uploads.ts
if (typeof process !== 'undefined' && !!import.meta.filename && import.meta.filename === process.argv[1]) {
  const assert = (c: unknown, m: string) => {
    if (!c) throw new Error(m);
  };
  const words = Array.from({ length: 120 }, () => 'home').join(' ');
  const p = cleanPost({
    headline: 'Living near Line 5 in Toronto',
    summary: 'What buyers ask about homes near the new Line 5 Eglinton stations in Toronto.',
    slug: 'living-near-line-5',
    category: 'neighbourhoods',
    markdown: `## One\n\n${words} <script>x</script> [bad](javascript:alert(1)) [ok](/sold/)\n\n## Two\n\n## Two`,
  }) as Post;
  assert(typeof p === 'object', 'valid post accepted');
  assert(!p.markdown.includes('<script') && p.markdown.includes('](#)') && p.markdown.includes('](/sold/)'), 'raw HTML and unsafe links removed');
  const { html, headings } = renderBody(p.markdown);
  assert(headings.map((h) => h.id).join() === 'one,two,two-1', 'heading ids match Astro');
  assert(!/<script|javascript:/.test(html), 'rendered body is safe');
  assert(typeof cleanPost({ ...p, category: 'nope' }) === 'string', 'bad category refused');
  console.log('uploads ok');
}
