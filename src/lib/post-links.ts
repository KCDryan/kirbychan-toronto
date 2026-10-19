/**
 * The neighbourhood guides and service guides a blog post can link to, with the words that suggest
 * them. Used by the blog layout (posts that choose none get them from the headline), the upload
 * page and Tina's HTML import (first guesses the writer can change) and the upload API (checks).
 */
export const HOODS: Record<string, { label: string; words: RegExp }> = {
  leaside: { label: 'Leaside', words: /\bleaside\b/i },
  'lawrence-park': { label: 'Lawrence Park', words: /\blawrence park\b/i },
  'yonge-eglinton': { label: 'Yonge and Eglinton', words: /\byonge (and|&) eglinton\b|\byonge-eglinton\b/i },
  'don-mills': { label: 'Don Mills', words: /\bdon mills\b/i },
  'the-annex': { label: 'The Annex', words: /\bannex\b/i },
  'bayview-village': { label: 'Bayview Village', words: /\bbayview village\b/i },
  willowdale: { label: 'Willowdale', words: /\bwillowdale\b|\bnorth york centre\b/i },
  'downtown-waterfront': { label: 'Downtown Waterfront', words: /\bwaterfront\b|\bcityplace\b|\bst\.? lawrence\b/i },
  'high-park': { label: 'High Park', words: /\bhigh park\b/i },
  'the-beaches': { label: 'The Beaches', words: /\bthe beach(es)?\b/i },
  riverdale: { label: 'Riverdale', words: /\briverdale\b|\bleslieville\b/i },
  'islington-village': { label: 'Islington Village', words: /\bislington\b|\betobicoke city centre\b/i },
  rosedale: { label: 'Rosedale', words: /\b(rosedale|moore park)\b/i },
  danforth: { label: 'Danforth', words: /\b(the danforth|danforth village|danforth east york)\b/i },
  'mount-pleasant-east': { label: 'Mount Pleasant East', words: /\bmount pleasant east\b/i },
  agincourt: { label: 'Agincourt', words: /\bagincourt\b/i },
  guildwood: { label: 'Guildwood', words: /\bguildwood\b/i },
  mimico: { label: 'Mimico', words: /\bmimico\b/i },
};

/** In order of preference: the first matches win when only two are shown. */
export const SERVICES: Record<string, { label: string; words: RegExp }> = {
  'estate-sales': { label: 'Estate sales', words: /\b(estate|probate|executor)/i },
  'separation-and-divorce': { label: 'Separation and divorce', words: /\b(separation|divorce)/i },
  'new-construction': { label: 'New construction', words: /\b(pre-construction|new construction|builder|assignment)/i },
  luxury: { label: 'Luxury homes', words: /\bluxury\b/i },
  upsizing: { label: 'Upsizing', words: /\b(upsiz|move up|moving up)/i },
  relocation: { label: 'Relocation', words: /\b(relocat|moving to toronto|newcomer)/i },
  investors: { label: 'Investors', words: /\b(invest|rental|landlord)/i },
  downsizing: { label: 'Downsizing', words: /\b(downsiz|reverse mortgage|senior|bungalow)/i },
  'first-time-buyers': { label: 'First time buyers', words: /\bfirst[- ]time\b/i },
};

/** The service guide each blog category leads to when a post names none. */
export const CATEGORY_SERVICE: Partial<Record<string, string>> = {
  downsizing: 'downsizing', buying: 'first-time-buyers', 'costs-and-taxes': 'first-time-buyers', condos: 'downsizing',
  'new-construction': 'new-construction', 'moving-to-toronto': 'relocation', investing: 'investors', neighbourhoods: 'relocation', selling: 'downsizing',
};

/** Titles a writer can pick on the upload page. Any other title can be typed. */
export const ROLES = ['Broker', 'Broker of Record', 'Sales Representative', 'REALTOR®'];

/** Neighbourhoods named in the text, at most `max`. */
export const hoodsIn = (text: string, max = 12) => Object.keys(HOODS).filter((id) => HOODS[id].words.test(text)).slice(0, max);

const hash32 = (s: string) => {
  let n = 0;
  for (const c of s) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return n;
};

/** One of the neighbourhood photos, chosen from a post's address. Only a last resort: see assignCardHoods. */
export const anyHood = (slug: string): string => {
  const ids = Object.keys(HOODS);
  return ids[hash32(slug) % ids.length];
};

