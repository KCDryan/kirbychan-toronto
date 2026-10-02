/**
 * Toronto compared with a neighbouring city. Figures come from src/data/trreb-monthly.json (TRREB
 * Market Watch, refreshed monthly by the update routine) and src/lib/ltt.ts. Every sentence that
 * states or compares a price is written from those numbers, so a new month can never leave a page
 * saying "higher" when it is now lower. Each city keeps its own analysis so no page is the same page
 * with a name swapped, which is what search engines treat as a doorway page.
 *
 * Fixed yearly facts live here with their sources: 2026 residential property tax rates (each
 * municipality's own rate schedule) and 2021 Census dwelling counts (Statistics Canada Census
 * Profile). Paragraphs may hold internal links as plain <a> markup; the page renders them as HTML.
 */
import monthly from '../data/trreb-monthly.json';
import { ontarioLtt, torontoMltt } from './ltt';

export type Stats = { sales: number; average: number; median: number; detSales: number; detAvg: number; condoSales: number; condoAvg: number };
export type TypeRow = { type: string; sales: number; average: number; median: number };
export type Census = { total: number; single: number; apt5: number };

export const PERIOD = monthly.period;
export const TORONTO: Stats = monthly.toronto;
export const TORONTO_BY_TYPE: TypeRow[] = monthly.torontoByType;
const T = TORONTO;
const P = PERIOD;

const $ = (n: number) => '$' + n.toLocaleString('en-CA');
const n = (v: number) => v.toLocaleString('en-CA');
const pct = (part: number, whole: number) => Math.round((part / whole) * 100);
/** The name of whichever place had the lower figure. */
const lower = (a: number, aName: string, b: number, bName: string) => (a < b ? aName : bName);
const moreLess = (a: number, b: number) => (a > b ? 'more' : 'less');
const aboveBelow = (a: number, b: number) => (a > b ? 'above' : 'below');
/** Within 3% counts as level: one month of sales is too noisy to call a winner. */
const level = (a: number, b: number) => Math.abs(a - b) / b < 0.03;
/** Tax on the same purchase in Toronto (Ontario plus municipal) and outside it (Ontario only). */
const taxAt = (price: number) => ({ outside: ontarioLtt(price), toronto: ontarioLtt(price) + torontoMltt(price) });
const row = (rows: TypeRow[], type: string) => rows.find((r) => r.type === type)!;

/** Property tax: each 2026 residential rate in per cent, applied to one assessment so the bills compare like for like. */
export const TAX_YEAR = 2026;
export const ASSESSMENT = 800000;
export const annualTax = (ratePct: number) => Math.round((ASSESSMENT * ratePct) / 100);
export const TORONTO_TAX_RATE = 0.767311;
const TORONTO_TAX = { name: 'City of Toronto, Property tax rates and fees (2026)', url: 'https://www.toronto.ca/services-payments/property-taxes-utilities/property-tax/property-tax-rates-and-fees/' };
const tT = annualTax(TORONTO_TAX_RATE);

/** 2021 Census, occupied private dwellings by structural type: total, single-detached houses, apartments in buildings of five or more storeys. */
const censusUrl = (csd: string) => `https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?Lang=E&DGUIDlist=2021A0005${csd}&GENDERlist=1&STATISTIClist=1&HEADERlist=0`;
export const TORONTO_CENSUS: Census = { total: 1160890, single: 270490, apt5: 542625 };
const TORONTO_CENSUS_SRC = { name: 'Statistics Canada, Census Profile 2021, Toronto (C)', url: censusUrl('3520005') };
const TC = TORONTO_CENSUS;
export const share = (c: Census, k: 'single' | 'apt5') => pct(c[k], c.total);

