/**
 * Browser side of the one-click home search, shared by /homes-for-sale/ and /sold/.
 * Choices are links, so the address bar always holds the search and Back works. A click updates
 * the list in place instead of reloading, so the page never jumps back to the top.
 */
import { AREAS, HOMES, PRICES, SOLD_WINDOWS } from '../lib/proptx';

export const $ = (id: string) => document.getElementById(id)!;
export const money = (n: unknown) => (typeof n === 'number' ? '$' + n.toLocaleString('en-CA') : '');

export function el(tag: string, cls?: string | null, text?: string | null) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/** The search in the address bar, keeping only the keys this page understands. */
export function current(keys: string[]): URLSearchParams {
  const p = new URLSearchParams(location.search);
  for (const k of [...p.keys()]) if (!keys.includes(k) || !p.get(k)) p.delete(k);
  return p;
}

/** The link for one choice: the current search with that key changed, back to page one. */
export function withValue(p: URLSearchParams, key: string, value: string): string {
  const n = new URLSearchParams(p);
  if (value) n.set(key, value);
  else n.delete(key);
  if (key !== 'page') n.delete('page');
  if (key === 'city') n.delete('area');
  const s = n.toString();
  return s ? '?' + s : location.pathname;
}

/** Marks the chosen buttons and points every button at the search it leads to. */
export function syncChoices(p: URLSearchParams) {
  for (const c of document.querySelectorAll<HTMLAnchorElement>('.hs__choice')) {
    c.href = withValue(p, c.dataset.key!, c.dataset.value!);
    if ((p.get(c.dataset.key!) || '') === c.dataset.value) c.setAttribute('aria-current', 'true');
    else c.removeAttribute('aria-current');
  }
  // Neighbourhoods are Toronto's, so the row only shows while searching Toronto.
  const area = document.getElementById('area-step');
  if (area) area.hidden = !!p.get('city');
  syncCounts(p);
}

type Counts = Record<string, number>;
const fmt = (v: number | undefined) => (v ?? 0).toLocaleString('en-CA');

/**
 * Today's for-sale counts on the buttons follow the other choice: pick condos and each neighbourhood
 * shows its condos, pick a neighbourhood and each home type shows that neighbourhood's. Hidden for
 * other cities and rentals, which the daily counts do not cover.
 */
function syncCounts(p: URLSearchParams) {
  const panel = document.querySelector<HTMLElement>('.hs__panel[data-counts]');
  if (!panel) return;
  const data = JSON.parse(panel.dataset.counts!) as { toronto: Counts; areas: Record<string, Counts> };
  const off = !!(p.get('city') || p.get('for'));
  panel.classList.toggle('hs__panel--nocounts', off);
  const chosen = p.get('home') ?? '';
  const home = chosen in HOMES ? chosen : 'total';
  const area = data.areas[p.get('area') ?? ''];
  for (const e of panel.querySelectorAll<HTMLElement>('[data-count-home]')) e.textContent = fmt((area ?? data.toronto)[e.dataset.countHome!]);
  for (const e of panel.querySelectorAll<HTMLElement>('[data-count-area]')) e.textContent = fmt(data.areas[e.dataset.countArea!]?.[home]);
}

/** Plain words for one chosen filter, for the chips above the results. */
function chipLabel(key: string, value: string): string | null {
  switch (key) {
    case 'home': return HOMES[value]?.label ?? null;
    case 'area': return AREAS[value]?.label ?? null;
    case 'price': return PRICES[value]?.label ?? null;
    case 'beds': return `${value} or more bedrooms`;
    case 'city': return value;
    case 'for': return value === 'lease' ? 'Homes to rent' : null;
    case 'sort': return { low: 'Lowest price first', high: 'Highest price first' }[value] ?? null;
    case 'sold': return SOLD_WINDOWS[value]?.label ?? null;
    default: return null;
  }
}

/** One chip per chosen filter. Pressing a chip removes that filter, like every other choice a link. */
export function renderChips(p: URLSearchParams) {
  const box = document.getElementById('chips');
  if (!box) return;
  const chips = [...p.entries()]
    .filter(([k]) => k !== 'page')
    .map(([k, v]) => {
      const label = chipLabel(k, v);
      if (!label) return null;
      const a = el('a', 'hs__chip') as HTMLAnchorElement;
      a.href = withValue(p, k, '');
      a.append(el('span', null, label), el('span', 'hs__chip-x', '×'));
      a.setAttribute('aria-label', `Remove ${label}`);
      return a;
    })
    .filter((a): a is HTMLAnchorElement => !!a);
  box.replaceChildren(...chips);
  box.hidden = !chips.length;
}

export function bindChoices(load: () => void) {
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('.hs__choice, .hs__chip, #prev, #next');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    history.pushState(null, '', a.getAttribute('href'));
    load();
    if (a.id === 'prev' || a.id === 'next') $('results-top').scrollIntoView();
  });
  addEventListener('popstate', load);
  load();
}

/** A plain sentence for the search, e.g. "bungalows for sale in Leaside, Toronto under $800,000". */
export function describe(p: URLSearchParams, verb: string, one = false): string {
  const home = HOMES[p.get('home') ?? ''];
  const kind = home ? home.label.toLowerCase() : 'homes';
  const price = PRICES[p.get('price') ?? ''];
  const area = AREAS[p.get('area') ?? ''];
  return [
    one ? kind.replace(/s$/, '') : kind,
    verb,
    'in ' + (p.get('city') || (area ? `${area.label}, Toronto` : 'Toronto')),
    price && (price.min && price.max ? `from ${money(price.min)} to ${money(price.max)}` : price.max ? `under ${money(price.max)}` : `over ${money(price.min)}`),
    p.get('beds') && `with ${p.get('beds')} or more bedrooms`,
  ].filter(Boolean).join(' ');
}

type Facts = { style?: string | null; type?: string | null; beds?: number | null; baths?: number | null };

/** "Bungalow · 3 bedrooms · 2 bathrooms", in words rather than abbreviations. */
export const factsLine = (l: Facts) =>
  [
    l.style && !/storey|apartment|other/i.test(l.style) ? l.style : l.type,
    l.beds != null && `${l.beds} bedroom${l.beds === 1 ? '' : 's'}`,
    l.baths != null && `${l.baths} bathroom${l.baths === 1 ? '' : 's'}`,
  ].filter(Boolean).join(' · ');

export function photo(src: string | null | undefined, alt: string) {
  const img = el('img', 'hs__img') as HTMLImageElement;
  img.alt = alt;
  if (src) {
    img.src = src;
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
  }
  return img;
}
