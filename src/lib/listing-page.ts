import { firstTimeRelief, ontarioLtt, torontoMltt } from './ltt.ts';
/**
 * The HTML for one listing page at /listing/<key>/, built by functions/listing/[key].ts and poured
 * into the built shell page. Pure and escaped: every value from the feed goes through esc().
 * It covers every home type the search shows: houses with no maintenance fee, condos with one,
 * homes for lease and homes outside the City of Toronto, where the municipal tax does not apply.
 */
export type Listing = {
  key: string;
  price: number | null;
  address: string | null;
  city: string | null;
  community: string | null;
  beds: number | null;
  baths: number | null;
  type: string | null;
  style?: string | null;
  lease?: boolean;
  brokerage: string | null;
  remarks?: string | null;
  crossStreet?: string | null;
  tour?: string | null;
  photos?: string[];
  facts?: Record<string, unknown>;
  photo?: string | null;
};
export type Area = { slug: string; name: string; path: string; intro: string; transit: string; bands: { band: string; range: string; what: string }[]; faq?: { q: string; a: string }[] };
type Figures = { sales: number; average: number | null; median: number | null };
/** TRREB's Market Watch figures by home type for one month, as built into /listing-areas.json. */
export type Medians = { period: string; cities: Record<string, { name: string; types: (Figures & { type: string })[] }> };
/** The one row of those figures that matches a listing: same city, same home type. */
export type Median = Figures & { period: string; place: string; noun: string };
/** What we remembered about a listing that has left the feed. City and lease are empty on a row stored before they were kept. */
export type Gone = { key: string; address: string | null; community: string | null; city?: string | null; lease?: boolean; type?: string | null; price?: number | null };
export type Sold = { price: number | null; date: string | null };

/**
 * 301 only when the community has a published neighbourhood guide. The caller passes that
 * guide's path and nothing else. Every other gone listing answers 410.
 */
export function goneTarget(guidePath?: string | null): string | null {
  return guidePath && guidePath.startsWith('/') ? guidePath : null;
}
export type PageInput = {
  origin: string;
  phone?: { label: string; href: string };
  /** The live listing. Null once it has left the feed. */
  listing: Listing | null;
  /** What we remembered about a listing that has left the feed. */
  gone?: Gone;
  area?: Area;
  median?: Median;
  similar: Listing[];
  /** Where the similar listings were searched: a neighbourhood we cover or the city. */
  similarIn?: string;
  /** Only ever set for a signed-in visitor: sold data stays behind sign-in. */
  sold?: Sold;
  signedIn: boolean;
};

export const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const money = (n: unknown) => (typeof n === 'number' && n > 0 ? '$' + Math.round(n).toLocaleString('en-CA') : '');
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const an = (next: string) => (/^(8|11|18|[aeiou])/i.test(next) ? 'an' : 'a');
const clip = (t: string, max: number) => (t.length <= max ? t : t.slice(0, t.lastIndexOf(' ', max - 1)).replace(/[\s,;:.|]+$/, ''));
/** The lead sentence plus as many of the following sentences as fit, so a description never stops mid-phrase. */
const fitSentences = (lead: string, tails: string[], max: number) => tails.reduce((t, x) => (`${t} ${x}`.length <= max ? `${t} ${x}` : t), clip(lead, max));
/** "5 Beaufield Avenue, Toronto, ON M4G 3R2" reads as "5 Beaufield Avenue" in a heading. */
const short = (address: string) => address.replace(/,\s*[^,]+,\s*ON\b.*$/i, '').trim() || address;
/** TRREB writes Toronto with its district, "Toronto C11". The district is dropped in a sentence. */
const cityOf = (city: string | null | undefined) => (city ?? '').replace(/\s+[CEW]\d{2}$/, '').trim();
const inToronto = (city: string | null | undefined) => /^Toronto\b/i.test(city ?? '');

const KINDS: Record<string, string> = { Detached: 'detached house', 'Att/Row/Townhouse': 'townhouse', 'Condo Apartment': 'condo apartment', 'Condo Townhouse': 'condo townhouse', Link: 'link house' };
/** The home type in a sentence. A type with no plain name keeps the feed's own words. */
export function kindOf(type: string | null | undefined): string {
  const t = (type ?? '').trim();
  if (KINDS[t]) return KINDS[t];
  if (t.startsWith('Semi-Detached') && !/condo/i.test(t)) return 'semi-detached house';
  return t && !/^other$/i.test(t) ? t.toLowerCase() : 'home';
}
/** Homes that sit in a condominium or co-operative, where a status certificate and a monthly fee apply. */
const isCondo = (type: string | null | undefined) => /condo|co-op|co-ownership/i.test(type ?? '');

/** The Market Watch row for a listing: its city and its home type. Nothing when TRREB's table has no such row. */
export function medianFor(l: Pick<Listing, 'city' | 'type'>, m: Medians | undefined): Median | undefined {
  const t = (l.type ?? '').trim();
  const type = t === 'Detached' ? 'Detached' : t.startsWith('Semi-Detached') && !/condo/i.test(t) ? 'Semi-detached' : t === 'Att/Row/Townhouse' ? 'Freehold townhouse' : t === 'Condo Townhouse' ? 'Condo townhouse' : t === 'Condo Apartment' ? 'Condo apartment' : null;
  const city = m?.cities[inToronto(l.city) ? 'toronto' : cityOf(l.city).toLowerCase().replace(/\s+/g, '-')];
  const row = type && city ? city.types.find((x) => x.type === type) : undefined;
  if (!m || !city || !row || !row.median) return undefined;
  return { ...row, period: m.period, place: city.name, noun: /^(detached|semi-detached)$/i.test(row.type) ? `${row.type.toLowerCase()} house` : row.type.toLowerCase() };
}

