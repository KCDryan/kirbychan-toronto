/**
 * Toronto compared with a neighbouring city. Figures come from src/data/trreb-monthly.json (TRREB
 * Market Watch, refreshed monthly by the update routine) and src/lib/ltt.ts. Every sentence that
 * states or compares a price is written from those numbers, so a new month can never leave a page
 * saying "higher" when it is now lower. Each city keeps its own analysis so no page is the same page
 * with a name swapped, which is what search engines treat as a doorway page.
 */
import monthly from '../data/trreb-monthly.json';
import { ontarioLtt, torontoMltt } from './ltt';

export type Stats = { sales: number; average: number; median: number; detSales: number; detAvg: number; condoSales: number; condoAvg: number };

export const PERIOD = monthly.period;
export const TORONTO: Stats = monthly.toronto;
const T = TORONTO;
const P = PERIOD;

const $ = (n: number) => '$' + n.toLocaleString('en-CA');
const n = (v: number) => v.toLocaleString('en-CA');
const pct = (part: number, whole: number) => Math.round((part / whole) * 100);
/** The name of whichever place had the lower figure. */
const lower = (a: number, aName: string, b: number, bName: string) => (a < b ? aName : bName);
const moreLess = (a: number, b: number) => (a > b ? 'more' : 'less');
/** Within 3% counts as level: one month of sales is too noisy to call a winner. */
const level = (a: number, b: number) => Math.abs(a - b) / b < 0.03;
/** Tax on the same purchase in Toronto (Ontario plus municipal) and outside it (Ontario only). */
const taxAt = (price: number) => ({ outside: ontarioLtt(price), toronto: ontarioLtt(price) + torontoMltt(price) });

const TRREB = { name: `TRREB Market Watch, ${P}`, url: monthly.sourceUrl };
const LTT = { name: 'Ontario Ministry of Finance, Calculating land transfer tax', url: 'https://www.ontario.ca/document/land-transfer-tax/calculating-land-transfer-tax' };
const MLTT = { name: 'City of Toronto, Municipal land transfer tax rates and fees', url: 'https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/municipal-land-transfer-tax-mltt-rates-and-fees/' };
const STOUFFVILLE = { name: 'GO Transit, Stouffville line timetable and map (Table 71)', url: 'https://assets.metrolinx.com/image/upload/v1787962004/Documents/GO/full-schedules/FS05092025/Table71.pdf' };

const MA: Stats = monthly.cities.markham;
const MI: Stats = monthly.cities.mississauga;
const VA: Stats = monthly.cities.vaughan;

const tMA = taxAt(MA.median);
const tMI = taxAt(MI.median);
const tVA = taxAt(VA.median);

