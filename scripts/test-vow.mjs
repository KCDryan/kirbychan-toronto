/**
 * Local security test for the sold-prices accounts and the contact form lead. Bundles the real Pages Functions with esbuild
 * and runs them against node:sqlite standing in for D1, with Resend, Turnstile and PropTx mocked.
 * Nothing leaves this machine.
 *
 *   node scripts/test-vow.mjs
 *
 * Fails loudly on the first broken rule. Run it after any change to src/lib/vow.ts,
 * functions/api/vow/[action].ts or functions/api/sold.ts.
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
  entryPoints: { vow: 'functions/api/vow/[action].ts', sold: 'functions/api/sold.ts', lead: 'functions/api/lead.ts', upload: 'functions/api/upload/[action].ts' },
  bundle: true, format: 'esm', platform: 'neutral', mainFields: ['module', 'main'], outdir: out, outExtension: { '.js': '.mjs' }, logLevel: 'error',
});
const { onRequest: vow } = await import(pathToFileURL(join(out, 'vow.mjs')).href);
const { onRequestGet: sold } = await import(pathToFileURL(join(out, 'sold.mjs')).href);
const leadModule = await import(pathToFileURL(join(out, 'lead.mjs')).href);
const lead = leadModule.onRequestPost ?? leadModule.onRequest;
const { onRequest: upload } = await import(pathToFileURL(join(out, 'upload.mjs')).href);

/** D1's prepare/bind/first/run/all over node:sqlite. */
const sqlite = new DatabaseSync(':memory:');
const db = {
  prepare: (sql) => ({
    bind: (...v) => ({
      first: async () => sqlite.prepare(sql).get(...v) ?? null,
      run: async () => sqlite.prepare(sql).run(...v),
      all: async () => ({ results: sqlite.prepare(sql).all(...v) }),
    }),
  }),
};

const emails = [];
let proptxCalls = 0;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith('https://api.resend.com/')) {
    emails.push(JSON.parse(init.body));
    return new Response('{"id":"x"}', { status: 200 });
  }
  if (u.startsWith('https://challenges.cloudflare.com/')) return Response.json({ success: init.body.get('response') === 'human' });
  if (u.startsWith('https://query.ampre.ca/')) {
    proptxCalls++;
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