const LABELS: Record<string, string> = {
  LivingAreaRange: 'Square feet', ApproximateAge: 'Approximate age', DirectionFaces: 'Faces', TaxAnnualAmount: 'Property tax',
  TaxYear: 'Tax year', AssociationFee: 'Maintenance fee', KitchensTotal: 'Kitchens', RoomsTotal: 'Rooms', ParkingTotal: 'Parking spaces',
  GarageType: 'Garage', HeatType: 'Heating', Cooling: 'Cooling', Locker: 'Locker', PetsAllowed: 'Pets', Exposure: 'Exposure',
  ArchitecturalStyle: 'Style', AssociationFeeIncludes: 'Fee includes', AssociationAmenities: 'Building amenities', BalconyType: 'Balcony',
  LaundryFeatures: 'Laundry', ParkingFeatures: 'Parking', InteriorFeatures: 'Interior features', PropertyFeatures: 'Features', View: 'View', LegalStories: 'Floor',
  LotWidth: 'Lot width', LotDepth: 'Lot depth', LotSizeUnits: 'Lot measured in',
};
/** A count that goes stale between visits. */
const SKIP = new Set(['DaysOnMarket']);
const show = (k: string, v: unknown) =>
  Array.isArray(v) ? v.join(', ') : ['TaxAnnualAmount', 'AssociationFee'].includes(k) ? money(v) : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v);

const fallbackName = (c: Pick<Listing, 'community' | 'city'>) => `Home in ${c.community ?? (cityOf(c.city) || 'Toronto')}`;
const card = (c: Listing) => `<li class="lp-card"><a href="/listing/${esc(c.key)}/">${
  c.photo && /^https:\/\//.test(c.photo) ? `<img src="${esc(c.photo)}" alt="${esc(c.address ?? fallbackName(c))}" width="640" height="480" loading="lazy" referrerpolicy="no-referrer">` : ''
}<strong>${esc(money(c.price))}${c.lease ? ' a month' : ''}</strong><span>${esc(c.address ?? fallbackName(c))}</span><span>${esc(
  [c.beds != null && plural(c.beds, 'bedroom'), c.baths != null && plural(c.baths, 'bathroom'), c.type].filter(Boolean).join(' · '),
)}</span><span>Listed by ${esc(c.brokerage || 'the listing brokerage')}. MLS® ${esc(c.key)}</span></a></li>`;

function areaBlock(a: Area | undefined): string {
  if (!a) return `<section class="lp-area"><h2>Toronto neighbourhoods and prices</h2><p>Our neighbourhood guides set out TRREB prices by home type, transit and the housing in each area we cover.</p><p><a href="/neighbourhoods/">Toronto neighbourhood guides</a> · <a href="/toronto-house-prices/">Toronto house prices</a> · <a href="/homes-for-sale/">All Toronto homes for sale</a></p></section>`;
  return `<section class="lp-area"><h2>About ${esc(a.name)}</h2><p>${esc(a.intro)}</p>${a.transit ? `<p><strong>Transit:</strong> ${esc(a.transit)}</p>` : ''}${
    a.bands.length
      ? `<table><thead><tr><th>Property type</th><th>Median</th><th>Sales and average</th></tr></thead><tbody>${a.bands
          .map((b) => `<tr><td>${esc(b.band)}</td><td>${esc(b.range)}</td><td>${esc(b.what)}</td></tr>`)
          .join('')}</tbody></table><p>Source: TRREB community housing market reports, as set out in the guide.</p>`
      : ''
  }${
    a.faq?.length ? `<h3>Questions about ${esc(a.name)}</h3>${a.faq.map((f) => `<h4>${esc(f.q)}</h4><p>${esc(f.a)}</p>`).join('')}` : ''
  }<p><a href="${esc(a.path)}">Read the ${esc(a.name)} neighbourhood guide</a> · <a href="/homes-for-sale/${esc(a.slug)}/">All ${esc(a.name)} homes for sale</a></p></section>`;
}

const num = (v: unknown) => (typeof v === 'number' && v > 0 ? v : typeof v === 'string' && Number(v) > 0 ? Number(v) : 0);
/** A feed list as words. "None" is how the feed says the list is empty. */
const listOf = (v: unknown) => (Array.isArray(v) ? v.filter(Boolean).map(String) : typeof v === 'string' && v ? [v] : []).filter((x) => !/^(none|n\/a|unknown)$/i.test(x.trim()));
const words = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
/** Federal minimum down payment: 5% of the first $500,000 and 10% of the rest under $1.5 million, 20% at $1.5 million and above. */
export const minDown = (price: number) => (price >= 1500000 ? price * 0.2 : price <= 500000 ? price * 0.05 : 25000 + (price - 500000) * 0.1);

/**
 * The written sections of a live listing page. Every sentence is built from the listing's own
 * fields, the tax rules in src/lib/ltt.ts or TRREB's published figures, so a page can never say
 * something about a home that the feed did not say.
 */