export const CITIES = [
  {
    slug: 'markham',
    name: 'Markham',
    title: 'Toronto vs Markham: Prices, Tax and Transit (2026)',
    description: `Toronto or Markham? ${P} TRREB prices by property type, what Toronto's second land transfer tax adds and the GO and subway links between the two cities.`,
    stats: MA,
    intro: `Markham sits directly north of Toronto across Steeles Avenue. Its ${P} median of ${$(MA.median)} was ${MA.median > T.median ? 'above' : 'below'} Toronto's ${$(T.median)}, but the two cities sell very different mixes of homes and only one of them charges a municipal land transfer tax.`,
    sections: [
      {
        h: 'Why the headline medians mislead',
        p: [
          `Condo apartments made up ${pct(T.condoSales, T.sales)}% of the ${n(T.sales)} City of Toronto sales TRREB recorded in ${P} and ${pct(MA.condoSales, MA.sales)}% of Markham's ${n(MA.sales)}. A median built mostly from condos lands lower than one built mostly from houses, whatever the houses cost.`,
          `Set type against type instead. The average detached sale was ${$(T.detAvg)} in Toronto and ${$(MA.detAvg)} in Markham, so ${lower(T.detAvg, 'Toronto', MA.detAvg, 'Markham')} was the less expensive place to buy a detached house that month on average. Condo apartments averaged ${$(T.condoAvg)} in Toronto and ${$(MA.condoAvg)} in Markham${level(T.condoAvg, MA.condoAvg) ? ', close to level' : ''}.`,
        ],
      },
      {
        h: 'The tax difference on the same price',
        p: [
          `Buying in Toronto means paying Ontario land transfer tax and the City of Toronto's municipal land transfer tax. The municipal tax applies to property in the City of Toronto, so a purchase in Markham carries the Ontario tax only. At Markham's ${P} median of ${$(MA.median)}, that is ${$(tMA.outside)} in Markham and ${$(tMA.toronto)} for the same price in Toronto, before any first-time buyer refunds.`,
          'Our land transfer tax calculator runs any price through both.',
        ],
      },
      {
        h: 'Getting between the two',
        p: [
          'The GO Stouffville line links them by rail. Its Markham stations are Mount Joy, Markham, Centennial and Unionville. Inside Toronto it stops at Milliken, Agincourt and Kennedy on the way to Union Station. Kennedy GO is where the line meets the TTC.',
          'For a Toronto owner thinking about a move north, the practical questions are which Markham station is closest to the home and how the drive to it compares with the subway ride they have today.',
        ],
      },
    ],
    faq: [
      { q: 'Is Markham cheaper than Toronto?', a: `Not on the headline median in ${P}: ${$(MA.median)} in Markham against ${$(T.median)} in the City of Toronto (TRREB). That gap mostly reflects Toronto's high share of condo sales. Detached houses averaged ${moreLess(MA.detAvg, T.detAvg)} in Markham than in Toronto that month.` },
      { q: 'Do Markham buyers pay Toronto\'s municipal land transfer tax?', a: 'No. Toronto\'s municipal land transfer tax applies to property in the City of Toronto, so a Markham purchase carries the Ontario land transfer tax only.' },
      { q: 'How much more land transfer tax does a Toronto purchase cost?', a: `At ${$(MA.median)}, ${$(tMA.toronto - tMA.outside)} more: ${$(tMA.toronto)} in Toronto against ${$(tMA.outside)} in Markham, before first-time buyer refunds.` },
      { q: 'Which GO line connects Toronto and Markham?', a: 'The Stouffville line, with Markham stations at Mount Joy, Markham, Centennial and Unionville and Toronto stations at Milliken, Agincourt and Kennedy before Union.' },
    ],
    sources: [TRREB, LTT, MLTT, STOUFFVILLE],
    sister: { name: 'Kirby Chan & Co. Markham neighbourhood guides', url: 'https://kirbychanmarkham.com/neighbourhoods/' },
  },
  {
    slug: 'mississauga',
    name: 'Mississauga',
    title: 'Toronto vs Mississauga: Home Prices Compared (2026)',
    description: `Toronto or Mississauga? ${P} TRREB prices for houses and condos, the land transfer tax gap on the same price and the new Hazel McCallion Line in Mississauga.`,
    stats: MI,
    intro: `Mississauga is Toronto's western neighbour and the largest city in Peel Region. In ${P} TRREB recorded ${n(MI.sales)} sales there against ${n(T.sales)} in the City of Toronto, with medians of ${$(MI.median)} and ${$(T.median)}.`,
    sections: [
      {
        h: `House and condo prices in ${P}`,
        p: [
          `The detached average was ${$(MI.detAvg)} in Mississauga and ${$(T.detAvg)} in Toronto, a difference of ${$(Math.abs(MI.detAvg - T.detAvg))}. For condo apartments it was ${$(MI.condoAvg)} in Mississauga and ${$(T.condoAvg)} in Toronto, so ${lower(MI.condoAvg, 'Mississauga', T.condoAvg, 'Toronto')} was the less expensive of the two for a condo buyer that month.`,
          `Detached houses were ${pct(MI.detSales, MI.sales)}% of Mississauga's sales and ${pct(T.detSales, T.sales)}% of Toronto's, which is why the overall medians sit ${level(MI.median, T.median) ? 'close together' : `${$(Math.abs(MI.median - T.median))} apart`} even though house prices differ more.`,
        ],
      },
      {
        h: 'Land transfer tax on each side of the border',
        p: [
          `Toronto's municipal land transfer tax applies to property in the City of Toronto, so a buyer in Mississauga pays the Ontario tax only. At Mississauga's ${P} median of ${$(MI.median)} that is ${$(tMI.outside)}. The same price in Toronto carries ${$(tMI.toronto)} with the municipal tax added, before first-time buyer refunds.`,
        ],
      },
      {
        h: 'Transit: GO lines and the Hazel McCallion Line',
        p: [
          'Metrolinx is building the Hazel McCallion Line, an 18-kilometre light rail line with 19 stops from Port Credit GO to Brampton Gateway Terminal, with connections to the GO Milton and Lakeshore West lines. Until it opens, most Mississauga commuters rely on GO trains and MiWay buses.',
          'Within Toronto, the subway reaches most of the neighbourhoods on this site directly. That is often the deciding point for buyers who want to give up driving as they get older.',
        ],
      },
    ],
    faq: [
      { q: 'Is Mississauga cheaper than Toronto?', a: `On the ${P} median, ${MI.median < T.median ? 'yes' : 'no'}: ${$(MI.median)} in Mississauga against ${$(T.median)} in Toronto (TRREB). Detached houses averaged ${moreLess(MI.detAvg, T.detAvg)} in Mississauga and condo apartments averaged ${moreLess(MI.condoAvg, T.condoAvg)}.` },
      { q: 'Do Mississauga buyers pay Toronto\'s municipal land transfer tax?', a: 'No. It applies to property in the City of Toronto. Mississauga buyers pay the Ontario land transfer tax only, while Toronto buyers pay the Ontario tax and the municipal tax.' },
      { q: 'Where does the Hazel McCallion Line run?', a: 'From Port Credit GO to Brampton Gateway Terminal, 18 kilometres with 19 stops, connecting with the GO Milton and Lakeshore West lines (Metrolinx).' },
    ],
    sources: [TRREB, LTT, MLTT, { name: 'Metrolinx, Hazel McCallion Line', url: 'https://www.metrolinx.com/en/projects-and-programs/hazel-mccallion-lrt' }],
  },
  {
    slug: 'vaughan',
    name: 'Vaughan',
    title: 'Toronto vs Vaughan: Buying a Home in 2026',
    description: `Toronto or Vaughan? ${P} TRREB prices by property type, land transfer tax on each and the Line 1 subway that now reaches Vaughan Metropolitan Centre.`,
    stats: VA,
    intro: `Vaughan borders Toronto to the northwest and is the one neighbouring city with a TTC subway station of its own. Its ${P} median was ${$(VA.median)} from ${n(VA.sales)} sales, against ${$(T.median)} from ${n(T.sales)} in the City of Toronto.`,
    sections: [
      {
        h: 'What a house and a condo cost',
        p: [
          `Vaughan's sales are weighted towards houses: ${n(VA.detSales)} of its ${n(VA.sales)} sales in ${P} were detached, compared with ${n(T.detSales)} of Toronto's ${n(T.sales)}. The detached average was ${$(VA.detAvg)} in Vaughan and ${$(T.detAvg)} in Toronto.`,
          `Condo apartments averaged ${$(VA.condoAvg)} in Vaughan and ${$(T.condoAvg)} in Toronto${level(VA.condoAvg, T.condoAvg) ? ', within a few per cent of each other' : ''}.`,
        ],
      },
      {
        h: 'One subway line, two tax bills',
        p: [
          'Vaughan Metropolitan Centre station, at 3150 Highway 7, is the northern end of TTC Line 1, so a Vaughan condo near the station has a one-seat subway ride into Toronto.',
          `Crossing Steeles changes the tax. Toronto's municipal land transfer tax applies only to property in the City of Toronto, so at its ${P} median of ${$(VA.median)} a buyer pays ${$(tVA.outside)} in Ontario land transfer tax. The same price in Toronto costs ${$(tVA.toronto)}, before first-time buyer refunds.`,
        ],
      },
      {
        h: 'Which trade-off matters to you',
        p: [
          'Buyers comparing the two usually weigh a larger house for the money in Vaughan against walkable streets and wider subway coverage in Toronto. Neither is right for everyone. Price the specific homes you would consider in each and add the tax difference before you decide.',
        ],
      },
    ],
    faq: [
      { q: 'Is Vaughan more expensive than Toronto?', a: `On the ${P} median, ${VA.median > T.median ? 'yes' : 'no'}: ${$(VA.median)} in Vaughan against ${$(T.median)} in Toronto (TRREB). The detached average was ${moreLess(VA.detAvg, T.detAvg)} in Vaughan than in Toronto that month.` },
      { q: 'Does the subway go to Vaughan?', a: 'Yes. Vaughan Metropolitan Centre station on Highway 7 is the northern terminus of TTC Line 1.' },
      { q: 'Do Vaughan buyers pay Toronto\'s municipal land transfer tax?', a: 'No. It applies to property in the City of Toronto, so Vaughan buyers pay the Ontario land transfer tax only.' },
    ],
    sources: [TRREB, LTT, MLTT, { name: 'TTC, Vaughan Metropolitan Centre station', url: 'https://www.ttc.ca/subway-stations/vaughan-metropolitan-centre-station' }],
  },
];
