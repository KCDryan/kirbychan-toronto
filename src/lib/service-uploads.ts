/**
 * Service pages written in the chat at /uploadservice/ (see functions/api/uploadservice/[action].ts).
 *
 * A page is saved in the database when it is published and written into the build as
 * src/content/services/<slug>.mdx by scripts/pull-uploads.mjs, so it is built, listed and put in the
 * sitemap like a service page written by hand. Everything here is pure so it can be checked without a
 * database. Nothing that passes cleanServiceUpload can stop the site from building: the length rules
 * are the services collection's own, the house style is applied here, and a link that is not one of
 * the site's own pages is removed.
 */
import { renderBody } from './uploads.ts';

export interface ServicePage {
  name: string;
  h1: string;
  accent: string;
  title: string;
  description: string;
  summary: string;
  problem: string;
  steps: { title: string; body: string }[];
  body: string;
  faq: { q: string; a: string }[];
  focus_keyword: string;
  /** Addresses of the site's own blog posts, as /blog/<slug>/. */
  related_posts: string[];
  /** Address of the neighbourhood guide the proof block is about, as /<id>-toronto/. */
  proof_hood: string;
  /** The proof block: what the site's guide to that neighbourhood says that matters to this service. */
  proof: string;
}

export interface ServiceRecord {
  slug: string;
  page: ServicePage;
  draft: boolean;
  published: number;
  updated: number;
}

/** A page of the site the writer may link to, from /uploadservice/catalog.json and the database. */
export interface CatalogLink {
  url: string;
  title: string;
  kind: string;
  note?: string;
}

/** Addresses under /services/ that are never a service page. */
export const RESERVED = ['index', 'upload-shell', 'catalog', 'reserved'];

const one = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

const SPELLING: [RegExp, string][] = [
  [/\bneighborhood(s?)\b/g, 'neighbourhood$1'],
  [/\bNeighborhood(s?)\b/g, 'Neighbourhood$1'],
  [/\bfavorite(s?)\b/g, 'favourite$1'],
  [/\bFavorite(s?)\b/g, 'Favourite$1'],
  [/\bbehavior(s?)\b/g, 'behaviour$1'],
  [/\bhonor(s?)\b/g, 'honour$1'],
  [/\blabor(s?)\b/g, 'labour$1'],
  [/\borganization(s?)\b/g, 'organisation$1'],
  [/\bOrganization(s?)\b/g, 'Organisation$1'],
  [/\brealized\b/g, 'realised'],
  [/\brealize\b/g, 'realise'],
  [/\banalyze(s?)\b/g, 'analyse$1'],
  [/\banalyzed\b/g, 'analysed'],
  [/\bcenter(s?)\b/g, 'centre$1'],
  [/\bCenter(s?)\b/g, 'Centre$1'],
  [/\bcolor(s?)\b/g, 'colour$1'],
];

/** The house style the build enforces, applied to text: Canadian spelling, no long dashes, no comma before "and" or "or", no exclamation marks. */
export function house(text: string): string {
  let out = text
    .replace(/(\d)\s*[–—]\s*(\d)/g, '$1 to $2')
    .replace(/\s*[–—]\s*/g, ', ')
    .replace(/,(\s+)(and|or)\b/g, '$1$2')
    .replace(/!/g, '.');
  for (const [re, to] of SPELLING) out = out.replace(re, to);
  return out;
}

/** Phrases the build's style check rejects in pages like this one. */
/** Grounds the Ontario Human Rights Code protects: a page describes homes and situations, never the kind of person a service is for. */
export const PROTECTED = /\b(seniors?|elderly|retirees?|retired (?:people|couples)|older (?:adults|people|buyers|owners)|young (?:families|couples|professionals|buyers)|families|singles|newcomers|immigrants|empty nesters?|couples)\b/i;

const wordsIn = (t: string) => t.split(/\s+/).filter(Boolean).length;