function sections(l: Listing, place: string, median: Median | undefined): { html: string; faq: { q: string; a: string }[] } {
  const f = l.facts ?? {};
  const price = num(l.price);
  const lease = l.lease === true;
  const kind = kindOf(l.type);
  const condo = isCondo(l.type);
  const city = cityOf(l.city);
  const toronto = inToronto(l.city);
  const fee = num(f.AssociationFee);
  const tax = num(f.TaxAnnualAmount);
  const size = typeof f.LivingAreaRange === 'string' ? f.LivingAreaRange : '';
  const parking = num(f.ParkingTotal);
  const garage = listOf(f.GarageType)[0]?.toLowerCase() ?? '';
  const locker = listOf(f.Locker)[0] ?? '';
  const lot = num(f.LotWidth) && num(f.LotDepth) ? `${num(f.LotWidth)} by ${num(f.LotDepth)} ${String(f.LotSizeUnits ?? 'feet').toLowerCase()}` : '';
  const basement = listOf(f.Basement).map((x) => x.toLowerCase());
  const heat = listOf(f.HeatType)[0]?.toLowerCase() ?? '';
  const kitchens = num(f.KitchensTotal);
  const includes = listOf(f.AssociationFeeIncludes).map((x) => x.replace(/ Included$/i, '').toLowerCase());
  const amenities = listOf(f.AssociationAmenities).map((x) => x.toLowerCase());
  const faq: { q: string; a: string }[] = [];
  const out: string[] = [];

  // The home in a paragraph.
  const what = `${l.beds ? `${l.beds} bedroom ` : ''}${kind}`;
  const has = [parking ? plural(parking, 'parking space') : '', garage ? `${an(garage)} ${garage} garage` : '', locker ? `a locker (${locker.toLowerCase()})` : ''].filter(Boolean);
  const lead = [
    `${place} is ${an(what)} ${what}${l.community ? ` in TRREB's ${l.community} community` : ''}${city ? ` in ${city}` : ''}, listed for ${lease ? 'lease' : 'sale'} at ${money(price)}${lease ? ' a month' : ''}.`,
    l.baths != null || size ? `The listing shows ${[l.baths != null && plural(l.baths, 'bathroom'), size && `${size} square feet`].filter(Boolean).join(' and ')}.` : '',
    l.style && !/^other$/i.test(l.style) ? `The style is given as ${l.style.toLowerCase()}.` : '',
    lot ? `The lot is listed as ${lot}.` : '',
    basement.length ? `The listing gives the basement as ${basement.join(', ')}.` : '',
    condo && f.Exposure ? `The unit faces ${String(f.Exposure).toLowerCase()}.` : '',
    has.length ? `It comes with ${words(has)} according to the listing.` : f.ParkingTotal === 0 ? 'The listing shows no parking space.' : '',
    l.crossStreet ? `The nearest main intersection given is ${l.crossStreet}.` : '',
    f.ApproximateAge ? `The age is listed as ${String(f.ApproximateAge)} years.` : '',
  ].filter(Boolean).join(' ');
  out.push(
    `<h2>About this ${esc(kind)}</h2><p>${esc(lead)}</p><p>These details come from the listing brokerage through TRREB's MLS® System. ${
      condo ? 'Room sizes, parking and locker ownership and what the fee covers should all be checked against the status certificate' : 'Room sizes, the lot, the taxes and what is included in the sale should all be confirmed'
    } before ${lease ? 'a lease is signed' : 'an offer is firm'}.</p>`,
  );
  if (amenities.length) out.push(`<p><strong>Building amenities on the listing:</strong> ${esc(words(amenities))}.</p>`);

  // A lease has no land transfer tax, down payment or offer, so the buying sections stop here.
  if (lease) {
    faq.push({ q: `How do I book a showing for ${place}?`, a: `Use the form on this page or call us. Quote MLS® ${l.key}. We will confirm the listing is still available and arrange a time with the listing brokerage.` });
    faq.push({ q: `Is ${place} still for lease?`, a: `This page is refreshed from TRREB's MLS® System through the day. If the listing is leased or withdrawn the page says so. Contact us to confirm before you make plans.` });
    out.push(
      `<h2>What to check before you apply</h2><ol><li><strong>Read the whole lease first.</strong> Before you sign, ask for the full document and look at the term, the rent, the due date and what happens if you leave early.</li><li><strong>Ask what the rent covers.</strong> Heat, hydro, water and internet are billed in different ways from one rental to the next${parking ? `. The listing shows ${esc(plural(parking, 'parking space'))}, so ask whether that is included or costs extra` : ''}.</li><li><strong>Find out who the landlord is.</strong> Ask for a name and a way to reach them. Ask too whether a property manager handles repairs.</li><li><strong>Expect to be asked for documents.</strong> Landlords often ask for ID, proof of income and references. Ask exactly what is wanted before you send anything personal.</li><li><strong>Ask about deposits.</strong> Ontario's rules limit what a landlord may collect up front on most residential rentals. Confirm the amount and get a receipt.</li><li><strong>See the unit in person.</strong> ${l.tour ? 'The listing has a virtual tour, but photos' : 'Photos'} do not show noise, smells or the condition of the building. Note any damage with the landlord before you move in.</li></ol><p>This is general information, not legal advice. For questions about a specific lease, speak to a lawyer or a legal clinic.</p>`,
    );
    return { html: out.join(''), faq };
  }

  // Which taxes apply depends on the city, so a listing with no city gets no tax figures.
  if (price && city) {
    const on = ontarioLtt(price);
    const to = toronto ? torontoMltt(price) : 0;
    const relief = firstTimeRelief(on, to);
    const down = minDown(price);
    const row = (th: string, td: string) => `<tr><th>${th}</th><td>${td}</td></tr>`;
    out.push(
      `<h2>What it costs to buy ${esc(place)}</h2><p>${
        toronto
          ? `At the asking price of ${money(price)}, a buyer pays two land transfer taxes on closing: the Ontario tax and the City of Toronto's municipal tax. Both apply to every home inside the City.`
          : `At the asking price of ${money(price)}, a buyer pays the Ontario land transfer tax on closing. ${esc(city)} is outside the City of Toronto, so Toronto's municipal land transfer tax does not apply.`
      }</p><table><tbody>${row('Asking price', money(price))}${row('Ontario land transfer tax', money(on))}${
        toronto ? row('Toronto municipal land transfer tax', money(to)) + row('Both taxes', money(on + to)) : ''
      }${row('First-time buyer relief, if you qualify', `up to ${money(relief)}`)}${row('Minimum down payment', money(down))}</tbody></table>` +
        `<p>The down payment figure is the federal minimum: ${price >= 1500000 ? '20 percent, because a home at $1.5 million or more cannot carry mortgage default insurance' : price <= 500000 ? '5 percent of the price' : '5 percent of the first $500,000 and 10 percent of the rest'}. A lender can ask for more. These figures use the asking price, so they change if you pay more or less.${
          price > 2000000 ? ' The rates above $2,000,000 used here are the ones for a home with one or two single family residences. A property with more units is taxed differently.' : ''
        } Legal fees, title insurance and adjustments are extra: ask your lawyer for a written quote. This is general information, not legal or tax advice. Confirm the figures with a lawyer or accountant. You can change the price in our <a href="/land-transfer-tax-calculator-toronto/">land transfer tax calculator</a> and our <a href="/mortgage-calculator-toronto/">mortgage calculator</a>.</p>`,
    );
    faq.push({
      q: `How much is land transfer tax on ${place}?`,
      a: toronto
        ? `At the asking price of ${money(price)} the Ontario tax is ${money(on)} and the Toronto tax is ${money(to)}, ${money(on + to)} in total. A first-time buyer who qualifies can get up to ${money(relief)} back. Confirm the final figures with your lawyer.`
        : `At the asking price of ${money(price)} the Ontario tax is ${money(on)}. ${city} is outside the City of Toronto, so there is no municipal land transfer tax. A first-time buyer who qualifies can get up to ${money(relief)} back. Confirm the final figures with your lawyer.`,
    });
    faq.push({ q: `What is the minimum down payment for ${place}?`, a: `${money(down)} at the asking price of ${money(price)}, under the federal minimum down payment rules. A lender may require more.` });
  }

  if (fee || tax) {
    const monthly = fee + tax / 12;
    out.push(
      `<h2>What it costs to own each month</h2><table><tbody>${fee ? `<tr><th>Maintenance fee</th><td>${money(fee)} a month</td></tr>` : ''}${tax ? `<tr><th>Property tax${f.TaxYear ? ` (${esc(f.TaxYear)})` : ''}</th><td>${money(tax)} a year, about ${money(tax / 12)} a month</td></tr>` : ''}${fee && tax ? `<tr><th>Fee and tax together</th><td>about ${money(monthly)} a month</td></tr>` : ''}</tbody></table>` +
        `<p>${fee && includes.length ? `The listing says the maintenance fee includes ${esc(words(includes))}. ` : ''}That is before a mortgage payment, home insurance and ${fee ? 'any utilities the fee does not cover' : 'utilities'}.${
          fee
            ? ` Fees are set each year in the corporation's budget and can change. The status certificate shows the current fee, the budget behind it and the reserve fund.`
            : ' The listing shows no monthly maintenance fee, so upkeep of the building and the lot is the owner\'s own cost.'
        }</p>`,
    );
    if (fee) faq.push({ q: `What is the maintenance fee at ${place}?`, a: `The listing shows ${money(fee)} a month${includes.length ? `, including ${words(includes)}` : ''}. Check the current fee in the status certificate.` });
    if (tax) faq.push({ q: `How much is the property tax on ${place}?`, a: `The listing shows ${money(tax)} a year${f.TaxYear ? ` for ${String(f.TaxYear)}` : ''}, about ${money(tax / 12)} a month.` });
  }

  if (price && median?.median) {
    const diff = price - median.median;
    out.push(
      `<h2>How the asking price compares</h2><p>TRREB recorded ${median.sales.toLocaleString('en-CA')} ${esc(median.noun)} sales in ${esc(median.place)} in ${esc(median.period)}, at a median price of ${money(median.median)}${median.average ? ` and an average of ${money(median.average)}` : ''}. This home is listed at ${money(price)}, which is ${diff === 0 ? 'the same as' : `${money(Math.abs(diff))} ${diff > 0 ? 'above' : 'below'}`} that median.</p>` +
        `<p>The median covers every neighbourhood, size and condition in ${esc(median.place)}, so it is a reference point and not a valuation of this home. Location, size, lot, parking and condition all move the price. Our <a href="/toronto-house-prices/">Toronto house prices</a> page has the figures for every home type.</p>`,
    );
    faq.push({ q: `Is ${place} priced above or below the median?`, a: `It is listed at ${money(price)}. The ${median.period} median for ${median.noun} sales in ${median.place} was ${money(median.median)} across ${median.sales.toLocaleString('en-CA')} sales, so the asking price is ${diff === 0 ? 'the same' : `${money(Math.abs(diff))} ${diff > 0 ? 'higher' : 'lower'}`}. The median covers all sizes and neighbourhoods.` });
  }

  const see = `<li><strong>See it in person.</strong> ${l.tour ? 'The listing has a virtual tour, but ' : ''}${l.tour ? 'photos' : 'Photos'} do not show noise, light at different hours or the state of ${condo ? 'the hallways and elevators' : 'the street and the homes beside it'}.</li>`;
  out.push(
    `<h2>What to check before you make an offer</h2><ol>${
      condo
        ? `<li><strong>Order the status certificate.</strong> A condo corporation must provide it within 10 days of a request and can charge up to $100. It shows the fee for this unit, any arrears, the budget, the reserve fund balance and any special assessment or lawsuit the corporation knows about.</li><li><strong>Have a lawyer read it.</strong> The certificate comes with the declaration, by-laws and rules. Ask what they say about pets, renting the unit and renovations${listOf(f.PetsAllowed).length ? `. The listing gives pets as "${esc(listOf(f.PetsAllowed).join(', '))}"` : ''}.</li><li><strong>Confirm the parking and locker.</strong> ${
            parking || locker ? 'The listing shows ' + esc(words([parking ? plural(parking, 'parking space') : '', locker ? 'a locker' : ''].filter(Boolean))) + '. Ask whether each is owned, exclusive use or rented. Get the unit numbers.' : 'Ask whether a space or a locker comes with the unit and whether one can be rented in the building.'
          }</li><li><strong>Check the reserve fund study.</strong> Ask when the last study was done and what it says about contributions.</li><li><strong>Get your financing in writing.</strong> A lender looks at the maintenance fee and the property tax as well as the price.</li>`
        : `<li><strong>Book a home inspection.</strong> An inspector looks at the roof, foundation, wiring, plumbing and heating${heat ? `. The listing gives the heating as ${esc(heat)}` : ''}.</li><li><strong>Have a lawyer search the title.</strong> A title search shows mortgages, liens and easements registered against the property. Ask whether a survey exists${lot ? ` and whether it matches the lot on the listing, ${esc(lot)}` : ''}.</li><li><strong>Ask about permits.</strong> Ask which renovations had building permits and whether those permits were closed.${
            kitchens > 1 ? ` The listing shows ${kitchens} kitchens. If there is a second unit, ask whether it meets the municipality's rules for one.` : ''
          }</li><li><strong>Confirm what is included.</strong> Appliances, light fixtures and window coverings are included only if the agreement says so. Ask whether the water heater or furnace is rented.</li><li><strong>Get your financing in writing.</strong> A lender looks at the property tax and heating costs as well as the price.</li>`
    }${see}</ol><p>Our <a href="/first-time-home-buyers-toronto/">first-time home buyer guide</a> and our <a href="/buyers/">page for buyers</a> walk through each step. This is general information, not legal advice. Confirm the details with a lawyer.</p>`,
  );
  faq.push({ q: `How do I book a showing for ${place}?`, a: `Use the form on this page or call us. Quote MLS® ${l.key}. We will confirm the listing is still available and arrange a time with the listing brokerage.` });
  faq.push({ q: `Is ${place} still for sale?`, a: `This page is refreshed from TRREB's MLS® System through the day. If the listing sells or is withdrawn the page says so. Contact us to confirm before you make plans.` });
  return { html: out.join(''), faq };
}

