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

/** Service guides named in the text, at most `max`. */
export const servicesIn = (text: string, max = 9) => Object.keys(SERVICES).filter((id) => SERVICES[id].words.test(text)).slice(0, max);

/** What the blog layout links when a post chooses nothing itself: two of each, from the headline and description. */
export function autoLinks(topic: string, category: string) {
  return {
    hoods: hoodsIn(topic, 2),
    services: [...new Set([...servicesIn(topic), CATEGORY_SERVICE[category]].filter((x): x is string => Boolean(x)))].slice(0, 2),
  };
}
