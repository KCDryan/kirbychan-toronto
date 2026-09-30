/**
 * Builds src/data/toronto-map.json for /map-of-toronto/ from the City of Toronto's official
 * neighbourhood boundaries (Open Data, "Neighbourhoods", 158 model, EPSG:4326 GeoJSON).
 *
 *   node scripts/build-toronto-map.mjs path/to/neighbourhoods-4326.geojson
 *
 * Run it only when the City republishes the boundaries or a guide is added. Each guide lists the
 * City neighbourhoods it covers in HOODS below.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const HOODS = {
  leaside: ['Leaside-Bennington'],
  'lawrence-park': ['Lawrence Park North', 'Lawrence Park South'],
  'the-annex': ['Annex'],
  'bayview-village': ['Bayview Village'],
  'high-park': ['High Park North', 'High Park-Swansea'],
  'the-beaches': ['The Beaches'],
  riverdale: ['North Riverdale', 'South Riverdale'],
  willowdale: ['East Willowdale', 'Willowdale West'],
  'don-mills': ['Banbury-Don Mills'],
  'yonge-eglinton': ['Yonge-Eglinton', 'South Eglinton-Davisville'],
  'islington-village': ['Islington', 'Etobicoke City Centre'],
  'downtown-waterfront': ['Harbourfront-CityPlace', 'St Lawrence-East Bayfront-The Islands'],
};

const W = 1000;
const geo = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const rings = (g) => (g.type === 'MultiPolygon' ? g.coordinates.flat() : g.coordinates);

let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
for (const f of geo.features) for (const r of rings(f.geometry)) for (const [x, y] of r) {
  minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
}
// Equirectangular with the longitude squeezed by cos(latitude): true shapes at this scale.
const k = Math.cos(((minY + maxY) / 2) * (Math.PI / 180));
const scale = W / ((maxX - minX) * k);
const H = Math.round((maxY - minY) * scale);
const project = ([x, y]) => [(x - minX) * k * scale, (maxY - y) * scale];

// Douglas-Peucker, so the page carries the shape without every survey vertex.
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let idx = 0, best = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    // A closed ring starts and ends on the same point, so measure from that point instead of a line.
    const d = len ? Math.abs((b[0] - a[0]) * (a[1] - py) - (a[0] - px) * (b[1] - a[1])) / len : Math.hypot(px - a[0], py - a[1]);
    if (d > best) { best = d; idx = i; }
  }
  return best > tol ? [...simplify(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplify(pts.slice(idx), tol)] : [a, b];
}
const path = (g) => rings(g).map((r) => 'M' + simplify(r.map(project), 0.8).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z').join('');

const byName = new Map(geo.features.map((f) => [f.properties.AREA_NAME, f]));
const guides = Object.entries(HOODS).map(([slug, names]) => {
  const feats = names.map((n) => byName.get(n) ?? (() => { throw new Error(`No City neighbourhood named ${n}`); })());
  // Label at the mean of the vertices, good enough to sit inside these compact shapes.
  const pts = feats.flatMap((f) => rings(f.geometry).flat().map(project));
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return { slug, cityNeighbourhoods: names, d: feats.map((f) => path(f.geometry)).join(''), x: Math.round(cx), y: Math.round(cy) };
});
const used = new Set(Object.values(HOODS).flat());
const others = geo.features.filter((f) => !used.has(f.properties.AREA_NAME)).map((f) => path(f.geometry)).join('');

writeFileSync(
  new URL('../src/data/toronto-map.json', import.meta.url),
  JSON.stringify({ width: W, height: H, source: 'City of Toronto Open Data, Neighbourhoods (158 model)', others, guides }) + '\n'
);
console.log(`toronto-map.json: ${W} x ${H}, ${guides.length} guides, ${geo.features.length} City neighbourhoods`);