/** Title, description, H1 and body for the page. */
export function listingPage(p: PageInput): { title: string; description: string; h1: string; crumb: string; body: string; live: boolean } {
  const l = p.listing;
  const key = l?.key ?? p.gone!.key;
  const address = l?.address ?? p.gone?.address ?? null;
  const community = l?.community ?? p.gone?.community ?? null;
  const place = address ? short(address) : fallbackName({ community, city: l?.city ?? null });
  const areaName = p.area?.name ?? community ?? (cityOf(l?.city) || 'Toronto');
  const lease = l?.lease ?? p.gone?.lease ?? false;
  const similar = p.similar.filter((c) => c.key !== key).slice(0, 6);
  const more = similar.length
    ? `<section class="lp-more"><h2>${l ? 'Similar' : 'Current'} homes for ${lease ? 'rent' : 'sale'} in ${esc(p.similarIn ?? 'Toronto')}</h2><ul class="lp-cards" role="list">${similar.map(card).join('')}</ul></section>`
    : '';
  const cta = `<div class="lp-cta"><a class="btn btn--primary" href="#enquire">Ask a question or book a showing</a>${
    p.phone ? `<a class="btn btn--ghost" href="${esc(p.phone.href)}">Call ${esc(p.phone.label)}</a>` : ''
  }</div>`;

  if (!l) {
    // The asking price, photos and remarks are gone with the listing. A signed-in sold price is added
    // only when the caller passes it, and that response is never cached.
    const status = lease ? 'This home has been leased.' : 'This home has sold.';
    const sold = p.sold && (p.sold.price || p.sold.date)
      ? `<p class="lp-sold"><strong>Sold</strong>${p.sold.price ? ` for ${esc(money(p.sold.price))}` : ''}${p.sold.date ? ` on ${esc(p.sold.date)}` : ''}. Sold information is from TRREB and is shown to signed-in visitors only.</p>`
      : p.signedIn || lease
        ? ''
        : `<p class="lp-signin"><a href="/sold/">Sign in to see sold prices</a> for Toronto homes, where TRREB has recorded a sale.</p>`;
    const hunt = lease ? '/homes-for-sale/?for=lease' : '/homes-for-sale/';
    const ask = `<div class="lp-cta"><a class="btn btn--primary" href="#enquire">Tell us what you are looking for</a>${
      p.phone ? `<a class="btn btn--ghost" href="${esc(p.phone.href)}">Call ${esc(p.phone.label)}</a>` : ''
    }</div>`;
    return {
      live: false,
      crumb: place,
      h1: place,
      title: clip(`${place} | ${lease ? 'Leased' : 'Sold'}`, 60),
      description: fitSentences(`${place}${community ? ` in ${community}` : ''}: ${status}`, [`See current homes ${lease ? 'for rent' : 'for sale'} in Toronto.`], 160),
      body: `<p class="lp-status">${status}</p>${sold}${ask}${more}<p><a href="${hunt}">See Toronto homes ${lease ? 'for rent' : 'for sale'}</a></p>${areaBlock(p.area)}<p class="lp-key">MLS® ${esc(key)}</p>`,
    };
  }

  const kind = kindOf(l.type);
  const offer = l.lease ? 'for lease' : 'for sale';
  const asking = `${money(l.price)}${l.lease && l.price ? ' a month' : ''}`;
  const meta = [l.beds != null && plural(l.beds, 'bedroom'), l.baths != null && plural(l.baths, 'bathroom'), l.type].filter(Boolean).join(', ');
  const photos = (l.photos ?? []).filter((u) => /^https:\/\//.test(u));
  const gallery = photos.length
    ? `<div class="lp-photos"><img class="lp-hero" src="${esc(photos[0])}" alt="${esc(place)}, photo 1 of ${photos.length}" width="1920" height="1280" fetchpriority="high" referrerpolicy="no-referrer">${
        photos.length > 1
          ? `<div class="lp-strip" tabindex="0" aria-label="More photos">${photos
              .slice(1)
              .map((u, i) => `<img src="${esc(u)}" alt="${esc(place)}, photo ${i + 2} of ${photos.length}" width="480" height="320" loading="lazy" referrerpolicy="no-referrer">`)
              .join('')}</div>`
          : ''
      }</div>`
    : '';
  const facts = Object.entries(l.facts ?? {}).filter(([k]) => !SKIP.has(k));
  const written = sections(l, place, p.median);
  const titled = `${place} | ${money(l.price)}`;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: place,
    url: `${p.origin}/listing/${key}/`,
    ...(photos[0] ? { image: photos.slice(0, 5) } : {}),
    ...(l.price && !l.lease ? { offers: { '@type': 'Offer', price: l.price, priceCurrency: 'CAD', availability: 'https://schema.org/InStock' } } : {}),
    about: {
      '@type': l.type === 'Condo Apartment' ? 'Apartment' : /^(Detached|Semi-Detached|Att\/Row\/Townhouse|Link)/.test(l.type ?? '') && !isCondo(l.type) ? 'SingleFamilyResidence' : 'Residence',
      ...(l.beds != null ? { numberOfBedrooms: l.beds } : {}),
      ...(l.baths != null ? { numberOfBathroomsTotal: l.baths } : {}),
      address: { '@type': 'PostalAddress', ...(address ? { streetAddress: short(address) } : {}), ...(cityOf(l.city) ? { addressLocality: cityOf(l.city) } : {}), addressRegion: 'ON', addressCountry: 'CA' },
    },
  };
  return {
    live: true,
    crumb: place,
    h1: `${place}${l.price ? `: ${kind} ${offer}` : ''}`,
    title: `${titled} | ${areaName}`.length <= 60 ? `${titled} | ${areaName}` : clip(titled, 60),
    description: fitSentences(
      `${place}${community ? `, ${community}` : ''}: ${(meta || 'home').toLowerCase()} ${offer} at ${asking}${cityOf(l.city) ? ` in ${cityOf(l.city)}` : ''}.`,
      l.lease ? ['Photos and details from the listing.', 'Plus nearby homes for lease.'] : [num(l.facts?.AssociationFee) ? 'Photos, maintenance fee and property tax.' : 'Photos, property tax and land transfer tax.', 'Plus nearby homes for sale.'],
      160,
    ),
    body:
      `<p class="lp-price">${esc(asking)}</p><p class="lp-meta">${esc([meta, community, l.crossStreet && `near ${l.crossStreet}`].filter(Boolean).join(' · '))}</p>` +
      gallery + cta +
      `<div class="prose">${l.remarks ? `<h2>From the listing brokerage</h2><p>${esc(l.remarks)}</p>` : ''}${
        l.tour && /^https:\/\//.test(l.tour) ? `<p><a href="${esc(l.tour)}" rel="noopener noreferrer nofollow" target="_blank">Virtual tour</a></p>` : ''
      }${
        facts.length
          ? `<h2>Facts on the listing</h2><table><tbody>${facts.map(([k, v]) => `<tr><th>${esc(LABELS[k] ?? k.replace(/([a-z])([A-Z])/g, '$1 $2'))}</th><td>${esc(show(k, v))}</td></tr>`).join('')}</tbody></table>`
          : ''
      }<p class="lp-brokerage">Listing courtesy of ${esc(l.brokerage || 'the listing brokerage')}. MLS® ${esc(key)}.</p></div>` +
      written.html + areaBlock(p.area) + more +
      `<section class="lp-faq"><h2>Questions about ${esc(place)}</h2>${written.faq.map((x) => `<h3>${esc(x.q)}</h3><p>${esc(x.a)}</p>`).join('')}</section>` +
      `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` +
      `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: written.faq.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) }).replace(/</g, '\\u003c')}</script>`,
  };
}