export const CONTRAST = /\b(not just|isn't just|is not just|not only|not simply|more than just|isn't about|is not about|it's not about)\b/i;

/** The path of a link: no origin, query, fragment or trailing slash. */
const norm = (url: string) => url.replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/)[0].replace(/\/+$/, '') || '/';

/** Markdown with no raw HTML and no link that is not one of the site's own pages. Link addresses are never touched by the house style. */
export function safeBody(markdown: string, allowed: Set<string>): string {
  const kept: string[] = [];
  const parked = markdown.replace(/\]\(([^)]*)\)/g, (_m, url) => (kept.push(url), `]@@LINK${kept.length - 1}@@`));
  const styled = house(parked).replace(/(^|[^\\])</g, '$1&lt;').replace(/\bhttps?:\/\/\S+/g, '');
  return styled
    .replace(/\[([^\]]+)\]@@LINK(\d+)@@/g, (_m, text, i) => {
      const url = kept[Number(i)].trim().replace(/^<|>$/g, '').split(/\s/)[0];
      if (url.startsWith('#')) return `[${text}](${url})`;
      return allowed.has(norm(url)) ? `[${text}](${norm(url)}/)` : text;
    })
    .replace(/@@LINK\d+@@/g, '');
}

export const slugFor = (name: string) =>
  name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');

/**
 * Checks a page sent from /uploadservice/ and makes it safe. Returns the page, or a plain English
 * problem for the person publishing. The rules are the services collection's, so a saved page can
 * never stop the next build.
 */
