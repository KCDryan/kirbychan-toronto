/**
 * Local security test for the sold-prices accounts, the listing pages and the contact form lead. Bundles the real Pages Functions with esbuild
 * and runs them against node:sqlite standing in for D1, with Resend, Turnstile and PropTx mocked.
 * Nothing leaves this machine.
 *
 *   node scripts/test-vow.mjs
 *
 * Fails loudly on the first broken rule. Run it after any change to src/lib/vow.ts,
 * functions/api/vow/[action].ts, functions/api/sold.ts, functions/api/lead.ts, functions/listing/[key].ts
 * or functions/sitemap-listings.xml.ts.
 */
import { build } from 'esbuild';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import site from '../src/data/site.json' with { type: 'json' };

const out = mkdtempSync(join(tmpdir(), 'vow-test-'));
await build({
  entryPoints: { vow: 'functions/api/vow/[action].ts', sold: 'functions/api/sold.ts', lead: 'functions/api/lead.ts', upload: 'functions/api/upload/[action].ts', listing: 'functions/listing/[key].ts', sitemap: 'functions/sitemap-listings.xml.ts' },
  bundle: true, format: 'esm', platform: 'neutral', mainFields: ['module', 'main'], outdir: out, outExtension: { '.js': '.mjs' }, logLevel: 'error',
});
const { onRequest: vow } = await import(pathToFileURL(join(out, 'vow.mjs')).href);
const { onRequestGet: sold } = await import(pathToFileURL(join(out, 'sold.mjs')).href);
const leadModule = await import(pathToFileURL(join(out, 'lead.mjs')).href);
const lead = leadModule.onRequestPost ?? leadModule.onRequest;
const { onRequest: upload } = await import(pathToFileURL(join(out, 'upload.mjs')).href);
const listingModule = await import(pathToFileURL(join(out, 'listing.mjs')).href);
const { onRequestGet: listingsSitemap } = await import(pathToFileURL(join(out, 'sitemap.mjs')).href);

/** D1's prepare/bind/first/run/all over node:sqlite. */
const sqlite = new DatabaseSync(':memory:');
/** node:sqlite rejects spread values for ?1-style placeholders. D1 accepts them, so bind those by number. */
const bound = (sql, v) => (/\?\d/.test(sql) ? [Object.fromEntries(v.map((val, i) => [i + 1, val]))] : v);
const db = {
  prepare: (sql) => ({
    bind: (...v) => ({
      first: async () => sqlite.prepare(sql).get(...bound(sql, v)) ?? null,
      run: async () => sqlite.prepare(sql).run(...bound(sql, v)),
      all: async () => ({ results: sqlite.prepare(sql).all(...bound(sql, v)) }),
    }),
  }),
};

const emails = [];
let proptxCalls = 0;
/** The listing page tests set this to answer PropTx themselves. */
let feed = null;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith('https://api.resend.com/')) {
    emails.push(JSON.parse(init.body));
    return new Response('{"id":"x"}', { status: 200 });
  }
  if (u.startsWith('https://challenges.cloudflare.com/')) return Response.json({ success: init.body.get('response') === 'human' });
  if (u.startsWith('https://query.ampre.ca/')) {
    proptxCalls++;
    if (feed) return Response.json({ value: feed(decodeURIComponent(u), init) });
    return u.includes('/Media?')
      ? Response.json({ value: [] })
      : Response.json({ '@odata.count': 1, value: [{ ListingKey: 'C1234567', ClosePrice: 900000, InternetEntireListingDisplayYN: true, UnparsedAddress: '1 Test St' }] });
  }
  throw new Error(`Unexpected fetch ${u}`);
};