const TRREB = { name: `TRREB Market Watch, ${P}`, url: monthly.sourceUrl };
const LTT = { name: 'Ontario Ministry of Finance, Calculating land transfer tax', url: 'https://www.ontario.ca/document/land-transfer-tax/calculating-land-transfer-tax' };
const MLTT = { name: 'City of Toronto, Municipal land transfer tax rates and fees', url: 'https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/municipal-land-transfer-tax-mltt-rates-and-fees/' };
const STOUFFVILLE = { name: 'GO Transit, Stouffville line timetable and map (Table 71)', url: 'https://assets.metrolinx.com/image/upload/v1787962004/Documents/GO/full-schedules/FS05092025/Table71.pdf' };
const YNSE = { name: 'Metrolinx, Yonge North Subway Extension', url: 'https://www.metrolinx.com/en/projects-and-programs/yonge-north-subway-extension' };
/** Markham's 2026 brochure also states the province-wide fact that 2026 assessments use January 1, 2016 values. */
const MARKHAM_TAX = { name: 'City of Markham, 2026 final tax brochure', url: 'https://www.markham.ca/sites/default/files/2026%20Final%20Tax%20Brochure.pdf' };

const TD = row(TORONTO_BY_TYPE, 'Detached');
const TS = row(TORONTO_BY_TYPE, 'Semi-detached');
const TF = row(TORONTO_BY_TYPE, 'Freehold townhouse');
const TCT = row(TORONTO_BY_TYPE, 'Condo townhouse');
const TA = row(TORONTO_BY_TYPE, 'Condo apartment');

const MA: Stats = monthly.cities.markham;
const MI: Stats = monthly.cities.mississauga;
const VA: Stats = monthly.cities.vaughan;
const MAT: TypeRow[] = monthly.citiesByType.markham;
const MIT: TypeRow[] = monthly.citiesByType.mississauga;
const VAT: TypeRow[] = monthly.citiesByType.vaughan;

const MA_TAX = 0.722889;
const MI_TAX = 1.087901;
const VA_TAX = 0.749217;
const MA_C: Census = { total: 110865, single: 62270, apt5: 17635 };
const MI_C: Census = { total: 244575, single: 90660, apt5: 66830 };
const VA_C: Census = { total: 103915, single: 64995, apt5: 13750 };

const tMA = taxAt(MA.median);
const tMI = taxAt(MI.median);
const tVA = taxAt(VA.median);

/** Shared wording for the property tax comparison, so each city states its own rate against Toronto's. */
const taxLine = (name: string, rate: number) =>
  `On the same ${$(ASSESSMENT)} assessment that is ${$(annualTax(rate))} a year in ${name} and ${$(tT)} in Toronto, so ${lower(annualTax(rate), name, tT, 'Toronto')} has the lower bill when the assessments match.`;
const assessmentNote = `The rate applies to the value the Municipal Property Assessment Corporation (MPAC) puts on a home, not the price paid. Assessments for ${TAX_YEAR} are still based on January 1, 2016 values, so two homes that sell for the same price today can carry quite different assessments. Check the actual tax on a listing before you compare.`;

const mkD = row(MAT, 'Detached');
const mkS = row(MAT, 'Semi-detached');
const mkF = row(MAT, 'Freehold townhouse');
const mkCT = row(MAT, 'Condo townhouse');
const mkA = row(MAT, 'Condo apartment');
const miD = row(MIT, 'Detached');
const miS = row(MIT, 'Semi-detached');
const miCT = row(MIT, 'Condo townhouse');
const miA = row(MIT, 'Condo apartment');
const vaD = row(VAT, 'Detached');
const vaS = row(VAT, 'Semi-detached');
const vaF = row(VAT, 'Freehold townhouse');
const vaA = row(VAT, 'Condo apartment');

const tMAd = taxAt(mkD.median);
const tMId = taxAt(miD.median);
const tVAd = taxAt(vaD.median);

const LINKS = {
  homes: '<a href="/homes-for-sale/">homes for sale</a>',
  prices: '<a href="/toronto-house-prices/">Toronto house prices</a>',
  ltt: '<a href="/land-transfer-tax-calculator-toronto/">land transfer tax calculator</a>',
};

