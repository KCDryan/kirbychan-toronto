/**
 * The site's own pages, each with a line on what it says, for the service page writer
 * (functions/api/uploadservice/[action].ts reads this file and adds anything published since the build).
 * The writer may link only to these addresses and may state only what they say. Also lists the service
 * addresses a new service page may not take. Built with the site; /uploadservice/ is not for search engines.
 */
import { readFileSync } from 'node:fs';
import { getCollection } from 'astro:content';
import { publishedPosts } from '../../lib/blog-posts';
import { neighbourhoodPath } from '../../lib/format';
import { servicePath } from '../../lib/guides';

const clip = (s: string, n = 300) => (s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, ''));

const PAGES = [
  { url: '/buyers/', title: 'Buying a home in Toronto', kind: 'page', note: 'How we work with buyers in Toronto.' },
  { url: '/sellers/', title: 'Selling a home in Toronto', kind: 'page', note: 'How we work with sellers in Toronto.' },
  { url: '/home-valuation/', title: 'Free home valuation', kind: 'tool', note: 'Ask what a Toronto home could sell for.' },
  { url: '/toronto-house-prices/', title: 'Toronto house prices', kind: 'page', note: "TRREB's latest figures by property type, and how Toronto compares with nearby cities." },
  { url: '/land-transfer-tax-calculator-toronto/', title: 'Toronto land transfer tax calculator', kind: 'tool', note: 'Works out the Ontario and the City of Toronto land transfer tax on a purchase.' },
  { url: '/mortgage-calculator-toronto/', title: 'Toronto mortgage calculator', kind: 'tool', note: 'Estimates a monthly mortgage payment.' },
  { url: '/neighbourhoods/', title: 'Toronto neighbourhood guides', kind: 'page', note: 'Guides to eighteen Toronto neighbourhoods.' },
  { url: '/services/', title: 'How we work', kind: 'page', note: 'The situations we help with.' },
  { url: '/homes-for-sale/', title: 'Toronto homes for sale', kind: 'tool', note: 'Search current Toronto listings.' },
  { url: '/sold/', title: 'Toronto sold prices', kind: 'tool', note: 'What Toronto homes sold for, for registered visitors.' },
  { url: '/market-reports/', title: 'Toronto market reports', kind: 'page', note: 'Monthly reports on TRREB figures.' },
];

// /services/<name>/ addresses that public/_redirects sends elsewhere: a page may not take one.
const redirected = [...readFileSync('public/_redirects', 'utf8').matchAll(/^\/services\/([a-z0-9-]+)\/?\s/gm)].map((m) => m[1]);

export async function GET() {
  const links = new Map<string, { url: string; title: string; kind: string; note: string }>();
  for (const p of PAGES) links.set(p.url, p);
  for (const g of await getCollection('guides', ({ data }) => !data.draft)) {
    if (g.id.includes('/')) continue; // translations
    links.set(`/${g.id}/`, { url: `/${g.id}/`, title: g.data.h1, kind: 'guide', note: clip(g.data.description) });
  }
  const services = await getCollection('services', ({ data }) => !data.draft);
  for (const s of services) {
    const url = servicePath(s.id);
    // A service with a pillar guide is the guide: it is already listed above.
    if (!links.has(url)) links.set(url, { url, title: s.data.name, kind: 'service', note: clip(s.data.summary) });
  }
  for (const h of await getCollection('neighbourhoods', ({ data }) => !data.draft)) {
    const url = neighbourhoodPath(h.id);
    links.set(url, { url, title: h.data.h1, kind: 'neighbourhood', note: clip(`${h.data.intro} ${h.data.personality} Home types: ${h.data.quickStats.propertyTypes} Transit: ${h.data.quickStats.transit} Commute: ${h.data.quickStats.commute}`, 700) });
  }
  for (const p of await publishedPosts()) {
    const url = `/blog/${p.id.split('/').pop()}/`;
    links.set(url, { url, title: p.data.h1, kind: 'post', note: clip(p.data.takeaway) });
  }
  return new Response(JSON.stringify({ links: [...links.values()], reserved: [...services.map((s) => s.id), ...redirected] }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