export function cleanServiceUpload(raw: unknown, catalog: CatalogLink[]): ServicePage | string {
  const r = (raw ?? {}) as Record<string, unknown>;
  const allowed = new Set([...catalog.map((l) => norm(l.url)), '/contact']);
  const posts = new Set(catalog.filter((l) => l.kind === 'post').map((l) => norm(l.url)));
  const name = house(one(r.name, 80));
  const h1 = house(one(r.h1, 120));
  const title = house(one(r.title, 80));
  const description = house(one(r.description, 220));
  const summary = house(one(r.summary, 260));
  const problem = house(one(r.problem, 1200));
  if (name.length < 3 || name.length > 60) return `The service name must be 3 to 60 characters. It is ${name.length}.`;
  if (h1.length < 20 || h1.length > 90) return `The heading must be 20 to 90 characters. It is ${h1.length}.`;
  if (title.length < 20 || title.length > 60) return `The search title must be 20 to 60 characters. It is ${title.length}.`;
  if (description.length < 140 || description.length > 168) return `The search description must be 140 to 168 characters. It is ${description.length}.`;
  if (summary.length < 30 || summary.length > 200) return `The one line summary must be 30 to 200 characters. It is ${summary.length}.`;
  const introWords = wordsIn(problem);
  if (introWords < 110 || introWords > 190) return `The introduction is ${introWords} words. It needs 110 to 190 words (about 150). Ask for it to answer the search in the first sentences.`;
  const keyword = house(one(r.focus_keyword, 80));
  const kw = keyword.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  if (!kw.length) return 'The page needs a focus keyword.';
  const inH1 = kw.filter((w) => h1.toLowerCase().includes(w)).length;
  if (inH1 < Math.ceil(kw.length * 0.7)) return `The heading must contain the focus keyword "${keyword}". Ask for the heading to use it.`;
  const steps = (Array.isArray(r.steps) ? r.steps : [])
    .slice(0, 6)
    .map((s) => ({ title: house(one((s as Record<string, unknown>)?.title, 90)), body: house(one((s as Record<string, unknown>)?.body, 600)) }))
    .filter((s) => s.title && s.body.length >= 30);
  if (steps.length < 3) return 'The page needs at least 3 steps, each with a title and a body of at least 30 characters.';
  const faq = (Array.isArray(r.faq) ? r.faq : [])
    .slice(0, 6)
    .map((f) => ({ q: house(one((f as Record<string, unknown>)?.q, 300)), a: house(one((f as Record<string, unknown>)?.a, 1000)) }))
    .filter((f) => f.q.endsWith('?') && f.a.length >= 20);
  if (faq.length < 3) return 'The page needs at least 3 questions that end in a question mark, each with an answer.';
  const hood = typeof r.proof_hood === 'string' ? norm(r.proof_hood) : '';
  if (!catalog.some((l) => l.kind === 'neighbourhood' && norm(l.url) === hood)) return 'The neighbourhood block must be about one of the site\'s neighbourhood guides. Ask for it to name one.';
  const proof = house(one(r.proof, 1100));
  const proofWords = wordsIn(proof);
  if (proofWords < 40 || proofWords > 130) return `The neighbourhood block is ${proofWords} words. It needs 40 to 130.`;
  const accent = one(r.accent, 60);
  const body = safeBody(typeof r.body === 'string' ? r.body.trim().slice(0, 9000) : '', allowed);
  const words = [problem, proof, ...steps.map((s) => s.body), body, ...faq.map((f) => f.a)].join(' ').split(/\s+/).filter(Boolean).length;
  if (words < 350) return `The page is too short: ${words} words. It needs at least 350 words across the problem, steps, body and answers. Ask for a longer body.`;
  const person = [problem, proof, body, ...steps.flatMap((s) => [s.title, s.body]), ...faq.flatMap((f) => [f.q, f.a])].join('\n').match(PROTECTED)?.[0];
  if (person) return `The page names "${person}". Describe the situation, the home or the service instead of the kind of person it is for. Ask for that sentence to be reworded.`;
  if ((body.match(/^## /gm) ?? []).length < 2) return 'The body needs at least two ## headings: when the service applies, and local specifics.';
  const contrast = [name, h1, title, description, summary, problem, proof, body, ...steps.flatMap((s) => [s.title, s.body]), ...faq.flatMap((f) => [f.q, f.a])].join('\n').match(CONTRAST)?.[0];
  if (contrast) return `The page uses "${contrast}", which the site's style check does not allow. Ask for that sentence to be reworded.`;
  const related = [...new Set(Array.isArray(r.related_posts) ? r.related_posts : [])]
    .map((u) => (typeof u === 'string' ? norm(u) : ''))
    .filter((u) => posts.has(u))
    .map((u) => `${u}/`)
    .slice(0, 4);
  return {
    name,
    h1,
    accent: h1.includes(accent) ? accent : '',
    title,
    description,
    summary,
    problem,
    steps,
    body,
    faq,
    focus_keyword: house(one(r.focus_keyword, 80)),
    related_posts: related,
    proof_hood: `${hood}/`,
    proof,
  };
}

/** The empty page built at /services/upload-shell/ (src/pages/services/upload-shell/index.astro). */
export const SERVICE_SHELL = '/services/upload-shell/';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * Pours a service page into the built shell page. Surplus steps and questions are removed first, then
 * every mark is replaced in one pass, so nothing in the page itself is ever read as a mark.
 * `related` are the blog posts the page chose, listed under "Go deeper" until the next build adds the cards.
 */
export function fillServiceShell(shell: string, slug: string, page: ServicePage, updated: number, related: CatalogLink[] = []): string {
  const path = `/services/${slug}/`;
  const keep = (re: RegExp, n: number) => {
    let i = 0;
    return (html: string) => html.replace(re, (block) => (i++ < n ? block : ''));
  };
  const values: Record<string, string> = {
    'KCSVC-NAME': page.name,
    'KCSVC-H1': page.h1,
    'KCSVC-SUMMARY': page.summary,
    'KCSVC-PROBLEM': page.problem,
    'KCSVC-TITLE': page.title,
    'KCSVC-DESC': page.description,
  };
  page.steps.forEach((s, i) => ((values[`KCSVC-ST${i}`] = s.title), (values[`KCSVC-SB${i}`] = s.body)));
  page.faq.forEach((f, i) => ((values[`KCSVC-FQ${i}`] = f.q), (values[`KCSVC-FA${i}`] = f.a)));

  let html = shell
    .replaceAll(SERVICE_SHELL, path)
    .replace(/\s*<meta name="robots" content="noindex"\s*\/?>/, '')
    .replace('data-upload=""', `data-upload="${updated}"`);
  html = keep(/<li class="step"[^>]*>[\s\S]*?<\/li>/g, page.steps.length)(html);
  html = keep(/<details class="faq__item"[^>]*>[\s\S]*?<\/details>/g, page.faq.length)(html);
  const links = related.map((l) => `<a href="${esc(l.url)}">${esc(l.title)}</a>`).join(', ');
  html = html.replace(
    /<template data-kcsvc-related[^>]*><\/template>/,
    links ? `<section class="section"><div class="wrap"><div class="section-head"><p class="eyebrow">Go deeper</p><h2>Reading on ${esc(page.name.toLowerCase())}</h2></div><p>${links}.</p></div></section>` : '',
  );

  // The proof block: the photo of the neighbourhood the page names, as the build would show it.
  const photos = JSON.parse((html.match(/<template data-kcsvc-photos="([^"]*)"><\/template>/)?.[1] ?? '{}').replace(/&#34;|&quot;/g, '"').replace(/&amp;/g, '&')) as Record<string, { name: string; src: string; og: string; alt: string; credit?: { author: string; source: string; license: string; licenseUrl: string } }>;
  html = html.replace(/\s*<template data-kcsvc-photos="[^"]*"><\/template>/, '');
  const hood = photos[page.proof_hood.match(/^\/([a-z0-9-]+)-toronto\/$/)?.[1] ?? ''];
  if (hood && page.proof) {
    Object.assign(values, { 'KCSVC-PNAME': hood.name, 'KCSVC-PTEXT': page.proof, 'KCSVC-PURL': page.proof_hood, 'KCSVC-PSRC': hood.src, 'KCSVC-PALT': hood.alt, 'KCSVC-PCA': hood.credit?.author ?? '', 'KCSVC-PCS': hood.credit?.source ?? '', 'KCSVC-PCL': hood.credit?.license ?? '', 'KCSVC-PCU': hood.credit?.licenseUrl ?? '' });
    if (!hood.credit) html = html.replace(/\s*<figcaption>[\s\S]*?<\/figcaption>/, '');
    if (!hood.src) html = html.replace(/\s*<figure class="svc-proof__photo"[^>]*>[\s\S]*?<\/figure>/, '');
    if (hood.og) {
      const share = new URL(hood.og, html.match(/<meta property="og:image" content="([^"]*)"/)?.[1] ?? 'https://kirbychantoronto.com/').href;
      html = html.replace(/(<meta (?:property="og:image"|name="twitter:image") content=")[^"]*/g, `$1${share}`);
    }
  } else {
    html = html.replace(/\s*<section class="section" data-proof[^>]*>[\s\S]*?<\/section>/, '');
  }

  const swap = (s: string) => s.replace(/KCSVC-[A-Z]+\d*/g, (t) => values[t] ?? t);
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return swap(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const o = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
      if (o['@type'] === 'FAQPage') o.mainEntity = page.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }));
      return o;
    }
    return v;
  };
  const ld: string[] = [];
  html = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (_m, open, json, close) => {
    ld.push(open + JSON.stringify(walk(JSON.parse(json))).replace(/</g, '\\u003c') + close);
    return `KCSVC-LD${ld.length - 1}`;
  });
  const body = renderBody(page.body).html;
  return html.replace(/KCSVC-[A-Z]+\d*/g, (t) => {
    if (t === 'KCSVC-BODY') return body;
    if (t.startsWith('KCSVC-LD')) return ld[Number(t.slice(8))] ?? '';
    return t in values ? esc(values[t]) : t;
  });
}