/** The neighbourhood a post is about, if it names one: its own field, its links, or its title and summary. */
export const namedHood = (candidates: (string | undefined)[], text: string): string | undefined => candidates.find((h) => h && h in HOODS) ?? hoodsIn(text, 1)[0];

/**
 * The least used of these photos that is not in `avoid`. The post's address breaks ties, so the same
 * post gets the same photo each time.
 */
export function leastUsed(ids: string[], used: Map<string, number>, avoid: Set<string>, seed: string): string | undefined {
  let best: string | undefined;
  let bestKey = Infinity;
  for (const id of ids) {
    if (avoid.has(id)) continue;
    const key = (used.get(id) ?? 0) * 2 ** 32 + hash32(seed + id);
    if (key < bestKey) [best, bestKey] = [id, key];
  }
  return best ?? ids[0];
}

/**
 * Which neighbourhood photo leads each post's card, for every post at once so a photo is not used
 * more than it has to be. A post that is about a neighbourhood keeps that photo. Every other post
 * takes the photo used least so far, and never one a neighbouring post (two either side, by date)
 * already shows. There are fewer photos than posts, so some repeats remain: this spreads them evenly.
 */
export function assignCardHoods(posts: { slug: string; published: number; named?: string }[]): Map<string, string> {
  const ids = Object.keys(HOODS);
  const ordered = [...posts].sort((a, b) => a.published - b.published || a.slug.localeCompare(b.slug));
  const out = new Map<string, string>();
  const used = new Map<string, number>();
  for (const p of ordered) {
    if (p.named && p.named in HOODS) {
      out.set(p.slug, p.named);
      used.set(p.named, (used.get(p.named) ?? 0) + 1);
    }
  }
  ordered.forEach((p, i) => {
    if (out.has(p.slug)) return;
    const near = new Set([i - 2, i - 1, i + 1, i + 2].map((j) => out.get(ordered[j]?.slug ?? '')).filter((h): h is string => !!h));
    const pick = leastUsed(ids, used, near, p.slug)!;
    out.set(p.slug, pick);
    used.set(pick, (used.get(pick) ?? 0) + 1);
  });
  return out;
}

/** Service guides named in the text, at most `max`. */
export const servicesIn = (text: string, max = 9) => Object.keys(SERVICES).filter((id) => SERVICES[id].words.test(text)).slice(0, max);

/** What the blog layout links when a post chooses nothing itself: two of each, from the headline and description. */
export function autoLinks(topic: string, category: string) {
  return {
    hoods: hoodsIn(topic, 2),
    services: [...new Set([...servicesIn(topic), CATEGORY_SERVICE[category]].filter((x): x is string => Boolean(x)))].slice(0, 2),
  };
}

// Self-check: node --experimental-strip-types src/lib/post-links.ts
if (typeof process !== 'undefined' && !!import.meta.filename && import.meta.filename === process.argv[1]) {
  const assert = (c: unknown, m: string) => {
    if (!c) throw new Error(m);
  };
  const ids = Object.keys(HOODS);
  const posts = Array.from({ length: 40 }, (_, i) => ({ slug: `post-${i}`, published: i, named: i % 8 === 0 ? 'leaside' : undefined }));
  const out = assignCardHoods(posts);
  const counts = new Map<string, number>();
  for (const h of out.values()) counts.set(h, (counts.get(h) ?? 0) + 1);
  assert(posts.filter((p) => p.named).every((p) => out.get(p.slug) === 'leaside'), 'a named neighbourhood keeps its photo');
  const generic = posts.filter((p) => !p.named);
  const genericCounts = new Map<string, number>();
  for (const p of generic) genericCounts.set(out.get(p.slug)!, (genericCounts.get(out.get(p.slug)!) ?? 0) + 1);
  assert(Math.max(...genericCounts.values()) <= Math.ceil(generic.length / (ids.length - 1)) + 1, 'other posts are spread evenly');
  for (let i = 2; i < posts.length; i++) assert(out.get(posts[i].slug) !== out.get(posts[i - 1].slug) || posts[i].named, 'no two neighbours share a photo');
  assert(JSON.stringify([...assignCardHoods(posts)]) === JSON.stringify([...out]), 'the same posts give the same photos');
  const more = assignCardHoods([...posts, { slug: 'newest', published: 99 }]);
  assert(posts.every((p) => more.get(p.slug) === out.get(p.slug)), 'a new post does not change the older ones');
  console.log('post-links ok');
}