// ponytail: self-check, run with `node --experimental-strip-types src/lib/listing-page.ts`.
if (typeof process !== 'undefined' && !!import.meta.filename && import.meta.filename === process.argv[1]) {
  const base = { origin: 'https://x.test', similar: [], signedIn: false };
  const need = (body: string, wants: string[], what: string) => {
    for (const w of wants) if (!body.includes(w)) throw new Error(`${what}: missing ${w}`);
  };
  const never = (body: string, bans: (string | RegExp)[], what: string) => {
    for (const b of bans) if (typeof b === 'string' ? body.includes(b) : b.test(body)) throw new Error(`${what}: must not say ${b}`);
  };
  const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ');
  const medians: Medians = { period: 'August 2026', cities: { toronto: { name: 'the City of Toronto', types: [{ type: 'Semi-detached', sales: 159, average: 1110639, median: 981000 }, { type: 'Condo apartment', sales: 885, average: 651648, median: 550000 }] }, markham: { name: 'Markham', types: [{ type: 'Detached', sales: 137, average: 1611773, median: 1488000 }] } } };

  // Escaping. A photo or tour that is not https never reaches the page.
  const live = listingPage({ ...base, listing: { key: 'C1234567', price: 599000, address: '1 Main St <b>', city: 'Toronto C14', community: 'Willowdale East', beds: 2, baths: 1, type: 'Condo Apartment', brokerage: 'A & B', remarks: '<script>x</script>', tour: 'javascript:2', photos: ['https://img.test/a.jpg', 'javascript:1'], facts: { AssociationFee: 650, DaysOnMarket: 4 } } });
  never(live.body, ['<script>x', '<b>', 'javascript:', 'Days On Market'], 'escaping');
  need(live.body, ['$599,000', 'Maintenance fee', 'Listing courtesy of A &amp; B. MLS® C1234567.', 'status certificate'], 'live condo');
  if (!live.live || live.title.length > 60 || live.description.length > 160) throw new Error('live page lengths');

  // A freehold house in Toronto: both taxes, no maintenance fee, the house checklist and the city median for its type.
  // $1,000,000: each tax is 4,475 + 2% of 600,000 = 16,475. Minimum down payment 25,000 + 50,000.
  const semi = { key: 'C7654321', price: 1000000, address: '5 Elm Avenue, Toronto, ON M4G 3R2', city: 'Toronto C11', community: 'Leaside', beds: 3, baths: 2, type: 'Semi-Detached', style: '2-Storey', brokerage: 'X', facts: { TaxAnnualAmount: 9600, TaxYear: 2026, ParkingTotal: 2, GarageType: 'None', LotWidth: 27, LotDepth: 133.5, LotSizeUnits: 'Feet', Basement: ['Finished', 'Separate Entrance'], HeatType: 'Water', KitchensTotal: 2 } };
  const house = listingPage({ ...base, median: medianFor(semi, medians), similarIn: 'Leaside', listing: semi });
  need(house.body, ['$16,475', '$32,950', 'up to $8,475', '$75,000', 'about $800 a month', 'no monthly maintenance fee', 'Book a home inspection', '27 by 133.5 feet', 'the basement as finished, separate entrance', 'shows 2 kitchens', '$19,000 above', '159 semi-detached house sales in the City of Toronto in August 2026', 'FAQPage', 'SingleFamilyResidence', 'Confirm the figures with a lawyer or accountant'], 'house');
  never(text(house.body), ['Maintenance fee', 'status certificate', 'condo', ' none garage'], 'house');
  if (house.h1 !== '5 Elm Avenue: semi-detached house for sale' || house.title !== '5 Elm Avenue | $1,000,000 | Leaside') throw new Error('house headings ' + house.h1 + ' / ' + house.title);

  // Outside the City of Toronto there is no municipal tax: the Ontario tax and the Ontario refund alone.
  // $1,600,000: 4,475 + 2% of 1,200,000 = 28,475. Minimum down payment is 20%.
  const out = { ...semi, price: 1600000, city: 'Markham', community: 'Unionville', type: 'Detached' };
  const markham = listingPage({ ...base, median: medianFor(out, medians), listing: out });
  need(markham.body, ['$28,475', 'up to $4,000', '$320,000', 'outside the City of Toronto', '137 detached house sales in Markham'], 'outside Toronto');
  never(markham.body, ['Toronto municipal land transfer tax</th>', 'Both taxes'], 'outside Toronto');

  // No row in TRREB's table for this type or city means no comparison at all.
  if (medianFor({ city: 'Toronto C01', type: 'Duplex' }, medians) || medianFor({ city: 'Oshawa', type: 'Detached' }, medians) || medianFor({ city: 'Toronto C01', type: 'Detached' }, medians) || medianFor(semi, undefined)) throw new Error('a median was invented');
  never(listingPage({ ...base, listing: { ...semi, type: 'Duplex' } }).body, ['How the asking price compares'], 'no median');
  if (kindOf('Duplex') !== 'duplex' || kindOf('Semi-Detached ') !== 'semi-detached house' || kindOf(null) !== 'home' || kindOf('Att/Row/Townhouse') !== 'townhouse') throw new Error('kindOf');

  // A lease has rent, not purchase costs.
  const lease = listingPage({ ...base, listing: { ...semi, price: 4200, lease: true } });
  need(lease.body, ['$4,200 a month', 'listed for lease', 'before you apply', 'not legal advice'], 'lease');
  never(lease.body, ['land transfer tax', 'down payment', 'make an offer', '"offers"'], 'lease');

  // A hidden address stays hidden: the page is named by its community.
  const hidden = listingPage({ ...base, listing: { ...semi, address: null } });
  if (hidden.h1 !== 'Home in Leaside: semi-detached house for sale' || hidden.body.includes('Elm Avenue') || hidden.body.includes('streetAddress')) throw new Error('hidden address');

  // A listing that has left the feed: no price, photos or remarks. Sold data only when it is passed in.
  const gone = listingPage({ ...base, listing: null, gone: { key: 'C1234567', address: '1 Main St', community: 'Willowdale East', city: 'Toronto C14', lease: false, price: 900000 } });
  if (gone.live || !gone.body.includes('This home has sold.') || !gone.body.includes('/sold/') || !gone.body.includes('href="/homes-for-sale/"') || !gone.body.includes('href="#enquire"')) throw new Error('gone page');
  never(gone.body, ['Sold</strong>', '$', '<img', 'application/ld+json', '900'], 'gone page');
  const rentGone = listingPage({ ...base, listing: null, gone: { key: 'C1234567', address: '1 Main St', community: 'Willowdale East', city: 'Toronto C14', lease: true }, similar: [{ ...semi, key: 'C7000009', brokerage: 'SAMPLE REALTY' }], similarIn: 'Toronto' });
  need(rentGone.body, ['This home has been leased.', 'for rent', 'Listed by SAMPLE REALTY. MLS® C7000009', 'href="/homes-for-sale/?for=lease"', 'href="#enquire"'], 'off-market rental');
  never(rentGone.body, ['/sold/', 'sold prices', 'This home has sold'], 'off-market rental');
  const sold = listingPage({ ...base, signedIn: true, sold: { price: 580000, date: '2026-09-01' }, listing: null, gone: { key: 'C1234567', address: null, community: null } });
  if (!sold.body.includes('<strong>Sold</strong> for $580,000 on 2026-09-01') || sold.h1 !== 'Home in Toronto') throw new Error('sold page');

  if (goneTarget('/leaside-toronto/') !== '/leaside-toronto/' || goneTarget(null) !== null || goneTarget('') !== null) throw new Error('guide redirect');

  if (minDown(400000) !== 20000 || minDown(700000) !== 45000 || minDown(1500000) !== 300000) throw new Error('minDown');
  const condo = listingPage({ ...base, median: medianFor({ city: 'Toronto C14', type: 'Condo Apartment' }, medians), area: { slug: 'willowdale', name: 'Willowdale', path: '/willowdale-toronto/', intro: 'Intro.', transit: 'Line 1.', bands: [], faq: [{ q: 'Q?', a: 'A.' }] }, listing: { key: 'C1234567', price: 600000, address: '1 Main St 5, Toronto, ON', city: 'Toronto C14', community: 'Willowdale East', beds: 2, baths: 2, type: 'Condo Apartment', brokerage: 'X', facts: { AssociationFee: 600, TaxAnnualAmount: 2400, ParkingTotal: 1, Locker: 'Owned', AssociationFeeIncludes: ['Water Included', 'Heat Included'] } } });
  // $600,000: each tax is 4,475 + 2% of 200,000 = 8,475; minimum down payment 25,000 + 10,000.
  need(condo.body, ['$8,475', '$16,950', '$35,000', '$50,000 above', 'about $800 a month', 'includes water and heat', 'FAQPage', 'Questions about Willowdale', '/willowdale-toronto/', '"Apartment"'], 'condo');
  const none = listingPage({ ...base, listing: { key: 'C1234567', price: 600000, address: '1 Main St', city: 'Toronto C14', community: 'X', beds: 1, baths: 1, type: 'Condo Apartment', brokerage: 'X', facts: { AssociationFee: 600, AssociationFeeIncludes: ['None'], AssociationAmenities: ['None'] } } });
  never(none.body, [/includes none|amenities on the listing/i], 'an empty feed list was printed');

  // House style: no dash characters, no exclamation mark and no comma before "and" or "or" in anything we wrote.
  for (const page of [house, markham, lease, condo, gone, rentGone]) never(text(page.body), [/[\u2013\u2014!]/, /,\s+(and|or)\b/], 'house style');
  console.log('listing-page ok', text(house.body).split(/\s+/).length, 'words in the house sample');
}