const env = {
  VOW_DB: db,
  VOW_SECRET: Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64'),
  PROPTX_VOW_TOKEN: 'test', RESEND_API_KEY: 'test', VOW_EMAIL_FROM: 'Kirby Chan & Co. <sold@kirbychantoronto.com>', TURNSTILE_SECRET_KEY: 'test',
};
const ORIGIN = 'https://kirbychantoronto.com';
let pending = [];
async function call(action, body, { cookie, origin = ORIGIN, ip = '203.0.113.1', type = 'application/json' } = {}) {
  const headers = { 'content-type': type, origin, 'cf-connecting-ip': ip };
  if (cookie) headers.cookie = cookie;
  const request = new Request(`${ORIGIN}/api/vow/${action}`, body === undefined ? { headers } : { method: 'POST', headers, body: JSON.stringify(body) });
  const res = await vow({ request, env, params: { action }, waitUntil: (p) => pending.push(p) });
  await Promise.all(pending);
  pending = [];
  return { status: res.status, body: await res.json(), cookie: res.headers.get('set-cookie') };
}
const search = (cookie, qs = 'home=condo') =>
  sold({ request: new Request(`${ORIGIN}/api/sold?${qs}`, { headers: { cookie: cookie ?? '', 'cf-connecting-ip': '203.0.113.9' } }), env });
const token = (kind) => emails.at(-1).text.match(new RegExp(`#${kind}=([0-9a-f]{64})`))[1];
const session = (setCookie) => setCookie.split(';')[0];
let passed = 0;
function ok(cond, what) {
  if (!cond) throw new Error(`FAIL: ${what}`);
  passed++;
  console.log(`  ok  ${what}`);
}

const alice = { name: 'Alice Tremblay', email: 'Alice@Example.com', phone: '416-555-0100', password: 'correct horse 1', terms: true, contact: true, turnstile: 'human' };

