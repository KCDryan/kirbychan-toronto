/** What a listing page says about its neighbourhood and its city, taken from the guides and TRREB's figures at build time. Read by functions/listing/[key].ts. */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import trreb from '../data/trreb-monthly.json';
import { neighbourhoodPath } from '../lib/format';

export const GET: APIRoute = async () => {
  const hoods = await getCollection('neighbourhoods', (e) => !e.data.draft);
  const areas = Object.fromEntries(
    hoods.map((h) => [h.id, { name: h.data.name, path: neighbourhoodPath(h.id), intro: h.data.intro, transit: h.data.quickStats.transit, bands: h.data.priceBands, faq: h.data.faq }]),
  );
  // TRREB Market Watch by home type, so a listing page can set its asking price beside the month's
  // sales of the same type in the same city. A city or type that is not in the file gets no comparison.
  const name = (slug: string) => slug.replace(/(^|-)([a-z])/g, (_, dash: string, c: string) => (dash ? ' ' : '') + c.toUpperCase());
  const medians = {
    period: trreb.period,
    cities: {
      toronto: { name: 'the City of Toronto', types: trreb.torontoByType },
      ...Object.fromEntries(Object.entries(trreb.citiesByType).map(([slug, types]) => [slug, { name: name(slug), types }])),
    },
  };
  return new Response(JSON.stringify({ areas, medians }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