export const CITIES = [
  {
    slug: 'markham',
    name: 'Markham',
    title: 'Toronto vs Markham: Prices, Tax and Transit (2026)',
    description: `Toronto or Markham? ${P} TRREB prices by property type, what Toronto's second land transfer tax adds and the GO and subway links between the two cities.`,
    stats: MA,
    byType: MAT,
    taxRate: MA_TAX,
    census: MA_C,
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
        h: `Prices by property type, ${P}`,
        table: 'types',
        p: [
          `TRREB's Market Watch splits every month's sales into five main home types. Medians are the fairer guide here because a handful of very large sales can pull an average up. The median detached house sold for ${$(mkD.median)} in Markham and ${$(TD.median)} in the City of Toronto. The median condo apartment was ${$(mkA.median)} in Markham and ${$(TA.median)} in Toronto${level(mkA.median, TA.median) ? ', within a few per cent of each other' : ''}.`,
          `Townhouses fall between the two. A freehold townhouse had a median of ${$(mkF.median)} in Markham against ${$(TF.median)} in Toronto. Condo townhouses came in at ${$(mkCT.median)} and ${$(TCT.median)}. Semi-detached houses are a much larger part of Toronto's market: ${n(TS.sales)} sold in the city that month against ${n(mkS.sales)} in Markham.`,
        ],
      },
      {
        h: 'What the 2021 Census counted',
        table: 'census',
        p: [
          `Sales show what changed hands in one month. The 2021 Census shows what stands on the ground. Statistics Canada counted ${n(MA_C.total)} occupied private dwellings in Markham. ${share(MA_C, 'single')}% were single-detached houses and ${share(MA_C, 'apt5')}% were apartments in buildings of five or more storeys. In the City of Toronto the balance tips the other way: ${share(TC, 'single')}% single-detached and ${share(TC, 'apt5')}% in buildings of five or more storeys.`,
          'That mix explains much of what a search turns up. In Markham the single-detached house is the most common kind of home. In Toronto the most common is an apartment in a building of five or more storeys.',
        ],
      },
      {
        h: 'The tax difference on the same price',
        p: [
          `Buying in Toronto means paying Ontario land transfer tax and the City of Toronto's municipal land transfer tax. The municipal tax applies to property in the City of Toronto, so a purchase in Markham carries the Ontario tax only. At Markham's ${P} median of ${$(MA.median)}, that is ${$(tMA.outside)} in Markham and ${$(tMA.toronto)} for the same price in Toronto, before any first-time buyer refunds.`,
          `The gap widens with the price. At Markham's median detached price of ${$(mkD.median)} the Ontario tax is ${$(tMAd.outside)}. The same price inside Toronto carries ${$(tMAd.toronto)}, a difference of ${$(tMAd.toronto - tMAd.outside)} that is due on closing.`,
          `Our ${LINKS.ltt} runs any price through both.`,
        ],
      },
      {
        h: `Property tax: ${TAX_YEAR} rates`,
        table: 'tax',
        p: [
          `Markham's ${TAX_YEAR} residential tax rate is ${MA_TAX}%. It combines the City of Markham, York Region and the provincial education rate. Toronto's is ${TORONTO_TAX_RATE}%, which includes the City Building Fund levy. ${taxLine('Markham', MA_TAX)}`,
          assessmentNote,
        ],
      },
      {
        h: 'Getting between the two',
        p: [
          'The GO Stouffville line links them by rail. Its Markham stations are Mount Joy, Markham, Centennial and Unionville. Inside Toronto it stops at Milliken, Agincourt and Kennedy on the way to Union Station. Kennedy GO is where the line meets the TTC.',
          'Metrolinx is extending TTC Line 1 about eight kilometres north from Finch Station to Richmond Hill. The Yonge North Subway Extension has five stations and will serve Vaughan, Markham and Richmond Hill. Metrolinx says it will go into service after the Ontario Line is complete.',
          'For a Toronto owner thinking about a move north, the practical questions are which Markham station is closest to the home and how the drive to it compares with the subway ride they have today.',
        ],
      },
      {
        h: 'Which homes and costs fit which purchase',
        p: [
          `For a detached house, Markham has the higher share of them: ${share(MA_C, 'single')}% of its homes are single-detached. Its ${P} detached median of ${$(mkD.median)} was ${aboveBelow(mkD.median, TD.median)} Toronto's ${$(TD.median)}. The purchase avoids the municipal land transfer tax. On a matching assessment the annual property tax is also ${moreLess(annualTax(MA_TAX), tT) === 'less' ? 'lower' : 'higher'} than in Toronto.`,
          `For a condo apartment near a subway station, Toronto has far more choice: ${n(TA.sales)} condo apartment sales in ${P} against ${n(mkA.sales)} in Markham. On Toronto's median condo price of ${$(TA.median)} the municipal land transfer tax adds ${$(torontoMltt(TA.median))}.`,
          `For a townhouse, the freehold medians were ${level(mkF.median, TF.median) ? 'close to level' : `${$(Math.abs(mkF.median - TF.median))} apart`} in ${P}. Here the deciding costs tend to be the tax difference and any condo fees on a condo townhouse.`,
        ],
      },
      {
        h: 'Toronto neighbourhoods near Markham',
        p: [
          `The Toronto side of Steeles has its own range of homes. Our guides to <a href="/willowdale-toronto/">Willowdale</a>, <a href="/bayview-village-toronto/">Bayview Village</a> and <a href="/don-mills-toronto/">Don Mills</a> cover condos and houses in North York. You can browse ${LINKS.homes} in both cities or compare ${LINKS.prices} neighbourhood by neighbourhood.`,
        ],
      },
    ],
    faq: [
      { q: 'Is Markham cheaper than Toronto?', a: `Not on the headline median in ${P}: ${$(MA.median)} in Markham against ${$(T.median)} in the City of Toronto (TRREB). That gap mostly reflects Toronto's high share of condo sales. Detached houses averaged ${moreLess(MA.detAvg, T.detAvg)} in Markham than in Toronto that month.` },
      { q: 'Do Markham buyers pay Toronto\'s municipal land transfer tax?', a: 'No. Toronto\'s municipal land transfer tax applies to property in the City of Toronto, so a Markham purchase carries the Ontario land transfer tax only.' },
      { q: 'How much more land transfer tax does a Toronto purchase cost?', a: `At ${$(MA.median)}, ${$(tMA.toronto - tMA.outside)} more: ${$(tMA.toronto)} in Toronto against ${$(tMA.outside)} in Markham, before first-time buyer refunds.` },
      { q: 'Which GO line connects Toronto and Markham?', a: 'The Stouffville line, with Markham stations at Mount Joy, Markham, Centennial and Unionville and Toronto stations at Milliken, Agincourt and Kennedy before Union.' },
      { q: `What is Markham's ${TAX_YEAR} property tax rate?`, a: `${MA_TAX}% for residential property, against ${TORONTO_TAX_RATE}% in Toronto. On an ${$(ASSESSMENT)} assessment that is ${$(annualTax(MA_TAX))} a year in Markham and ${$(tT)} in Toronto.` },
      { q: 'Are most Markham homes houses or condos?', a: `Houses. In the 2021 Census ${share(MA_C, 'single')}% of Markham's occupied dwellings were single-detached houses and ${share(MA_C, 'apt5')}% were apartments in buildings of five or more storeys. In Toronto the figures were ${share(TC, 'single')}% and ${share(TC, 'apt5')}%.` },
      { q: 'Will the subway reach Markham?', a: 'Metrolinx is building the Yonge North Subway Extension, which takes TTC Line 1 about eight kilometres north from Finch with five stations serving Vaughan, Markham and Richmond Hill. Metrolinx says it will open after the Ontario Line is complete.' },
    ],
    sources: [
      TRREB, LTT, MLTT, STOUFFVILLE, YNSE, TORONTO_TAX, MARKHAM_TAX, TORONTO_CENSUS_SRC,
      { name: 'Statistics Canada, Census Profile 2021, Markham (CY)', url: censusUrl('3519036') },
    ],
    sister: { name: 'Kirby Chan & Co. Markham neighbourhood guides', url: 'https://kirbychanmarkham.com/neighbourhoods/' },
  },
  {
    slug: 'mississauga',
    name: 'Mississauga',
    title: 'Toronto vs Mississauga: Home Prices Compared (2026)',
    description: `Toronto or Mississauga? ${P} TRREB prices for houses and condos, the land transfer tax gap on the same price and the new Hazel McCallion Line.`,
    stats: MI,
    byType: MIT,
    taxRate: MI_TAX,
    census: MI_C,
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
        h: 'Medians by property type',
        table: 'types',
        p: [
          `Averages and medians tell different stories for detached houses. Toronto's detached average of ${$(TD.average)} sits well above its median of ${$(TD.median)}, a sign that a smaller number of very expensive sales lift the average. Mississauga's detached median was ${$(miD.median)}, ${level(miD.median, TD.median) ? 'within a few per cent of' : `${aboveBelow(miD.median, TD.median)}`} Toronto's.`,
          `The clearer gap is in attached homes and condos. A semi-detached house had a median of ${$(miS.median)} in Mississauga and ${$(TS.median)} in Toronto. Condo townhouses sold at medians of ${$(miCT.median)} and ${$(TCT.median)}. Condo apartments were ${$(miA.median)} and ${$(TA.median)}, so ${lower(miA.median, 'Mississauga', TA.median, 'Toronto')} had the lower median condo price.`,
        ],
      },
      {
        h: 'What the 2021 Census counted',
        table: 'census',
        p: [
          `Statistics Canada counted ${n(MI_C.total)} occupied private dwellings in Mississauga in 2021. ${share(MI_C, 'single')}% were single-detached houses and ${share(MI_C, 'apt5')}% were apartments in buildings of five or more storeys. Toronto's figures were ${share(TC, 'single')}% and ${share(TC, 'apt5')}%.`,
          `Mississauga sits between Toronto and the York Region cities. Its share of single-detached houses is higher than Toronto's. Its share of apartments in buildings of five or more storeys is higher than Markham's ${share(MA_C, 'apt5')}% or Vaughan's ${share(VA_C, 'apt5')}%.`,
        ],
      },
      {
        h: 'Land transfer tax on each side of the border',
        p: [
          `Toronto's municipal land transfer tax applies to property in the City of Toronto, so a buyer in Mississauga pays the Ontario tax only. At Mississauga's ${P} median of ${$(MI.median)} that is ${$(tMI.outside)}. The same price in Toronto carries ${$(tMI.toronto)} with the municipal tax added, before first-time buyer refunds.`,
          `At Mississauga's median detached price of ${$(miD.median)} the figures are ${$(tMId.outside)} and ${$(tMId.toronto)}. Put your own price through the ${LINKS.ltt}.`,
        ],
      },
      {
        h: `Property tax: ${TAX_YEAR} rates`,
        table: 'tax',
        p: [
          `Here the comparison turns around. Mississauga's ${TAX_YEAR} residential rate is ${MI_TAX}%, set by city by-law and made up of the City of Mississauga, Region of Peel and education rates. Toronto's is ${TORONTO_TAX_RATE}%. ${taxLine('Mississauga', MI_TAX)}`,
          ...(annualTax(MI_TAX) > tT
            ? [`The land transfer tax saving is paid once. The property tax gap recurs every year. At these figures the ${$(tMI.toronto - tMI.outside)} saved at Mississauga's median equals about ${Math.round((tMI.toronto - tMI.outside) / (annualTax(MI_TAX) - tT))} years of the difference on an ${$(ASSESSMENT)} assessment.`]
            : []),
          assessmentNote,
        ],
      },
      {
        h: 'Transit: GO lines and the Hazel McCallion Line',
        p: [
          'Two GO rail lines run through Mississauga to Union Station. The Lakeshore West line stops at Clarkson and Port Credit. The Milton line stops at Lisgar, Meadowvale, Streetsville, Erindale, Cooksville and Dixie before Kipling in Toronto.',
          'Metrolinx is building the Hazel McCallion Line, an 18-kilometre light rail line with 19 stops from Port Credit GO to Brampton Gateway Terminal, with connections to the GO Milton and Lakeshore West lines. Until it opens, most Mississauga commuters rely on GO trains and MiWay buses.',
          'Metrolinx is also extending the Eglinton Crosstown light rail 9.2 kilometres west from Mount Dennis to Renforth Drive, mainly underground. Once complete it will run as one line from Scarborough through midtown Toronto into Mississauga.',
          'Within Toronto, the subway reaches most of the neighbourhoods on this site directly. A home within walking distance of a station is often the deciding point for a purchase that has to work without a car.',
        ],
      },
      {
        h: 'Which homes and costs fit which purchase',
        p: [
          `For a condo apartment, Mississauga's ${P} median of ${$(miA.median)} was ${aboveBelow(miA.median, TA.median)} Toronto's ${$(TA.median)}. The purchase carries no municipal land transfer tax. The higher property tax rate applies every year after that.`,
          `For a detached house, the two medians were ${level(miD.median, TD.median) ? 'close to level' : `${$(Math.abs(miD.median - TD.median))} apart`}. The choice then turns on the tax trade: a one-time saving on land transfer tax in Mississauga against a lower annual rate in Toronto.`,
          `For a condo townhouse, Mississauga recorded ${n(miCT.sales)} sales in ${P} against ${n(TCT.sales)} in Toronto, although Toronto has about ${Math.round((TC.total / MI_C.total) * 10) / 10} times as many occupied dwellings.`,
        ],
      },
      {
        h: 'Toronto neighbourhoods near Mississauga',
        p: [
          `On Toronto's west side, our guides to <a href="/islington-village-toronto/">Islington Village</a> and <a href="/high-park-toronto/">High Park</a> describe the condos and houses closest to the Mississauga border. Browse ${LINKS.homes} in either city or see ${LINKS.prices} by neighbourhood.`,
        ],
      },
    ],
    faq: [
      { q: 'Is Mississauga cheaper than Toronto?', a: `On the ${P} median, ${MI.median < T.median ? 'yes' : 'no'}: ${$(MI.median)} in Mississauga against ${$(T.median)} in Toronto (TRREB). Detached houses averaged ${moreLess(MI.detAvg, T.detAvg)} in Mississauga and condo apartments averaged ${moreLess(MI.condoAvg, T.condoAvg)}.` },
      { q: 'Do Mississauga buyers pay Toronto\'s municipal land transfer tax?', a: 'No. It applies to property in the City of Toronto. Mississauga buyers pay the Ontario land transfer tax only, while Toronto buyers pay the Ontario tax and the municipal tax.' },
      { q: 'Where does the Hazel McCallion Line run?', a: 'From Port Credit GO to Brampton Gateway Terminal, 18 kilometres with 19 stops, connecting with the GO Milton and Lakeshore West lines (Metrolinx).' },
      { q: 'Are property taxes higher in Mississauga than in Toronto?', a: `The ${TAX_YEAR} rate is higher: ${MI_TAX}% in Mississauga against ${TORONTO_TAX_RATE}% in Toronto. On an ${$(ASSESSMENT)} assessment that is ${$(annualTax(MI_TAX))} a year against ${$(tT)}. The actual bill depends on each home's MPAC assessment.` },
      { q: 'Which GO lines serve Mississauga?', a: 'The Lakeshore West line (Clarkson and Port Credit) and the Milton line (Lisgar, Meadowvale, Streetsville, Erindale, Cooksville and Dixie). Both run to Union Station.' },
      { q: 'Does Mississauga have more houses or condos than Toronto?', a: `Proportionally more houses. In the 2021 Census ${share(MI_C, 'single')}% of Mississauga's occupied dwellings were single-detached against ${share(TC, 'single')}% in Toronto. Apartments in buildings of five or more storeys were ${share(MI_C, 'apt5')}% and ${share(TC, 'apt5')}%.` },
    ],
    sources: [
      TRREB, LTT, MLTT,
      { name: 'Metrolinx, Hazel McCallion Line', url: 'https://www.metrolinx.com/en/projects-and-programs/hazel-mccallion-lrt' },
      { name: 'Metrolinx, Eglinton Crosstown West Extension', url: 'https://www.metrolinx.com/en/projects-and-programs/eglinton-crosstown-west-extension' },
      { name: 'GO Transit, Lakeshore West line timetable and map (Table 01)', url: 'https://assets.metrolinx.com/image/upload/v1787962004/Documents/GO/full-schedules/FS05092025/Table01.pdf' },
      { name: 'GO Transit, Milton line timetable and map (Table 21)', url: 'https://assets.metrolinx.com/image/upload/v1787962004/Documents/GO/full-schedules/FS05092025/Table21.pdf' },
      TORONTO_TAX,
      { name: 'City of Mississauga, 2026 tax ratios and rates by-law 0061-2026', url: 'https://www.mississauga.ca/wp-content/uploads/2026/05/01132447/2026-Tax-Ratios-2026-By-law-0061-2026.pdf' },
      MARKHAM_TAX,
      TORONTO_CENSUS_SRC,
      { name: 'Statistics Canada, Census Profile 2021, Mississauga (CY)', url: censusUrl('3521005') },
    ],
  },
  {
    slug: 'vaughan',
    name: 'Vaughan',
    title: 'Toronto vs Vaughan: Buying a Home in 2026',
    description: `Toronto or Vaughan? ${P} TRREB prices by property type, land transfer tax on each and the Line 1 subway that now reaches Vaughan Metropolitan Centre.`,
    stats: VA,
    byType: VAT,
    taxRate: VA_TAX,
    census: VA_C,
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
        h: `Medians by property type, ${P}`,
        table: 'types',
        p: [
          `On medians, Vaughan's detached houses sold for ${$(vaD.median)} against ${$(TD.median)} in the City of Toronto. That puts the typical Vaughan detached sale ${aboveBelow(vaD.median, TD.median)} the typical Toronto one.`,
          `Semi-detached houses had medians of ${$(vaS.median)} in Vaughan and ${$(TS.median)} in Toronto. Freehold townhouses were ${$(vaF.median)} and ${$(TF.median)}. Condo apartments were ${$(vaA.median)} and ${$(TA.median)}${level(vaA.median, TA.median) ? ', close to level' : ''}.`,
        ],
      },
      {
        h: 'What the 2021 Census counted',
        table: 'census',
        p: [
          `Of the ${n(VA_C.total)} occupied private dwellings Statistics Canada counted in Vaughan in 2021, ${share(VA_C, 'single')}% were single-detached houses. Only ${share(VA_C, 'apt5')}% were apartments in buildings of five or more storeys. In the City of Toronto the shares were ${share(TC, 'single')}% and ${share(TC, 'apt5')}%.`,
          `That gives Vaughan the highest share of single-detached houses of the three neighbours compared on this site, ahead of Markham at ${share(MA_C, 'single')}% and Mississauga at ${share(MI_C, 'single')}%.`,
        ],
      },
      {
        h: 'One subway line, two tax bills',
        p: [
          'Vaughan Metropolitan Centre station, at 3150 Highway 7, is the northern end of TTC Line 1, so a Vaughan condo near the station has a one-seat subway ride into Toronto.',
          `Crossing Steeles changes the tax. Toronto's municipal land transfer tax applies only to property in the City of Toronto, so at its ${P} median of ${$(VA.median)} a buyer pays ${$(tVA.outside)} in Ontario land transfer tax. The same price in Toronto costs ${$(tVA.toronto)}, before first-time buyer refunds.`,
          `On a house the difference is larger. At Vaughan's median detached price of ${$(vaD.median)} the Ontario tax is ${$(tVAd.outside)}. Inside Toronto the same price carries ${$(tVAd.toronto)}. The ${LINKS.ltt} works out any other price.`,
        ],
      },
      {
        h: `Property tax: ${TAX_YEAR} rates`,
        table: 'tax',
        p: [
          `Vaughan's ${TAX_YEAR} residential rate is ${VA_TAX}%, combining the City of Vaughan, York Region and education rates. Toronto's is ${TORONTO_TAX_RATE}%. ${taxLine('Vaughan', VA_TAX)}`,
          assessmentNote,
        ],
      },
      {
        h: 'Getting downtown',
        p: [
          'At Vaughan Metropolitan Centre the subway meets Viva bus rapid transit on Highway 7 and York Region Transit buses, according to the TTC. From there Line 1 runs south through Toronto to Union and on to Finch.',
          'The GO Barrie line also crosses Vaughan, with stations at Maple and Rutherford. Southbound trains stop at Downsview Park in Toronto before Union Station.',
          'Further east, the Yonge North Subway Extension will take Line 1 about eight kilometres north from Finch Station with five stations serving Vaughan, Markham and Richmond Hill. Metrolinx says it will go into service after the Ontario Line is complete.',
        ],
      },
      {
        h: 'Which homes and costs fit which purchase',
        p: [
          `For a detached house, Vaughan has the highest share of the three neighbours: ${share(VA_C, 'single')}% of its homes are single-detached. Its ${P} median was ${$(vaD.median)}. The purchase avoids the municipal land transfer tax. The annual property tax on a matching assessment is ${annualTax(VA_TAX) < tT ? 'also lower' : 'higher'} than in Toronto.`,
          `For a condo apartment on the subway, Line 1 reaches Vaughan at its northern terminus. In Toronto the subway serves many more neighbourhoods. Toronto had ${n(TA.sales)} condo apartment sales in ${P} against ${n(vaA.sales)} in Vaughan.`,
          `For a semi-detached house or a freehold townhouse, Toronto recorded ${n(TS.sales)} and ${n(TF.sales)} sales in ${P} against ${n(vaS.sales)} and ${n(vaF.sales)} in Vaughan. Vaughan's semi-detached median was ${$(Math.abs(vaS.median - TS.median))} ${aboveBelow(vaS.median, TS.median)} Toronto's. Its freehold townhouse median was ${$(Math.abs(vaF.median - TF.median))} ${aboveBelow(vaF.median, TF.median)} Toronto's. With samples this small, compare individual listings rather than medians.`,
          'Price the specific homes you would consider in each city and add the tax difference before you decide.',
        ],
      },
      {
        h: 'Toronto neighbourhoods on Line 1',
        p: [
          `If the subway is the draw, Toronto has Line 1 neighbourhoods at several price points. Our guides to <a href="/willowdale-toronto/">Willowdale</a>, <a href="/yonge-eglinton-toronto/">Yonge and Eglinton</a> and <a href="/the-annex-toronto/">the Annex</a> set out their homes and prices. Willowdale alone has three Line 1 stations: Finch, North York Centre and Sheppard-Yonge. Browse ${LINKS.homes} or compare ${LINKS.prices} across the city.`,
        ],
      },
    ],
    faq: [
      { q: 'Is Vaughan more expensive than Toronto?', a: `On the ${P} median, ${VA.median > T.median ? 'yes' : 'no'}: ${$(VA.median)} in Vaughan against ${$(T.median)} in Toronto (TRREB). The detached average was ${moreLess(VA.detAvg, T.detAvg)} in Vaughan than in Toronto that month.` },
      { q: 'Does the subway go to Vaughan?', a: 'Yes. Vaughan Metropolitan Centre station on Highway 7 is the northern terminus of TTC Line 1.' },
      { q: 'Do Vaughan buyers pay Toronto\'s municipal land transfer tax?', a: 'No. It applies to property in the City of Toronto, so Vaughan buyers pay the Ontario land transfer tax only.' },
      { q: `What is Vaughan's ${TAX_YEAR} property tax rate?`, a: `${VA_TAX}% for residential property, against ${TORONTO_TAX_RATE}% in Toronto. On an ${$(ASSESSMENT)} assessment that is ${$(annualTax(VA_TAX))} a year in Vaughan and ${$(tT)} in Toronto.` },
      { q: 'Which GO stations are in Vaughan?', a: 'Maple and Rutherford on the Barrie line, which runs to Union Station by way of Downsview Park.' },
      { q: 'How much land transfer tax does a Vaughan detached house save?', a: `At Vaughan's ${P} median detached price of ${$(vaD.median)}, the Ontario tax is ${$(tVAd.outside)}. The same price in Toronto carries ${$(tVAd.toronto)} once the municipal tax is added, ${$(tVAd.toronto - tVAd.outside)} more, before first-time buyer refunds.` },
      { q: 'What share of Vaughan homes are detached houses?', a: `${share(VA_C, 'single')}% of occupied dwellings in the 2021 Census, against ${share(TC, 'single')}% in the City of Toronto.` },
    ],
    sources: [
      TRREB, LTT, MLTT,
      { name: 'TTC, Vaughan Metropolitan Centre station', url: 'https://www.ttc.ca/subway-stations/vaughan-metropolitan-centre-station' },
      { name: 'GO Transit, Barrie line timetable and map (Table 65)', url: 'https://assets.metrolinx.com/image/upload/v1787962004/Documents/GO/full-schedules/FS05092025/Table65.pdf' },
      YNSE,
      TORONTO_TAX,
      { name: 'City of Vaughan, 2026 final tax rates', url: 'https://www.vaughan.ca/media/343441/download?inline' },
      MARKHAM_TAX,
      TORONTO_CENSUS_SRC,
      { name: 'Statistics Canada, Census Profile 2021, Vaughan (CY)', url: censusUrl('3519028') },
    ],
  },
];
