/**
 * Writes the posts uploaded at /upload/ into src/content/blog/quick/ as .md files, so the build
 * puts them in the blog list, category pages, sitemap and RSS feed. They are already live before
 * this runs (functions/blog/[[path]].ts). Runs only in the Cloudflare build, which is a throwaway
 * checkout, so nothing is ever committed. A failure here never stops the build: the posts stay
 * live and the next build tries again.
 */
import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { schemaProblem, styleProblem, toMdx } from './service-mdx.mjs';
import site from '../src/data/site.json' with { type: 'json' };

const DIR = 'src/content/blog/quick';
const q = (v) => JSON.stringify(v); // JSON strings are valid YAML

try {
  const res = await fetch(`${site.url}/api/upload/export`, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { posts } = await res.json();
  let n = 0;
  for (const p of posts) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug) || existsSync(`${DIR}/${p.slug}.mdx`)) continue;
    const lines = [
      '---',
      `headline: ${q(p.headline)}`,
      `summary: ${q(p.summary)}`,
      `category: ${q(p.category)}`,
      `published: ${q(new Date(p.published).toISOString())}`,
      ...(p.updated - p.published > 864e5 ? [`updated: ${q(new Date(p.updated).toISOString())}`] : []),
      ...(p.quickAnswer ? [`quickAnswer: ${q(p.quickAnswer)}`] : []),
      `faq: ${q(p.faq)}`,
      `sources: ${q(p.sources)}`,
      ...(p.author ? [`author: ${q(p.author)}`] : []),
      ...(p.author && p.authorTitle ? [`authorTitle: ${q(p.authorTitle)}`] : []),
      `related: ${q(p.related ?? [])}`,
      `relatedServices: ${q(p.relatedServices ?? [])}`,
      `uploadVersion: ${q(String(p.updated))}`,
      '---',
      '',
      p.markdown,
      '',
    ];
    writeFileSync(`${DIR}/${p.slug}.md`, lines.join('\n'));
    n++;
  }
  console.log(`Uploaded posts: ${n} added to the build.`);
} catch (e) {
  console.warn(`WARNING: could not fetch uploaded posts (${e.message}). They stay live and the next build adds them.`);
}

// Service pages published at /uploadservice/ become src/content/services/<slug>.mdx, so they are built,
// listed and in the sitemap like a page written by hand. Each page is checked first (see
// scripts/service-mdx.mjs): one that would stop the build is skipped and the reason is logged. A file
// this script did not make is never overwritten or deleted: generated files carry uploadVersion.
const SERVICES = 'src/content/services';
try {
  const res = await fetch(`${site.url}/api/uploadservice/export`, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { services } = await res.json();
  const generated = (file) => readFileSync(`${SERVICES}/${file}`, 'utf8').includes('\nuploadVersion:');
  const redirects = existsSync('public/_redirects') ? readFileSync('public/_redirects', 'utf8') : '';
  const live = new Set();
  let n = 0;
  [...services].sort((a, b) => a.published - b.published).forEach((svc, i) => {
    const file = `${svc.slug}.mdx`;
    const bad =
      schemaProblem(svc.slug, svc.page) ||
      (existsSync(`${SERVICES}/${file}`) && !generated(file) ? 'a service page written by hand has that address' : '') ||
      (new RegExp(`^/services/${svc.slug}/\\s`, 'm').test(redirects) ? 'that address is redirected elsewhere' : '');
    const mdx = bad ? '' : toMdx(svc.slug, svc.page, svc.updated, 100 + i);
    const style = mdx ? styleProblem(mdx) : '';
    if (bad || style) return console.warn(`Service page ${svc.slug} skipped: ${bad || style}.`);
    writeFileSync(`${SERVICES}/${file}`, mdx);
    live.add(file);
    n++;
  });
  // A page taken down since the file was written: only generated files are ever removed.
  for (const file of readdirSync(SERVICES)) if (file.endsWith('.mdx') && !live.has(file) && generated(file)) unlinkSync(`${SERVICES}/${file}`);
  console.log(`Uploaded service pages: ${n} added to the build.`);
} catch (e) {
  console.warn(`WARNING: could not fetch uploaded service pages (${e.message}). They stay saved and the next build adds them.`);
}