// Self-check: node --experimental-strip-types src/lib/service-uploads.ts
if (typeof process !== 'undefined' && !!import.meta.filename && import.meta.filename === process.argv[1]) {
  const assert = (c: unknown, m: string) => {
    if (!c) throw new Error(m);
  };
  const catalog: CatalogLink[] = [
    { url: '/blog/stay-or-sell-toronto-house/', title: 'Stay or sell', kind: 'post' },
    { url: '/downsizing-toronto/', title: 'Downsizing guide', kind: 'guide' },
    { url: '/leaside-toronto/', title: 'Leaside', kind: 'neighbourhood' },
  ];
  const page = {
    name: 'Pre-construction assignment sales',
    h1: 'Selling a pre-construction condo assignment in Toronto',
    accent: 'assignment',
    title: 'Pre-Construction Assignment Sales in Toronto',
    description: 'How we help an owner sell a pre-construction condo before closing: reading the builder agreement, pricing the assignment, and finding a buyer in Toronto.',
    summary: 'How we help an owner sell a pre-construction condo assignment before it closes.',
    problem: 'A plain sentence about how the work goes, for a reader who wants to know. '.repeat(10).trim(),
    proof_hood: '/leaside-toronto/',
    proof: 'Leaside has its own shops and a short drive to the downtown core. The neighbourhood guide lists the streets, the transit and the commute a reader can check before deciding where to start. Read that guide, then ask what the homes on those streets have sold for.',
    steps: [1, 2, 3].map((i) => ({ title: `Step ${i} title`, body: `The body of step number ${i}, written out in a full sentence for the reader.` })),
    body: '## When it applies\nSee [the guide](/downsizing-toronto/), [a post](/blog/stay-or-sell-toronto-house/), [other](https://evil.example/x) and <b>bold</b>. A neighborhood {thing} — 3–5 weeks, and more!\n\n## Local specifics\n' + 'A plain sentence about how the work goes, for a reader who wants to know. '.repeat(40),
    faq: [1, 2, 3].map((i) => ({ q: `Question ${i}?`, a: `A full answer number ${i} for this question, in plain words.` })),
    focus_keyword: 'pre-construction assignment toronto',
    related_posts: ['/blog/stay-or-sell-toronto-house/', '/blog/not-listed/'],
  };
  const out = cleanServiceUpload(page, catalog);
  assert(typeof out !== 'string', String(out));
  const ok = out as ServicePage;
  assert(ok.body.includes('[the guide](/downsizing-toronto/)') && ok.body.includes('[a post](/blog/stay-or-sell-toronto-house/)'), 'listed links kept');
  assert(!ok.body.includes('evil.example') && ok.body.includes('other') && !ok.body.includes('<b>'), 'other links and html removed');
  assert(ok.body.includes('neighbourhood') && ok.body.includes('3 to 5 weeks') && !ok.body.includes('!'), 'house style applied');
  assert(JSON.stringify(ok.related_posts) === '["/blog/stay-or-sell-toronto-house/"]', 'only listed posts');
  assert(typeof cleanServiceUpload({ ...page, steps: [] }, catalog) === 'string', 'steps needed');
  assert(typeof cleanServiceUpload({ ...page, description: 'x' }, catalog) === 'string', 'description length');
  assert(String(cleanServiceUpload({ ...page, body: '## A\nShort.\n\n## B\nShort.' }, catalog)).includes('too short'), 'length');
  assert(String(cleanServiceUpload({ ...page, summary: 'This is not only a sale but a plan for the whole move.' }, catalog)).includes('not only'), 'contrast phrase');
  assert(String(cleanServiceUpload({ ...page, problem: 'Short.' }, catalog)).includes('introduction'), 'intro length');
  assert(String(cleanServiceUpload({ ...page, h1: 'Selling a home calmly and quickly' }, catalog)).includes('focus keyword'), 'keyword in heading');
  assert(String(cleanServiceUpload({ ...page, proof_hood: '/downsizing-toronto/' }, catalog)).includes('neighbourhood'), 'proof must be a neighbourhood');
  assert(String(cleanServiceUpload({ ...page, body: page.body + ' It suits young families.' }, catalog)).includes('young families'), 'no type of person');
  assert(ok.proof_hood === '/leaside-toronto/', 'proof saved');
  assert(slugFor('Pre-construction Assignment Sales!') === 'pre-construction-assignment-sales', 'slug');
  console.log('service-uploads ok');
}
