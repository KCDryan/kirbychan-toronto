# kirbychantoronto.com

Hyperlocal Toronto real estate site for Kirby Chan &amp; Co. Real Estate Team, eXp Realty Brokerage.
Started as a copy of kirbychanmarkham.com and rebuilt for the City of Toronto in U of T Blue.

Astro, static output, no client framework, plus a few Cloudflare Pages Functions under
`functions/api/`. The code lives in the private GitHub repository `KCDryan/kirbychan-toronto` and
deploys to Cloudflare Pages through the GitHub integration: every push to `main` builds and goes
live.

---

## Quick start

You need Node 22, which is what `.nvmrc` pins and what this project is tested on. Keep
`package-lock.json` committed. Without it Cloudflare falls back to Bun and its own default Node
version, which is not the combination this was tested on.

```bash
npm install
npm run dev
```

The dev server prints a local URL. Every npm script in `package.json`:

| Command | What it does |
| --- | --- |
| `npm run dev` / `npm start` | Local dev server with hot reload |
| `npm run dev:cms` | Dev server with the TinaCMS editor at `/admin/index.html`, saving to local files |
| `npm run build` | Production build into `dist/` (`scripts/build.mjs`, which also builds Tina when its credentials are set) |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run check` | `astro check`, types and content schemas |
| `npm run check:style` | House style: dashes, commas before "and" or "or", American spellings |
| `npm run check:blog` | Blog SEO rules (titles, lengths, word count, headings, links, sources) |
| `npm run check:translations` | Translated guides use only their own script and only figures found in the English source |
| `npm run check:tina-lock` | `tina/tina-lock.json` matches `tina/config.ts` |
| `npm run check:links` | Scan `dist/` for broken internal links |
| `npm run check:thin` | Fail any indexable English page under 300 words |
| `npm run clean:cache` | Delete `.astro`, `node_modules/.astro` and `dist` |
| `npm run verify` | clean:cache, style, blog, translations, tina-lock, check, build, links, thin. Run this before you push |

The Functions (`/api/lead`, `/api/listings`, `/api/sold`, `/api/vow/*`, `/api/listing-counts`) are
not part of the Astro build. To try them locally, build and serve with Wrangler, putting any
secrets you need in a `.dev.vars` file that is never committed:

```bash
npm run build && npx wrangler pages dev dist
```

Do not add a `wrangler.toml` to the repository. Cloudflare Pages would then read its build
configuration from the file instead of the dashboard and the deploy would fail with
`Output directory "dist" not found`.

---

## Where everything lives

```
src/
  content/          all editable page content, as MDX
    neighbourhoods/ 12 neighbourhood guides, served at /<slug>-toronto/
    guides/         9 pillar guides at /<slug>/, with fa/, fr/ and zh/ translations
    services/       9 situation pages at /services/<slug>/
    blog/           blog posts at /blog/<slug>/, agents' quick posts in blog/quick/
    videos/         video pages
    market-reports/ market reports
    news/           news roundups (template only until the first run)
  data/             site settings, market figures, TRREB monthly figures, map, testimonials, credits, nav
  i18n/             translations: en.json is the source, one file per language, index.ts routing
  views/            pages shared by every language (home, Meet Kirby)
  components/       reusable pieces
  layouts/          page shells
  pages/            routes
  lib/              SEO and JSON-LD helpers, land transfer tax, comparisons, hubs, VOW accounts
  styles/           tokens.css (design system) and global.css
functions/api/      Cloudflare Pages Functions: lead form, PropTx IDX and VOW, listing counts
public/             fonts, favicon, OG image, _headers, _redirects, robots.txt, IndexNow key
scripts/            build, checks, Toronto map builder, IndexNow ping
tina/               TinaCMS config for agents' quick posts
```

`src/content.config.ts` defines the schema for every content type. If a required field is missing
or a title is too long, the build fails with a message naming the file. That is deliberate.

---

## The pages

| URL | Source |
| --- | --- |
| `/<slug>-toronto/` | `src/content/neighbourhoods/<slug>.mdx`. Slugs: `leaside`, `lawrence-park`, `yonge-eglinton`, `don-mills`, `the-annex`, `bayview-village`, `willowdale`, `downtown-waterfront`, `high-park`, `the-beaches`, `riverdale`, `islington-village` |
| `/<slug>/` | `src/content/guides/<slug>.mdx`: `downsizing-toronto`, `first-time-home-buyers-toronto`, `investment-property-toronto`, `luxury-homes-toronto`, `new-construction-toronto`, `relocating-to-toronto`, `selling-a-home-after-separation-toronto`, `selling-an-estate-home-toronto`, `upsizing-toronto` |
| `/land-transfer-tax-calculator-toronto/` | Ontario plus City of Toronto municipal land transfer tax, from `src/lib/ltt.ts` |
| `/mortgage-calculator-toronto/` | Mortgage calculator |
| `/toronto-house-prices/` | City of Toronto figures from `src/data/trreb-monthly.json` (`toronto` and `torontoByType`) |
| `/toronto-vs-markham/`, `/toronto-vs-mississauga/`, `/toronto-vs-vaughan/` | `src/lib/comparisons.ts`, reading `toronto` and `cities.markham`, `cities.mississauga`, `cities.vaughan` in `src/data/trreb-monthly.json` |
| `/best-toronto-neighbourhoods-for-downsizing/`, `-families/`, `-commuters/` | `src/lib/neighbourhood-hubs.ts` |
| `/map-of-toronto/` | `src/data/toronto-map.json`, built by `scripts/build-toronto-map.mjs` from the City of Toronto Open Data neighbourhood boundaries |
| `/homes-for-sale/` | PropTx IDX search through `/api/listings` |
| `/sold/` | Sold prices for registered, verified accounts (PropTx VOW) through `/api/vow/*` and `/api/sold` |

`public/_redirects` sends short forms such as `/leaside/` and `/neighbourhoods/leaside/` to the
`-toronto` URL.

---

## Editing content

### Site-wide settings

`src/data/site.json` holds the site URL, phone number, public email, office address, brokerage
details, social URLs, the GA4 measurement ID (`ga4`) and the inbox that receives leads
(`leadsEmail`). The address is the real registered office in Richmond Hill. Never replace it with an
invented Toronto address.

Leaving `links.booking` empty is safe. Booking buttons fall back to `/contact/`.

### A neighbourhood guide

Edit the matching file in `src/content/neighbourhoods/`. The frontmatter drives the hero, the quick
stats table, the price bands table, the nearby neighbourhood links, the related services, the FAQ
and the sources. The body below it is the prose. The URL comes from the file name plus `-toronto`:
`leaside.mdx` becomes `/leaside-toronto/`.

Each guide is tied to one or two TRREB communities in `src/data/market.json`. Guides that span two
communities list both under TRREB's own names:

| Guide | TRREB community | Report |
| --- | --- | --- |
| leaside | Leaside | Toronto Central |
| lawrence-park | Lawrence Park North, Lawrence Park South | Toronto Central |
| yonge-eglinton | Yonge-Eglinton, Mount Pleasant West | Toronto Central |
| don-mills | Banbury-Don Mills | Toronto Central |
| the-annex | Annex | Toronto Central |
| bayview-village | Bayview Village | Toronto Central |
| willowdale | Willowdale East, Willowdale West | Toronto Central |
| downtown-waterfront | Waterfront Communities C1, Waterfront Communities C8 | Toronto Central |
| high-park | High Park-Swansea, High Park North | Toronto West |
| islington-village | Islington-City Centre West | Toronto West |
| the-beaches | The Beaches | Toronto East |
| riverdale | North Riverdale, South Riverdale | Toronto East |

If you add a thirteenth guide, add its communities to `src/data/market.json`, add it to
`scripts/build-toronto-map.mjs` and rebuild the map.

### A blog post

Blog posts live in `src/content/blog/` and are served at `/blog/<file-name>/`, with a paginated
index at `/blog/`, category pages at `/blog/category/<category>/` and an RSS feed at
`/blog/rss.xml`. Categories are in `src/lib/blog.ts`. Follow `BLOG-PLAYBOOK.md` for every post.
Topics wait in `BLOG-TOPICS.md` and every run is recorded in `BLOG-LOG.md`.

Agents can publish shorter quick posts through TinaCMS. See `TINA-CMS.md`, `AGENT-BLOG-GUIDE.md`
and `AGENT-BLOG-PROMPT.md`.

### Market figures

- `src/data/market.json`: TRREB median sale price, all property types, per community, from the
  quarterly Toronto Central, Toronto East and Toronto West community reports. Currently Q2 2026.
  It feeds the homepage ticker. A `null` price is skipped and the band hides if every price is
  `null`, so the homepage never shows an empty or invented figure.
- `src/data/trreb-monthly.json`: one month of TRREB Market Watch figures for the City of Toronto,
  Toronto by home type and Markham, Mississauga and Vaughan. It feeds `/toronto-house-prices/` and
  the three comparison pages, which write their sentences from the numbers.
- `src/data/why-toronto.json`: the four sourced city facts on the homepage band.

`UPDATE-PLAYBOOK.md` says how each is refreshed.

### A market report

Copy `src/content/market-reports/template.mdx`, rename it for the period (for example
`september-2026.mdx`), set `period` and `published`, fill in the figures and delete the
`draft: true` line. While `draft` is true the report is not built.

### Stats, testimonials and client stories

The homepage figures (Google reviews, rating, languages, guides) are the ones the team publishes on
kirbychanandco.com. They live in `home.stats` in `src/i18n/en.json` and in each translation file,
so change every file when a count changes. `src/data/testimonials.json` holds exact excerpts from
public Google reviews and `src/data/client-stories.json` the client stories published on
kirbychanandco.com. Never add an invented quote or figure.

### Languages

The site is published in English plus Simplified Chinese (`/zh/`), French (`/fr/`), Farsi (`/fa/`,
right to left), Russian (`/ru/`), Spanish (`/es/`), Greek (`/el/`) and Japanese (`/ja/`). The home,
Meet Kirby, services, neighbourhoods index and contact pages exist in every language. The pillar
guides are also translated into Chinese, French and Farsi. Neighbourhood guides, blog posts, news
and legal pages are English only.

All translated interface text lives in `src/i18n/<code>.json`, with the same keys as `en.json`.
When you change English text in `en.json`, update the same key in the seven other files.

### Photos and the logo

Drop a file into the right folder with the right name, commit it and it replaces the old one on the
next deploy. The build creates AVIF and WebP versions at several sizes. The names and crops are in
`src/assets/photos/README.md`. Photos from Wikimedia Commons carry their credit from
`src/data/photo-credits.json`, as their licences require.

---

## Automated updates

A scheduled Claude agent follows `UPDATE-PLAYBOOK.md` every two weeks and pushes straight to
`main`. Each run:

1. **Market figures.** Refreshes `market.json` from TRREB's quarterly Toronto community reports and
   publishes a market report when TRREB has something newer.
2. **Toronto news.** Publishes a sourced roundup at `/news/` from toronto.ca, the TTC, Metrolinx and
   the school boards.
3. **Fact check.** Re-verifies three neighbourhood guides, oldest first, and stamps them with a
   review date and their sources.
4. **Monthly figures.** Refreshes `trreb-monthly.json` from the newest TRREB Market Watch.

A separate blog routine follows `BLOG-PLAYBOOK.md` and publishes at most one post a day.

Guardrails built into the repository, not just the instructions:

- Every news item and cited fact must carry a full https source URL. The schema rejects anything
  without one and the build fails.
- `npm run verify` must pass before an agent may push.
- Each playbook lists the only files its agent may touch.
- Every run writes to `UPDATE-LOG.md` or `BLOG-LOG.md` with its sources and anything that needs
  your attention.

**After each run, skim the log.** If something published is wrong, revert that commit on GitHub or
use **Rollback** in Cloudflare, then fix the playbook so it does not happen again.

---

## House style

Enforced by `npm run check:style` in CI and in the Cloudflare build.

- Canadian English: neighbourhood, colour, centre, licence (noun), cheque.
- No em dashes and no en dashes anywhere, including number ranges.
- No comma directly before "and" or "or", including between independent clauses.
- No exclamation marks and no emoji.
- Never publish a number you cannot point to a source for.
- Never publish a client story without written permission.

---

## Design system

`src/styles/tokens.css` holds every colour, type step and spacing value. Change a token there and it
changes everywhere. The palette is U of T Blue (Pantone 655) on the same light paper and brass
used across the Kirby Chan &amp; Co. sites.

| Token | Hex | Use |
| --- | --- | --- |
| `--brand` | `#1E3765` | Primary buttons, links, eyebrows, accents |
| `--brand-dark` | `#152747` | Primary button hover |
| `--ground` | `#0F1C33` | Utility bar, footer, dark bands |
| `--ground-lift` | `#1A2D4F` | Raised surfaces on dark bands |
| `--brass` / `--brass-soft` | `#C2A06A` / `#E0CDA8` | Small accents, numerals, rules |
| `--paper` / `--mist` | `#F8F8F5` / `#EDF1F7` | Page and alternate section backgrounds |
| `--ink` | `#1A2130` | Body text |

Contrast, computed with the WCAG 2.1 relative luminance formula:

| Combination | Ratio | Use |
| --- | --- | --- |
| ink on paper | 15.1:1 | Body text |
| muted `#4D586B` on paper / mist | 6.8:1 / 6.3:1 | Secondary text |
| brand on paper / white | 11.0:1 / 11.7:1 | Links, eyebrows, accents |
| paper on brand | 11.0:1 | Primary button text |
| paper on brand-dark | 14.0:1 | Primary button hover |
| brass on ground | 6.9:1 | Small accents on the dark footer |
| ground on brass | 6.9:1 | Brass button text |
| on-dark `#EEF2F8` on ground | 15.1:1 | Text on dark bands |
| on-dark-muted `#AAB6C9` on ground | 8.3:1 | Secondary text on dark bands |
| footer `#8E9BB0` on ground | 6.1:1 | Footer small print |
| brass on paper | 2.3:1 | **Fails.** Decorative only on light backgrounds: rules, numerals, borders |

Typefaces are Montserrat (headings) and Lato (body), self hosted from `public/fonts` under the SIL
Open Font License. No third party font request is made.

---

## Environment variables

Set these in the Cloudflare Pages project under **Settings > Variables and secrets**, for
Production and Preview. For local work, copy `.env.example` to `.env` (build time values) and use
`.dev.vars` for Functions. Never commit either file.

| Variable | Used by | Type |
| --- | --- | --- |
| `PROPTX_IDX_TOKEN` | `/api/listings`, `/api/listing-counts` (PropTx IDX feed) | Secret |
| `PROPTX_VOW_TOKEN` | `/api/sold` and the VOW sign up (PropTx VOW feed) | Secret |
| `VOW_SECRET` | Encryption and signing for VOW accounts. **Never change or delete it**: every account becomes unreadable | Secret |
| `RESEND_API_KEY` | Emails: leads to `leadsEmail` and VOW confirmation and reset messages | Secret |
| `VOW_EMAIL_FROM` | The sender address for those emails, on a domain verified in Resend | Plain |
| `TURNSTILE_SITE_KEY` | Rendered into the forms at build time | Plain, public by design |
| `TURNSTILE_SECRET_KEY` | Turnstile check in the Functions | Secret |
| `TINA_CLIENT_ID` | Build of the TinaCMS editor at `/admin/` | Plain |
| `TINA_TOKEN` | Build of the TinaCMS editor at `/admin/` | Secret |
| `LEAD_WEBHOOK_URL` | Optional. `/api/lead` also POSTs each lead there as JSON (for example a Zapier hook into Lofty) | Secret |
| `NODE_VERSION` | Build image | Plain, `22` |

`TURNSTILE_SITE_KEY` must be available at build time because it is baked into the HTML. The sold
section stays switched off until `VOW_DB`, `VOW_SECRET`, `PROPTX_VOW_TOKEN`, `RESEND_API_KEY`,
`VOW_EMAIL_FROM` and `TURNSTILE_SECRET_KEY` are all present. The editor is only built when both Tina
variables are set, so a build without them is the plain site.

### D1 database

VOW accounts, sessions and the search audit trail are stored in a Cloudflare D1 database named
`kirbychan-toronto-vow`. Create it under **Storage and Databases > D1**, then in the Pages project
add a D1 binding under **Settings > Bindings** with the variable name `VOW_DB`, for Production and
Preview. The Functions create the tables on first use.

---

## Deploying to Cloudflare Pages

One time setup in the Cloudflare dashboard. This must be a **Pages** project, not a Worker. If the
build log contains `Executing user deploy command`, you are on a Worker: delete it and start again
on the Pages tab.

1. **Workers &amp; Pages > Create > Pages > Connect to Git**, authorise GitHub and pick
   `KCDryan/kirbychan-toronto`. Name the project anything clear, for example `kirbychan-toronto`.
2. Build settings:
   - Production branch: `main`
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: leave blank
3. Add the variables and secrets above and the `VOW_DB` binding.
4. Save and deploy.
5. **Custom domain.** Put `kirbychantoronto.com` on Cloudflare DNS, then in the Pages project go to
   **Custom domains** and add `kirbychantoronto.com` and `www.kirbychantoronto.com`.
6. **Turnstile.** Add a widget for `kirbychantoronto.com`, copy both keys into the variables and
   redeploy so the site key is baked in.

**Every push to `main` deploys straight to production.** If you want a safety net, push to a branch
first and let Cloudflare build a preview URL for it.

### Rolling back

In the Pages project open **Deployments**, find the last good one and choose **Rollback to this
deployment**. That is faster than fixing forward under pressure.

---

## What runs in GitHub Actions

`.github/workflows/ci.yml` runs on every push to `main`, on pull requests and on demand: quick post
preparation, blog rules, translations, `astro check`, build, link check, thin page check and house
style. It runs independently of Cloudflare, so a red CI run does not block a deploy. Watch both.

`.github/workflows/refresh-listing-counts.yml` runs every morning, fetches `/api/listing-counts`
from the live site and commits `src/data/listing-counts.json` when it changed.

---

## Before launch

See `TODO-CHECKLIST.md` for everything still needed before the site is public.
