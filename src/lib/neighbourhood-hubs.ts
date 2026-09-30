/**
 * "Best neighbourhoods for..." hub pages. Each groups the twelve neighbourhood guides by the housing
 * and transit people in one situation ask about. Every fact on these pages comes from the
 * neighbourhood files (TRREB community figures, TTC stations and stop counts, 2021 Census housing stock), so a hub can never
 * disagree with the guide it links to. The reasons below only restate those facts.
 *
 * Framed around homes and commutes, never around who "should" live somewhere.
 */
export type Hub = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  /** Which price bands to show, matched against the band names in the neighbourhood files. */
  bands: RegExp;
  bandLabel: string;
  intro: string[];
  /** Optional lead photo, a slug from src/data/photo-credits.json. */
  photo?: string;
  picks: { slug: string; why: string }[];
  harder?: { heading: string; text: string; slugs: string[] };
  outro: { heading: string; paragraphs: string[] };
  faq: { q: string; a: string }[];
};

export const HUBS: Hub[] = [
  {
    slug: 'downsizing',
    title: 'Best Toronto Neighbourhoods to Downsize (2026)',
    description: 'Where to downsize in Toronto: the neighbourhoods with condo apartments, condo townhouses and semis, their TRREB prices for smaller homes and their subway stations.',
    h1: 'Where to downsize in Toronto',
    lede: 'The Toronto neighbourhoods in our guides with the most smaller homes: condo apartments, condo townhouses and semi-detached houses, with April to June 2026 TRREB prices and the nearest subway or LRT station.',
    bands: /condo|townhouse|semi/i,
    bandLabel: 'Smaller-home prices, TRREB',
    intro: [
      'Downsizing is the centre of our work, and the question that decides most moves is not the price of the house you are leaving. It is whether the smaller home you want exists nearby. Some Toronto neighbourhoods are almost all houses and sell only a handful of condos a quarter. Others sell dozens.',
      'The neighbourhoods below had the most condo apartment, condo townhouse or semi-detached sales among our twelve guides from April to June 2026. The prices come from each guide and are split by property type, so a condo is never compared with a detached average.',
    ],
    picks: [
      { slug: 'yonge-eglinton', why: 'Mount Pleasant West alone recorded 114 condo apartment sales from April to June 2026, around Eglinton station where Line 1 meets Line 5.' },
      { slug: 'willowdale', why: 'Willowdale East recorded 153 condo apartment and 22 condo townhouse sales from April to June 2026, along the Yonge subway at Finch, North York Centre and Sheppard-Yonge.' },
      { slug: 'bayview-village', why: 'Condo apartments and condo townhouses make up most sales, beside Bayview, Bessarion and Leslie stations on Line 4 and a City community centre and library.' },
      { slug: 'don-mills', why: 'Condo apartments were 50 of 90 sales from April to June 2026, alongside semi-detached houses and condo townhouses, with Line 5 stations near the southern edge.' },
      { slug: 'islington-village', why: 'Condo apartments near Kipling station, plus freehold and condo townhouses, with Line 2 and Kipling GO connected at Kipling.' },
      { slug: 'riverdale', why: 'South Riverdale had condo apartments, condo townhouses and freehold townhouses as well as semis from April to June 2026, with four Line 2 stations.' },
      { slug: 'downtown-waterfront', why: 'Nearly every sale is a condo apartment, with Union station and its GO trains at the northern edge.' },
    ],
    harder: {
      heading: 'Where there is less to downsize into',
      text: 'These neighbourhoods are mostly detached houses. Selling here is rarely the difficulty. Finding a smaller home nearby usually means looking at one of the neighbourhoods above.',
      slugs: ['lawrence-park', 'leaside', 'the-beaches'],
    },
    outro: {
      heading: 'Choose the destination, then plan the sale',
      paragraphs: [
        'Settle where you are going first and work back from it: what the smaller home costs, including both Toronto land transfer taxes, how much time you need between two closings and when the house needs to be emptied. Our Toronto downsizing guide covers each step and the downsizing costs post puts figures on them.',
      ],
    },
    faq: [
      { q: 'Where in Toronto can I downsize to a condo near the subway?', a: 'Of our twelve guides, Yonge and Eglinton, Willowdale and Bayview Village had the most condo apartment sales from April to June 2026, all within reach of Line 1, Line 4 or Line 5 stations. Islington Village and the downtown waterfront also sell mainly condo apartments.' },
      { q: 'Where can I find a condo townhouse in Toronto?', a: 'Willowdale East recorded 22 condo townhouse sales from April to June 2026 and Bayview Village 15, the most among our guides. South Riverdale recorded 11.' },
      { q: 'Can I downsize without leaving Leaside or Lawrence Park?', a: 'It is possible but the choice is narrow. Leaside recorded 11 condo apartment sales and Lawrence Park South 9 from April to June 2026, so many owners also look at Yonge and Eglinton nearby.' },
      { q: 'Is downsizing your specialty?', a: 'Yes. Later-life moves, downsizing and estate homes are the core of our team\'s work, from pricing the long-time family home to buying the smaller one.' },
    ],
  },
  {
    slug: 'families',
    title: 'Toronto Neighbourhoods With the Most Houses (2026)',
    description: 'Toronto neighbourhoods with the most detached, semi-detached and freehold townhouse sales, their TRREB house prices and what to check about schools before you buy.',
    h1: 'Toronto neighbourhoods with the most room',
    lede: 'Where our twelve Toronto guides show the most detached houses, semis and freehold townhouses selling, with April to June 2026 TRREB prices and what to confirm before you make an offer.',
    bands: /detached|freehold townhouse|semi/i,
    bandLabel: 'House prices, TRREB',
    intro: [
      'When a household needs more space, the search in Toronto usually comes down to the type of house, the price of that type and the school boundary. The neighbourhoods below recorded the most detached, semi-detached and freehold townhouse sales among our guides from April to June 2026.',
      'School boundaries are set by the Toronto District School Board and the Toronto Catholic District School Board and can change. Confirm the boundary for the exact address with the board before you make an offer rather than relying on a neighbourhood name.',
    ],
    picks: [
      { slug: 'lawrence-park', why: 'Detached houses were 92 of 117 sales across Lawrence Park North and South from April to June 2026, with Lawrence station on Line 1.' },
      { slug: 'leaside', why: 'Detached houses were 41 of 63 sales from April to June 2026, with 10 semi-detached sales and Line 5 stations along Eglinton.' },
      { slug: 'the-beaches', why: 'Detached and semi-detached houses made up 55 of 70 sales from April to June 2026, near the lake.' },
      { slug: 'riverdale', why: 'Semi-detached houses led sales in North and South Riverdale, with detached and freehold townhouses in South Riverdale and four Line 2 stations.' },
      { slug: 'high-park', why: 'High Park-Swansea recorded 36 detached sales and High Park North 13 detached and 11 semi-detached sales from April to June 2026, on Line 2.' },
      { slug: 'islington-village', why: 'Detached houses were 43 of 170 sales and freehold townhouses 10, with some of the lower detached prices among our guides.' },
    ],
    outro: {
      heading: 'Moving up from a condo or a smaller house',
      paragraphs: [
        'If you are selling one home and buying a bigger one at the same time, our guide to moving up covers bridge financing and timing two closings, and the land transfer tax calculator shows both Toronto taxes on the new price.',
      ],
    },
    faq: [
      { q: 'Which Toronto neighbourhoods in your guides have the most detached houses?', a: 'Lawrence Park, Leaside and The Beaches, where detached houses were most of the sales from April to June 2026 (TRREB). Each guide has the detached median.' },
      { q: 'How do I find out which school serves a Toronto address?', a: 'Use the school locator of the Toronto District School Board or the Toronto Catholic District School Board for the exact address. Boundaries can change, so confirm before you make an offer.' },
      { q: 'Where is a detached house least expensive among your guides?', a: 'From April to June 2026 the lowest detached medians among our guides were in Islington-City Centre West, about $1,301,000, and Willowdale West, about $1,386,000 (TRREB). Prices vary widely by street and lot.' },
    ],
  },
  {
    slug: 'commuters',
    photo: 'ttc-subway',
    title: 'Toronto Neighbourhoods by Subway Commute (2026)',
    description: 'Toronto neighbourhoods by subway and LRT commute: the nearest TTC stations, the number of stops to Union station and the TRREB median price for each.',
    h1: 'Toronto neighbourhoods by commute',
    lede: 'Which of our twelve Toronto neighbourhoods sit on Line 1, Line 2, Line 4 or the new Line 5 Eglinton, and how many stops each is from Union station.',
    bands: /all property types/i,
    bandLabel: 'Median, all property types, TRREB',
    intro: [
      'For a downtown commute in Toronto, the station you live near matters more than the neighbourhood name. Line 5 Eglinton opened on February 8, 2026 and put Leaside and parts of Don Mills on rapid transit for the first time, with a change to Line 1 at Eglinton station.',
      'We count stops to Union station on the TTC map rather than quoting minutes, because the TTC does not publish station to station times we can cite. Ride the trip at rush hour before you buy.',
    ],
    picks: [
      { slug: 'downtown-waterfront', why: 'Union station, with Line 1 and GO trains, is at the northern edge.' },
      { slug: 'the-annex', why: 'Spadina and St George stations serve both Line 1 and Line 2. Spadina is 7 stops from Union.' },
      { slug: 'riverdale', why: 'Broadview station on Line 2 is 9 stops from Union with a change at Bloor-Yonge, and streetcars run on Queen, King, Dundas and Carlton.' },
      { slug: 'yonge-eglinton', why: 'Eglinton station, where Line 1 meets Line 5, is 11 stops from Union.' },
      { slug: 'lawrence-park', why: 'Lawrence station on Line 1 is 12 stops from Union.' },
      { slug: 'leaside', why: 'Leaside station on Line 5 is 2 stops from Eglinton, then 11 stops on Line 1 to Union.' },
      { slug: 'willowdale', why: 'North York Centre is 15 stops and Finch 16 stops from Union on Line 1, with Line 4 at Sheppard-Yonge.' },
      { slug: 'high-park', why: 'High Park station on Line 2 is 15 stops from Union with a change at St George, and Bloor GO is near Dundas West station.' },
    ],
    outro: {
      heading: 'Test the trip you will actually make',
      paragraphs: [
        'Service levels differ by line and time of day, and Line 5 opened with introductory service conditions. Before you buy, ride from the nearest station to your workplace at the hour you would travel. Our Toronto subway commute guide lists the stations and stop counts for all twelve neighbourhoods.',
      ],
    },
    faq: [
      { q: 'Which neighbourhood in your guides is closest to Union station by subway?', a: 'The downtown waterfront, where Union station sits at the northern edge. Of the others, the Annex is closest, with Spadina station 7 stops away on Line 1.' },
      { q: 'Is Line 5 Eglinton open?', a: 'Yes. Line 5 Eglinton opened on February 8, 2026, running 19 kilometres along Eglinton Avenue from Mount Dennis to Kennedy (TTC). It connects to Line 1 at Eglinton station.' },
      { q: 'Which of your neighbourhoods is not on a subway or LRT line?', a: 'The Beaches. Its nearest Line 2 stations are Main Street and Woodbine to the north, reached by bus, and Danforth GO is on Main Street.' },
    ],
  },
];
