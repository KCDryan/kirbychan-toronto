/**
 * Turns a service page published at /uploadservice/ into the file the build reads
 * (src/content/services/<slug>.mdx), and decides whether the build may have it at all.
 *
 * A generated page must never stop the site from building, so before one is written it is checked
 * against the services collection's own rules (src/content.config.ts) and the house style check
 * (scripts/check-style.mjs). A page that fails is skipped and the reason is logged: it stays in the
 * database and the owner can change it. Plain JavaScript, so the build can run it without compiling.
 *
 * Self-check: node scripts/service-mdx.mjs
 */

/** The rules scripts/check-style.mjs applies to content files. Keep the two in step. */
const STYLE = [
  ['long dash', /[–—]/],
  ['comma before and or or', /,\s+(and|or)\b/],
  ['contrast phrase', /\b(not just|isn't just|is not just|not only|not simply|more than just|isn't about|is not about|it's not about)\b/i],
  ['American spelling', /\b(neighborhoods?|favorites?|behaviors?|honors?|labors?|organizations?|realized?|analyzed?|centers?|colors?)\b/i],
];

export function styleProblem(text) {
  for (const [name, re] of STYLE) {
    const m = text.match(re);
    if (m) return `${name}: "${m[0]}"`;
  }
  return '';
}

const str = (v) => typeof v === 'string';

/** The services collection's rules, as one plain English problem or an empty string. */
export function schemaProblem(slug, p) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 60) return 'the web address is not valid';
  if (!p || typeof p !== 'object') return 'no page';
  for (const k of ['name', 'h1', 'title', 'description', 'summary', 'problem']) if (!str(p[k]) || !p[k].trim()) return `${k} is missing`;
  if (!str(p.accent ?? '')) return 'accent is not text';
  if (p.title.length > 60) return `the title is ${p.title.length} characters, over 60`;
  if (p.description.length < 140 || p.description.length > 168) return `the description is ${p.description.length} characters, not 140 to 168`;
  if (!Array.isArray(p.steps) || p.steps.length < 3 || p.steps.some((s) => !str(s?.title) || !str(s?.body))) return 'it needs at least 3 steps with a title and a body';
  if (!Array.isArray(p.faq) || p.faq.some((f) => !str(f?.q) || !str(f?.a))) return 'the questions are not valid';
  if (!Array.isArray(p.related_posts ?? []) || (p.related_posts ?? []).some((u) => !str(u))) return 'the related posts are not valid';
  const words = [p.problem, ...p.steps.map((s) => s.body), p.body ?? '', ...p.faq.map((f) => f.a)].join(' ').split(/\s+/).filter(Boolean).length;
  if (words < 300) return `the page has ${words} words, under the 300 word minimum for a page search engines may index`;
  return '';
}

const q = (v) => JSON.stringify(v);

/**
 * The generated file. `order` puts generated pages after the hand written ones on the services grid.
 * uploadVersion marks the file as generated, so the build never overwrites or deletes one it did not make.
 */
export function toMdx(slug, page, updated, order) {
  return [
    '---',
    `name: ${q(page.name)}`,
    `h1: ${q(page.h1)}`,
    `accent: ${q(page.accent ?? '')}`,
    `title: ${q(page.title)}`,
    `description: ${q(page.description)}`,
    `order: ${order}`,
    `summary: ${q(page.summary)}`,
    `problem: ${q(page.problem)}`,
    `steps: ${q(page.steps.map((s) => ({ title: s.title, body: s.body })))}`,
    `faq: ${q(page.faq.map((f) => ({ q: f.q, a: f.a })))}`,
    `relatedPosts: ${q(page.related_posts ?? [])}`,
    `keywords: ${q(page.focus_keyword ? [page.focus_keyword] : [])}`,
    `proofHood: ${q(page.proof_hood ?? '')}`,
    `proof: ${q(page.proof ?? '')}`,
    `uploadVersion: ${q(String(updated))}`,
    '---',
    '',
    // MDX reads braces as code.
    (page.body ?? '').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;'),
    '',
  ].join('\n');
}

const isMain = typeof process !== 'undefined' && !!import.meta.filename && import.meta.filename === process.argv[1];
if (isMain) {
  const assert = (c, m) => {
    if (!c) throw new Error(m);
  };
  const page = {
    name: 'Pre-construction assignment sales',
    h1: 'Selling a pre-construction condo assignment in Toronto',
    accent: 'assignment',
    title: 'Pre-Construction Assignment Sales in Toronto',
    description: 'How we help an owner sell a pre-construction condo before closing: reading the builder agreement, pricing the assignment and finding a buyer in Toronto.',
    summary: 'How we help an owner sell a pre-construction condo assignment before it closes.',
    problem: 'An owner who bought pre-construction may need to sell before the building closes. The builder agreement sets the rules and the next steps depend on it.',
    steps: [1, 2, 3].map((i) => ({ title: `Step ${i}`, body: `The body of step ${i}, written out in a full sentence for the reader to follow.` })),
    body: 'A paragraph with {braces} and a [link](/downsizing-toronto/). ' + 'A plain sentence about how the work goes. '.repeat(60),
    faq: [1, 2, 3].map((i) => ({ q: `Question ${i}?`, a: `A full answer to question ${i}, in plain words.` })),
    focus_keyword: 'pre-construction assignment toronto',
    related_posts: ['/blog/stay-or-sell-toronto-house/'],
    proof_hood: '/leaside-toronto/',
    proof: 'Leaside has its own shops and a short drive to the downtown core.',
  };
  assert(schemaProblem('pre-construction-assignment', page) === '', schemaProblem('x-y', page));
  assert(schemaProblem('Bad Slug', page).includes('web address'), 'slug rule');
  assert(schemaProblem('ok', { ...page, title: 'x'.repeat(61) }).includes('over 60'), 'title rule');
  assert(schemaProblem('ok', { ...page, steps: page.steps.slice(0, 2) }).includes('3 steps'), 'steps rule');
  assert(schemaProblem('ok', { ...page, body: 'Short.' }).includes('300 word'), 'length rule');
  const mdx = toMdx('x', page, 123, 101);
  assert(mdx.startsWith('---\nname: "Pre-construction assignment sales"\n') && mdx.includes('uploadVersion: "123"') && mdx.includes('order: 101'), 'front matter');
  assert(mdx.includes('proofHood: "/leaside-toronto/"'), 'proof block saved');
  assert(mdx.includes('&#123;braces&#125;') && !mdx.includes('{braces}'), 'braces are safe');
  assert(styleProblem(mdx) === '', styleProblem(mdx));
  assert(styleProblem('We sell it, and more').includes('comma'), 'comma rule');
  assert(styleProblem('It is not only a sale').includes('contrast'), 'contrast rule');
  assert(styleProblem('A great neighborhood').includes('American'), 'spelling rule');
  console.log('service-mdx ok');
}
