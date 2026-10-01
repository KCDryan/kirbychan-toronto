/**
 * Landing pages for /homes-for-sale/<slug>/: one per home type and one per neighbourhood. Unlike the
 * one-click search, their listings are in the HTML, so search engines can read them. The listings
 * come from this site's own /api/listings at build time and the daily listing-counts commit rebuilds
 * the site every morning, so the snapshot is never more than a day old.
 */
import site from '../data/site.json';

export type Card = {
  key: string;
  price: number;
  address: string | null;
  city: string;
  community: string | null;
  beds: number | null;
  baths: number | null;
  type: string | null;
  style: string | null;
  brokerage: string | null;
  photo: string | null;
};
export type Snapshot = { total: number; listings: Card[]; at: Date };

export type TypePage = {
  home: string;
  label: string;
  title: string;
  description: string;
  h1: string;
  intro: string[];
  links: { href: string; label: string }[];
};

export const TYPE_PAGES: Record<string, TypePage> = {
  bungalows: {
    home: 'bungalow',
    label: 'Bungalows',
    title: 'Bungalows for Sale in Toronto | Live MLS® Listings',
    description: 'Toronto bungalows for sale today on the MLS®: photos, asking prices and the neighbourhoods where they are listed. Every room on one level. Updated daily.',
    h1: 'Bungalows for sale in Toronto',
    intro: [
      'With a bungalow, the bedrooms, kitchen and laundry share one level, so daily life never depends on a staircase. That single feature is the reason long-time owners planning a move ask us about bungalows more than any other home.',
      'The list covers bungalows and bungalofts, which keep the main bedroom on the ground floor with a loft above. Raised bungalows are not included, because reaching the front door takes a flight of stairs.',
    ],
    links: [
      { href: '/best-toronto-neighbourhoods-for-downsizing/', label: 'Toronto neighbourhoods for downsizing' },
      { href: '/blog/bungalow-condo-or-townhouse-downsizing-toronto/', label: 'Bungalow, condo or townhouse: comparing the options in Toronto' },
      { href: '/downsizing-toronto/', label: 'The Toronto downsizing guide' },
    ],
  },
  condos: {
    home: 'condo',
    label: 'Condo apartments',
    title: 'Condos for Sale in Toronto | Live MLS® Listings',
    description: 'Toronto condo apartments for sale today on the MLS®, with photos, asking prices and the neighbourhoods they are in. Refreshed from TRREB each morning.',
    h1: 'Condo apartments for sale in Toronto',
    intro: [
      'A condo apartment puts everything on one floor behind a single door, with an elevator to the lobby and nothing outside to maintain. The trade is a monthly common expense fee, which the condo corporation sets in its budget to run and repair the building.',
      'For a resale unit in Ontario, the status certificate is the document to read before the deal is firm. It sets out the fee, the reserve fund and anything the corporation knows is coming, so ask for it early and have your lawyer review it.',
    ],
    links: [
      { href: '/blog/condo-status-certificate-toronto/', label: 'Reading a condo status certificate in Toronto' },
      { href: '/yonge-eglinton-toronto/', label: 'Yonge and Eglinton neighbourhood guide' },
      { href: '/downtown-waterfront-toronto/', label: 'Downtown Waterfront neighbourhood guide' },
    ],
  },
  townhouses: {
    home: 'townhouse',
    label: 'Townhouses',
    title: 'Townhouses for Sale in Toronto | Live MLS® Listings',
    description: 'Toronto townhouses for sale today on the MLS®, freehold and condo, with photos and asking prices, newest first. Refreshed from TRREB each morning.',
    h1: 'Townhouses for sale in Toronto',
    intro: [
      'This list holds two kinds of townhouse. A freehold townhouse is yours outright, land included, along with all of its upkeep. In a condo townhouse the corporation maintains the exterior and the grounds, paid for through a monthly fee.',
      'Either one usually means a smaller yard and roof to look after than a detached house, with more floor space than most condo apartments offer.',
    ],
    links: [
      { href: '/best-toronto-neighbourhoods-for-families/', label: 'Toronto neighbourhoods with the most houses' },
      { href: '/upsizing-toronto/', label: 'Moving up to a bigger home in Toronto' },
      { href: '/mortgage-calculator-toronto/', label: 'Toronto mortgage calculator' },
    ],
  },
  houses: {
    home: 'house',
    label: 'Houses',
    title: 'Houses for Sale in Toronto | Live MLS® Listings',
    description: 'Detached and semi-detached houses for sale in Toronto today on the MLS®, with photos, asking prices and neighbourhoods. Refreshed each morning.',
    h1: 'Houses for sale in Toronto',
    intro: [
      'Detached and semi-detached houses are both on this list. Prices for them vary widely from one Toronto neighbourhood to the next, so the neighbourhood links below are a quicker way to compare than scrolling every listing.',
      'A house purchase in Toronto also carries two land transfer taxes, Ontario\'s and the City\'s, so run the price through the calculator before you settle on a budget. To see what houses actually sold for, open a free sold prices account.',
    ],
    links: [
      { href: '/toronto-house-prices/', label: 'Toronto house prices by property type' },
      { href: '/land-transfer-tax-calculator-toronto/', label: 'Toronto land transfer tax calculator' },
      { href: '/sold/', label: 'Toronto sold prices' },
    ],
  },
};

const cache = new Map<string, Promise<Snapshot | null>>();

/** The first page of live listings for a search, from this site's own API. Null if it cannot be reached. */
export function snapshot(query: string): Promise<Snapshot | null> {
  if (!cache.has(query)) {
    cache.set(
      query,
      fetch(`${site.url}/api/listings?${query}`, { signal: AbortSignal.timeout(20000) })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { total?: number; listings?: Card[] } | null) =>
          d && Array.isArray(d.listings) ? { total: d.total ?? d.listings.length, listings: d.listings, at: new Date() } : null,
        )
        .catch(() => null),
    );
  }
  return cache.get(query)!;
}

export const cad = (n: number) => '$' + n.toLocaleString('en-CA');
export const homeTypeOf = (c: Card) => (c.style && !/storey|apartment|other/i.test(c.style) ? c.style : c.type) || '';