console.log('Registration and encryption');
let r = await call('register', alice);
ok(r.status === 200 && r.body.ok, 'sign up accepted');
const dump = JSON.stringify(sqlite.prepare('SELECT * FROM accounts').all()) + JSON.stringify(sqlite.prepare('SELECT * FROM audit').all());
ok(!/alice|tremblay|example\.com|555-0100|203\.0\.113/i.test(dump), 'no plaintext name, email, phone or IP address in the database');
ok(emails.at(-1).to[0] === 'alice@example.com' && emails.at(-1).from.includes('kirbychantoronto.com'), 'confirmation email sent from the Toronto address');
ok(/\/sold\/#verify=[0-9a-f]{64}/.test(emails.at(-1).text), 'confirmation link carries the token after #');
const verifyToken = token('verify');

console.log('Hijack of an unconfirmed account');
r = await call('register', { ...alice, name: 'Mallory', password: 'attacker pass 9' }, { ip: '198.51.100.7' });
ok(r.status === 200, 'second sign up for the same email looks the same as a new one');
ok(/Finish creating your account/.test(emails.at(-1).subject) && emails.at(-1).to[0] === 'alice@example.com', 'the real owner is emailed instead');
r = await call('login', { email: alice.email, password: 'attacker pass 9' }, { ip: '198.51.100.7' });
ok(r.status === 401, 'the attacker password does not work');

console.log('Verification, single-use links and leads');
emails.length = 0;
r = await call('verify', { token: verifyToken });
ok(r.status === 200 && /^__Host-kc_vow=[0-9a-f]{64}; Path=\/; HttpOnly; Secure; SameSite=Lax/.test(r.cookie), 'verify starts a __Host- HttpOnly Secure session');
const aliceCookie = session(r.cookie);
const leadForward = emails.find((e) => e.to[0] === site.leadsEmail);
ok(leadForward && leadForward.reply_to === 'alice@example.com', `confirmed account is emailed to the leads inbox (${site.leadsEmail}) with reply-to the lead`);
ok((await call('verify', { token: verifyToken })).status === 400, 'a used confirmation link cannot be used again');
ok((await call('me', undefined, { cookie: aliceCookie })).body.user?.name === 'Alice Tremblay', 'signed-in user decrypts correctly');

console.log('Sold search limits');
proptxCalls = 0;
let s = await search(aliceCookie, 'home=condo&page=99');
ok(s.status === 200 && (await s.json()).max === 100, 'signed-in search works and reports the 100 result cap');
ok((await search('')).status === 401 && (await search('__Host-kc_vow=' + 'a'.repeat(64))).status === 401, 'no session or a forged session gets nothing');
const aliceId = sqlite.prepare('SELECT id FROM accounts').get().id;
const ins = sqlite.prepare("INSERT INTO audit (user_id, at, action, detail, ip) VALUES (?, ?, 'search', '', NULL)");
for (let i = 0; i < 300; i++) ins.run(aliceId, Date.now());
ok((await search(aliceCookie)).status === 429, 'daily search limit enforced');
sqlite.prepare("DELETE FROM audit WHERE action = 'search'").run();

console.log('Listing pages');
const edge = new Map();
globalThis.caches = { default: { match: async (req) => edge.get(req.url)?.clone(), put: async (req, res) => void edge.set(req.url, res) } };
const SHELL_HTML = '<title>%%LISTING_TITLE%%</title><meta name="robots" content="noindex"><link rel="canonical" href="https://kirbychantoronto.com/homes-for-sale/listing-shell/"><h1>%%LISTING_H1%%</h1>%%LISTING_BODY%%<div id="enquire"></div><input name="page" value="/homes-for-sale/listing-shell/">';
let shellHeaders = { 'content-type': 'text/html', 'x-robots-tag': 'noindex, nofollow', 'content-security-policy': "default-src 'self'" };
const listingEnv = {
  ...env,
  PROPTX_IDX_TOKEN: 'idx',
  ASSETS: {
    fetch: async (u) => {
      const path = new URL(u).pathname;
      if (path === '/homes-for-sale/listing-shell/') return new Response(SHELL_HTML, { headers: shellHeaders });
      if (path === '/listing-areas.json') return Response.json({ areas: { leaside: { name: 'Leaside', path: '/leaside-toronto/', intro: 'Intro.', transit: '', bands: [] } }, medians: { period: 'August 2026', cities: {} } });
      return new Response('not found page', { status: 404 });
    },
  },
};
const view = async (key, cookie) => {
  const res = await listingModule.onRequestGet({ request: new Request(`${ORIGIN}/listing/${key}/`, { headers: { cookie: cookie ?? '', 'cf-connecting-ip': '203.0.113.9' } }), env: listingEnv, params: { key }, waitUntil: (p) => pending.push(p) });
  await Promise.all(pending);
  pending = [];
  return { status: res.status, html: await res.text(), cache: res.headers.get('cache-control'), robots: res.headers.get('x-robots-tag'), csp: res.headers.get('content-security-policy'), nosniff: res.headers.get('x-content-type-options'), type: res.headers.get('content-type'), location: res.headers.get('location') };
};
const remembered = (key) => sqlite.prepare('SELECT address, community, city, lease, home_type, price FROM listing_pages WHERE key = ?').get(key);
const active = { ListingKey: 'C7000001', ListPrice: 1250000, UnparsedAddress: '9 Sample Road, Toronto, ON M4G 1A1', City: 'Toronto C11', CityRegion: 'Leaside', BedroomsTotal: 3, BathroomsTotalInteger: 2, PropertySubType: 'Detached', TransactionType: 'For Sale', ListOfficeName: 'SAMPLE REALTY', PublicRemarks: 'Remarks from the listing.', TaxAnnualAmount: 7200, ListAgentFullName: 'Private Agent', InternetEntireListingDisplayYN: true, InternetAddressDisplayYN: true };
let row = active;
feed = (u) => (u.includes('/Media?') ? [] : u.includes("ListingKey eq '") ? (u.includes('MlsStatus') ? [{ ListingKey: row?.ListingKey, MlsStatus: 'Sold', ClosePrice: 1199000, CloseDate: '2026-09-15', InternetEntireListingDisplayYN: true }] : row ? [row] : []) : []);
let v = await view('C7000001');
ok(v.status === 200 && v.html.includes('$1,250,000') && v.html.includes('Listing courtesy of SAMPLE REALTY. MLS® C7000001.') && !v.html.includes('Private Agent'), 'a live listing page shows the price, the listing brokerage and the MLS number. No field outside the allowlist is shown');
ok(v.html.includes('<link rel="canonical" href="https://kirbychantoronto.com/listing/C7000001/">') && v.html.includes('value="/listing/C7000001/"') && !v.html.includes('noindex') && v.robots === null, 'it is indexable with a canonical to itself. The enquiry form carries its address');
ok(v.cache === 'public, max-age=600' && v.csp === "default-src 'self'" && remembered('C7000001')?.address === active.UnparsedAddress && remembered('C7000001')?.home_type === 'Detached' && remembered('C7000001')?.price === 1250000, 'it keeps the shell security headers and is remembered for later, including the type and price used to find similar homes');
row = { ...active, ListingKey: 'C7000002', TransactionType: 'For Lease', ListPrice: 4200 };
v = await view('C7000002');
ok(v.status === 200 && v.robots === 'noindex' && v.html.includes('noindex') && !v.html.includes('land transfer tax'), 'a lease has a page with no purchase costs and is not offered to search engines');
ok(remembered('C7000002')?.lease === 1 && remembered('C7000002')?.city === 'Toronto C11', 'a rental is remembered with its city and as a rental');
row = active;
shellHeaders = { 'content-type': 'text/html' };
edge.clear();
v = await view('C7000001');
ok(v.status === 200 && v.csp?.includes("frame-ancestors 'self'") && v.csp.includes('challenges.cloudflare.com') && v.nosniff === 'nosniff', 'when the shell comes without security headers the listing page sets them itself');
shellHeaders = { 'content-type': 'text/html', 'x-robots-tag': 'noindex, nofollow', 'content-security-policy': "default-src 'self'" };
edge.clear();
let asked = '';
row = { ...active, ListingKey: 'C7000010', PropertySubType: 'Parking Space' };
feed = (u) => ((asked += u + '\n'), u.includes('/Media?') ? [] : [row]);
await view('C7000010');
ok(/ListingKey eq 'C7000010' and .*startswith\(PropertyType,'Residential'\) and .*PropertySubType ne 'Parking Space' and PropertySubType ne 'Locker'/.test(asked), 'a pasted key is looked up among homes only, so a parking space or locker has no page');
feed = () => { throw new Error('feed down'); };
console.error = () => {};
edge.clear();
v = await view('C7000001');
ok(v.status === 503 && v.robots === 'noindex' && v.type === 'text/plain; charset=utf-8', 'the feed not answering gives a 503 that is noindex and plain text');
feed = (u) => (u.includes('/Media?') ? [] : u.includes("ListingKey eq '") ? (u.includes('MlsStatus') ? [{ ListingKey: row?.ListingKey, MlsStatus: 'Sold', ClosePrice: 1199000, CloseDate: '2026-09-15', InternetEntireListingDisplayYN: true }] : row ? [row] : []) : []);
row = { ...active, ListingKey: 'C7000003', InternetAddressDisplayYN: false };
v = await view('C7000003');
ok(v.status === 200 && !v.html.includes('Sample Road') && remembered('C7000003').address === null, 'an address the seller keeps off the internet is neither shown nor stored');
sqlite.prepare("INSERT INTO listing_pages (key, address, community, first_seen, last_seen) VALUES ('C7000004', '4 Hidden Street', 'Leaside', 1, 1)").run();
row = { ...active, ListingKey: 'C7000004', InternetEntireListingDisplayYN: false };
v = await view('C7000004');
ok(v.status === 404 && !remembered('C7000004'), 'a listing the seller keeps off the internet has no page and is forgotten');
row = null;
ok((await view('C7999999')).status === 404, 'a key this site never showed is not a page');
edge.clear();
proptxCalls = 0;
v = await view('C7000001');
ok(v.status === 301 && v.location === `${ORIGIN}/leaside-toronto/` && v.cache === 'no-store' && !v.html.includes('no longer available'), 'a gone listing in a neighbourhood we publish redirects to that guide');
const auditBefore = sqlite.prepare("SELECT COUNT(*) AS n FROM audit WHERE action = 'search'").get().n;
v = await view('C7000001', aliceCookie);
ok(v.status === 301 && v.location === `${ORIGIN}/leaside-toronto/` && auditBefore === 0, 'a signed-in visitor is redirected too, and no sold lookup is spent on a redirect');
row = { ...active, ListingKey: 'C7000001' };
v = await view('C7000001');
ok(v.status === 200 && v.html.includes('$1,250,000') && v.location === null, 'the same MLS key back on the market is a normal listing page, because the redirect was not cached');
row = null;
sqlite.prepare("INSERT INTO listing_pages (key, address, community, city, lease, home_type, price, first_seen, last_seen) VALUES ('C7000011', '11 Side Street', 'Woburn', 'Toronto E08', 0, NULL, NULL, 1, 1), ('C7000012', '12 Side Street', 'Woburn', 'Toronto E08', 1, NULL, NULL, 1, 1), ('C7000013', '13 Park Street', 'Lawrence Park South', 'Toronto C10', 0, NULL, NULL, 1, 1), ('C7000007', '7 Union Street', 'Unionville', 'Markham', 0, 'Detached', 1250000, 1, 1)").run();
const current = { ListingKey: 'C7000009', ListPrice: 990000, UnparsedAddress: '9 Current Road, Toronto, ON', City: 'Toronto C10', CityRegion: 'Lawrence Park South', BedroomsTotal: 3, BathroomsTotalInteger: 2, PropertySubType: 'Detached', TransactionType: 'For Sale', ListOfficeName: 'SAMPLE REALTY', InternetEntireListingDisplayYN: true, InternetAddressDisplayYN: true };
asked = '';
feed = (u) => {
  asked += decodeURIComponent(u) + '\n';
  if (u.includes('/Media?')) return [];
  if (u.includes('MlsStatus')) return [{ ListingKey: 'C7000007', MlsStatus: 'Sold', ClosePrice: 1199000, CloseDate: '2026-09-15', InternetEntireListingDisplayYN: true }];
  if (u.includes("ListingKey eq '")) return [];
  return [current];
};
v = await view('C7000011');
ok(v.status === 410 && v.robots === 'noindex' && v.html.includes('noindex') && v.html.includes('This home has sold.') && v.html.includes('href="/homes-for-sale/"') && v.html.includes('href="/listing/C7000009/"') && v.html.includes('id="enquire"') && !v.html.includes('1,250,000') && !v.html.includes('1,199,000'), 'a Toronto listing outside the guides answers 410 with current homes and the enquiry form, and no old price');
ok(asked.includes("startswith(City,'Toronto')") && !asked.includes('CityRegion in'), 'that search is Toronto-wide when the community is not one we cover');
asked = '';
v = await view('C7000012');
ok(v.status === 410 && v.html.includes('This home has been leased.') && v.html.includes('href="/homes-for-sale/?for=lease"') && !v.html.includes('This home has sold'), 'a Toronto rental outside the guides says it has been leased and links to homes for rent');
ok(asked.includes("TransactionType eq 'For Lease'"), 'the rental search asks the feed for leases');
asked = '';
v = await view('C7000013');
ok(v.status === 410 && v.location === null && asked.includes("CityRegion in ('Lawrence Park South','Lawrence Park North')"), 'a covered community with no published guide answers 410 and the similar homes stay in that community');
edge.clear();
asked = '';
v = await view('C7000007');
ok(v.status === 410 && v.robots === 'noindex' && v.html.includes('This home has sold.') && v.html.includes('href="/listing/C7000009/"') && v.html.includes('id="enquire"') && !/1,250,000|1,199,000|Remarks from|Sold<\/strong>|<img/.test(v.html) && v.cache === 'public, max-age=600', 'a gone listing outside Toronto answers 410 without its old price, photos or remarks');
ok(asked.includes("startswith(City,'Toronto')") && !asked.includes("City eq 'Markham'") && asked.includes('ListPrice ge 1200000') && asked.includes("PropertySubType eq 'Detached'"), 'similar homes use the remembered type and price band, and stay in Toronto');
ok(v.html.includes('/sold/') && !v.html.includes('1,199,000'), 'a visitor who is not signed in is pointed to sign in and sees no sold price');
v = await view('C7000007', aliceCookie);
ok(v.status === 410 && v.html.includes('<strong>Sold</strong> for $1,199,000 on 2026-09-15') && v.cache === 'private, no-store', 'a signed-in account sees the sold price on a 410 page that is never cached');
ok(sqlite.prepare("SELECT COUNT(*) AS n FROM audit WHERE action = 'search' AND detail = 'listing=C7000007'").get().n === 1 && auditBefore === 0, 'that sold lookup is in the audit trail');
ok(!(await view('C7000007')).html.includes('1,199,000') && !(await view('C7000007', '__Host-kc_vow=' + 'a'.repeat(64))).html.includes('1,199,000'), 'the sold price never reaches the shared cache or a forged session');
for (let i = 0; i < 300; i++) ins.run(aliceId, Date.now());
ok(!(await view('C7000007', aliceCookie)).html.includes('1,199,000'), 'sold lookups on listing pages stop at the daily search limit');
sqlite.prepare("DELETE FROM audit WHERE action = 'search'").run();
row = null;
edge.clear();
v = await view('C7000002', aliceCookie);
ok(v.status === 301 && v.location === `${ORIGIN}/leaside-toronto/` && sqlite.prepare("SELECT COUNT(*) AS n FROM audit WHERE detail = 'listing=C7000002'").get().n === 0, 'an off-market rental in a published neighbourhood redirects there, with no sold lookup');

// The table already exists in production without city and lease: the columns are added once and a second run changes nothing.
const old = new DatabaseSync(':memory:');
old.exec('CREATE TABLE listing_pages (key TEXT PRIMARY KEY, address TEXT, community TEXT, first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL)');
old.exec("INSERT INTO listing_pages VALUES ('C1000001', '1 Old Street', 'Leaside', 1, 1)");
const oldDb = { prepare: (sql) => ({ bind: (...v) => ({ run: async () => old.prepare(sql).run(...v), all: async () => ({ results: old.prepare(sql).all(...v) }), first: async () => old.prepare(sql).get(...v) ?? null }) }) };
await listingModule.ensureListingTable(oldDb);
await listingModule.ensureListingTable(oldDb);
const migrated = old.prepare("SELECT city, lease FROM listing_pages WHERE key = 'C1000001'").get();
ok(migrated.city === null && migrated.lease === 0 && old.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('listing_pages')").get().n === 9, 'an existing listing_pages table gains city, lease, home type and price safely and a second run does not throw');
await listingModule.ensureListingTable(db);
ok(sqlite.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('listing_pages')").get().n === 9, 'a new table has the same nine columns');

sqlite.prepare("INSERT INTO listing_pages (key, address, community, first_seen, last_seen) VALUES ('C7000006', '6 Old Street', 'Leaside', 1, 1)").run();
feed = (u) => (u.includes('$skip=0') ? [{ ListingKey: 'C7000005', UnparsedAddress: "5 O'Brien Avenue", CityRegion: 'Leaside', ModificationTimestamp: '2026-10-05T12:00:00Z', InternetAddressDisplayYN: false }, { ListingKey: 'C7000001', UnparsedAddress: '9 New Name Road', CityRegion: 'Leaside' }, { ListingKey: 'C7000006', InternetEntireListingDisplayYN: false }, { ListingKey: 'C7000008"><x', UnparsedAddress: 'Bad Key' }] : []);
const sm = await listingsSitemap({ request: new Request(`${ORIGIN}/sitemap-listings.xml`), env: listingEnv, waitUntil: (p) => pending.push(p) });
await Promise.all(pending);
pending = [];
const smXml = await sm.text();
ok(sm.status === 200 && smXml.includes('<loc>https://kirbychantoronto.com/listing/C7000005/</loc><lastmod>2026-10-05T12:00:00Z</lastmod>') && !smXml.includes('C7000006') && !smXml.includes('C7000002') && !smXml.includes('C7000003') && sm.headers.get('x-listings') === '2', 'the listings sitemap lists active listings only. Hidden listings and keys merely remembered from an earlier day stay out');
ok(!smXml.includes('C7000008') && !smXml.includes('<x') && sm.headers.get('x-content-type-options') === 'nosniff', 'a listing key is validated before it goes into the XML and the sitemap says nosniff');
ok(remembered('C7000005')?.address === null && remembered('C7000001').address === '9 New Name Road' && !remembered('C7000006'), 'the sitemap run remembers every listing in one statement without hidden addresses. It forgets withdrawn consent');
feed = null;
proptxCalls = 0;

console.log('Cross-site posts');
ok((await call('login', { email: alice.email, password: alice.password }, { origin: 'https://evil.example' })).status === 403, 'a post from another origin is refused');
ok((await call('login', { email: alice.email, password: alice.password }, { type: 'text/plain' })).status === 403, 'a post that is not JSON is refused');
ok((await call('register', { ...alice, email: 'bot@example.com', turnstile: 'robot' }, { ip: '192.0.2.50' })).status === 403, 'sign up without a passing Turnstile is refused');

console.log('Per-account lockout');
for (let i = 0; i < 10; i++) await call('login', { email: alice.email, password: 'wrong guess ' + i }, { ip: `192.0.2.${100 + i}` });
r = await call('login', { email: alice.email, password: alice.password }, { ip: '192.0.2.200' });
ok(r.status === 429 && r.body.error === 'locked', 'ten wrong passwords from ten addresses lock the account, even for the right password');
emails.length = 0;
await call('forgot', { email: alice.email, turnstile: 'human' });
const resetToken = token('reset');
r = await call('reset', { token: resetToken, password: 'a brand new pass 2' });
ok(r.status === 200, 'a reset link sets a new password');
ok((await call('reset', { token: resetToken, password: 'another pass 33' })).status === 400, 'a used reset link cannot be used again');
ok((await call('me', undefined, { cookie: aliceCookie })).body.user === null, 'a new password signs out other sessions');
ok((await call('login', { email: alice.email, password: 'a brand new pass 2' })).status === 200, 'the reset unlocks the account');

console.log('90-day passwords');
// 91 days on: the password is old and the wrong guesses above are long past.
sqlite.prepare('UPDATE accounts SET pass_set_at = ?').run(Date.now() - 91 * 864e5);
sqlite.prepare("UPDATE audit SET at = at - ? WHERE action = 'login-fail'").run(91 * 864e5);
emails.length = 0;
r = await call('login', { email: alice.email, password: 'a brand new pass 2' });
ok(r.status === 403 && r.body.error === 'expired' && /90 days/.test(emails.at(-1)?.text ?? ''), 'a password older than 90 days is refused and a reset link is emailed');
sqlite.prepare('UPDATE sessions SET expires_at = ?').run(Date.now() + 864e5);
ok((await search(session(r.cookie ?? '') || aliceCookie)).status === 401, 'an expired password cannot search even with a live session');

console.log('Sign-up flood');
let last;
for (let i = 0; i < 12; i++) last = await call('register', { ...alice, email: `flood${i}@example.com`, turnstile: 'human' }, { ip: '198.18.0.1' });
ok(last.status === 429, 'more than ten sign ups or resets from one address in an hour are refused');

console.log('Contact form lead');
emails.length = 0;
const form = new FormData();
for (const [k, v] of Object.entries({ name: 'Bob Singh', email: 'bob@example.com', phone: '647-555-0199', consent: 'yes', message: 'Thinking about downsizing from Leaside.', 'cf-turnstile-response': 'human' })) form.append(k, v);
const lr = await lead({ request: new Request(`${ORIGIN}/api/lead`, { method: 'POST', headers: { accept: 'application/json', 'cf-connecting-ip': '203.0.113.5' }, body: form }), env: { ...env, VOW_DB: undefined } });
const leadMail = emails.find((e) => e.to[0] === site.leadsEmail);
ok(lr.status === 200 && leadMail?.reply_to === 'bob@example.com' && leadMail.text.includes('Leaside'), `contact form enquiry is emailed to ${site.leadsEmail} with reply-to the sender`);
const stored = () => sqlite.prepare('SELECT name, email, source, emailed, payload FROM leads ORDER BY id').all();
const post = (extra) => lead({ request: new Request(`${ORIGIN}/api/lead`, { method: 'POST', headers: { accept: 'application/json', 'cf-connecting-ip': '203.0.113.5' }, body: (() => { const f = new FormData(); for (const [k, v] of form.entries()) f.append(k, v); f.set('source', 'listing-page'); f.set('page', '/listing/C7000001/'); return f; })() }), env: { ...env, ...extra } });
ok((await post({})).status === 200 && stored().length === 1 && stored()[0].emailed === 1 && stored()[0].source === 'listing-page' && JSON.parse(stored()[0].payload).page === '/listing/C7000001/', 'an enquiry is kept in the database with its form and page and is marked as emailed');
ok(emails.at(-1).text.includes('Page: /listing/C7000001/') && emails.at(-1).text.includes('Form: listing-page'), 'the email says which listing and which form the enquiry came from');
ok((await post({ RESEND_API_KEY: undefined })).status === 200 && stored().length === 2 && stored()[1].emailed === 0, 'when email is down the enquiry is still kept and the visitor is not told it failed');
ok((await post({ RESEND_API_KEY: undefined, VOW_DB: undefined })).status === 502, 'with no database and no email the visitor is told to call');
const bad = new FormData();
for (const [k, v] of Object.entries({ name: 'Bot', email: 'bot@example.com', consent: 'yes', 'cf-turnstile-response': 'robot' })) bad.append(k, v);
ok((await lead({ request: new Request(`${ORIGIN}/api/lead`, { method: 'POST', headers: { accept: 'application/json' }, body: bad }), env })).status === 403, 'an enquiry that fails Turnstile is refused');

console.log('Blog upload sign in');
const uploadEnv = { VOW_DB: db, UPLOAD_PASSWORD: 'shared test pass 42', ASSETS: { fetch: async () => new Response('', { status: 404 }) } };
const up = async (action, body, { cookie, origin = ORIGIN, ip = '203.0.113.70' } = {}) => {
  const headers = { 'content-type': 'application/json', origin, 'cf-connecting-ip': ip, ...(cookie ? { cookie } : {}) };
  const init = body === undefined ? { headers } : { method: 'POST', headers, body: JSON.stringify(body) };
  const res = await upload({ request: new Request(`${ORIGIN}/api/upload/${action}`, init), env: uploadEnv, params: { action }, waitUntil: () => {} });
  return { status: res.status, cookie: res.headers.get('set-cookie') };
};
ok((await up('list')).status === 401 && (await up('unpublish', { slug: 'x' })).status === 401, 'uploads need a session');
ok((await up('login', { password: 'shared test pass 42' }, { origin: 'https://evil.example' })).status === 403, 'an upload sign in from another site is refused');
const upCookie = (await up('login', { password: 'shared test pass 42' })).cookie;
ok(/^__Host-kc_upload=[0-9a-f]{64}; Path=\/; HttpOnly; Secure; SameSite=Strict/.test(upCookie ?? ''), 'the shared password starts a __Host- HttpOnly Secure session');
// requireOneCutPro is on: signed in is not enough until a OneCut Content account is connected.
ok((await up('list', undefined, { cookie: session(upCookie) })).status === 403, 'a signed in session with no OneCut account cannot list uploads');
for (let i = 0; i < 10; i++) await up('login', { password: `guess ${i}` }, { ip: '192.0.2.77' });
ok((await up('login', { password: 'shared test pass 42' }, { ip: '192.0.2.77' })).status === 429, 'ten wrong upload passwords lock that address for an hour');
ok((await upload({ request: new Request(`${ORIGIN}/api/upload/me`), env: { ...uploadEnv, UPLOAD_PASSWORD: 'short' }, params: { action: 'me' } })).status === 200 &&
  (await up('login', { password: 'short' }, {})).status !== 200, 'a password under 12 characters is never accepted');

console.log(`\nSecurity test passed: ${passed} checks.`);
