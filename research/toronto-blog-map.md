# Toronto blog map

Written 2026-10-19 for kirbychantoronto.com. The site has 25 published posts (listed in the Published section of `BLOG-TOPICS.md`). Three more were drafted today and are queued for October 21, 23 and 26. This map fixes the target query and the required internal links for those three so the drafts can be checked against it.

Read before using it:
- **Query evidence is Google autocomplete only** (`KEYWORDS.md`, researched 2026-09-30). There are no search volumes, so nothing here ranks one query above another.
- **Competitor URLs were not pulled this run.** Check the real Google Canada results in Search Console or a Canadian rank tool before briefing a follow-up post.
- **Playbook limits apply to every post** (`BLOG-PLAYBOOK.md`, `SEO-PLAYBOOK.md`): every figure from a primary source opened that day, no predictions, no sold data, no city-wide price or sales totals, no claim about who a place suits.
- **Gate for each post:** the target query appears verbatim in the title, meta description, first paragraph, H1 and at least one H2. Title 60 characters or fewer, description 145 to 155. Every link listed under "Required links" appears in the body. FAQ and sources are set in front matter, which the layout renders as the FAQ block (with `FAQPage` schema) and the visible Sources section.

## Already targeted, so not used again

Queries held by published posts, guides and pages. None of the three topics below reuses one.

- Pages: first time home buyer toronto (`/first-time-home-buyers-toronto/`), selling a house in toronto (`/sellers/`), living in riverdale toronto (`/riverdale-toronto/`), living in the beaches toronto (`/the-beaches-toronto/`), toronto land transfer tax calculator, toronto house prices.
- Posts: toronto land transfer tax, closing costs toronto, mortgage stress test ontario, fhsa home buyers plan, toronto property tax rate 2026, toronto downsizing costs, selling parents house after death canada taxes ontario, can you sell a house before probate in ontario, toronto subway commute, leaside real estate, average home price toronto, and the downsizing cluster in `BLOG-TOPICS.md`.

## Link targets

- **Pillar guides:** /downsizing-toronto/, /first-time-home-buyers-toronto/, /upsizing-toronto/, /selling-a-home-after-separation-toronto/, /selling-an-estate-home-toronto/, /relocating-to-toronto/, /investment-property-toronto/, /luxury-homes-toronto/, /new-construction-toronto/
- **Neighbourhood guides:** `/<slug>-toronto/` and listings `/homes-for-sale/<slug>/` for agincourt, bayview-village, danforth, don-mills, downtown-waterfront, guildwood, high-park, islington-village, lawrence-park, leaside, mimico, mount-pleasant-east, riverdale, rosedale, the-annex, the-beaches, willowdale, yonge-eglinton
- **Money and tool pages:** /buyers/, /sellers/, /home-valuation/, /contact/, /land-transfer-tax-calculator-toronto/, /mortgage-calculator-toronto/, /best-toronto-neighbourhoods-for-families/, /map-of-toronto/
- All of the above were in the last build (`dist/`) on 2026-10-19.

## The 3 topics, in publishing order

### 1. Taxes when you sell a house in Ontario
- **Used:** drafted 2026-10-19 as `selling-a-house-in-ontario-taxes` (draft, to publish 2026-10-21).
- **Target query:** selling a house in ontario taxes. From `KEYWORDS.md` target 7 (selling a house in ontario, with costs, taxes and calculator angles) and the Wednesday queue in `BLOG-TOPICS.md`. The head term "selling a house in ontario" belongs to `/sellers/`, so the post takes the taxes angle only.
- **Gap:** the estate post covers the deemed sale at death. Nothing on the site covers a living owner's sale: the principal residence designation, the flipping rule, HST on a renovated home and non-resident withholding.
- **Pillar:** /sellers/
- **Required links:** /sellers/, /home-valuation/, /downsizing-toronto/, /selling-a-home-after-separation-toronto/, /blog/land-transfer-tax-toronto/, /blog/selling-parents-house-after-death-ontario-taxes/
- **Extras:** /blog/toronto-property-tax/, /blog/toronto-downsizing-costs/, /land-transfer-tax-calculator-toronto/, /contact/
- **Sources:** canada.ca (CRA principal residence, flipping rule, capital gains definitions, line 12700, GST/HST home construction, non-resident dispositions), ontario.ca land transfer tax, toronto.ca MLTT.
- **Do not:** quote commission or legal fee ranges, or the late designation penalty amount (not verified).

### 2. Riverdale or The Beaches for a move up house
- **Used:** drafted 2026-10-19 as `riverdale-toronto-real-estate` (draft, to publish 2026-10-23). Renamed from `riverdale-toronto-real-estate-vs-the-beaches` to the short keyword slug.
- **Target query:** riverdale toronto real estate. From the neighbourhood seeds in `KEYWORDS.md` and the Friday queue in `BLOG-TOPICS.md`. "Toronto" must stay in the phrase: bare "riverdale" completes to the Bronx, Edmonton and Calgary (`KEYWORDS.md`, poisoned seeds). The neighbourhood guide targets "living in riverdale, toronto", so there is no overlap.
- **Gap:** both neighbourhood guides carry prices. A comparison on transit, heritage districts and the tree and ravine rules, which decide a move up renovation, is missing.
- **Pillar:** /upsizing-toronto/
- **Required links:** /riverdale-toronto/, /the-beaches-toronto/, /upsizing-toronto/, /homes-for-sale/riverdale/, /homes-for-sale/the-beaches/, /blog/toronto-subway-commute-by-neighbourhood/
- **Extras:** /map-of-toronto/, /best-toronto-neighbourhoods-for-families/, /blog/leaside-vs-lawrence-park/, /home-valuation/, /contact/
- **Sources:** TTC map and station pages, toronto.ca heritage conservation districts and the Kingswood Road South plan, toronto.ca tree and ravine permits, TPL branch pages.
- **Do not:** quote TRREB prices or sales counts in this post (the guides carry them), or describe either area as suited to a type of buyer.

### 3. The minimum down payment in Ontario and where it can come from
- **Used:** drafted 2026-10-19 as `first-time-home-buyer-ontario-down-payment` (draft, to publish 2026-10-26).
- **Target query:** first time home buyer ontario down payment. From `KEYWORDS.md` target 9 (the Ontario family: down payment, rebate, requirements, rrsp, calculator) and the Monday queue in `BLOG-TOPICS.md`. The Toronto head term belongs to `/first-time-home-buyers-toronto/`.
- **Gap:** the guide gives the formula in one section. The source of the money (gifts, FHSA, HBP, borrowed funds) and what it does to the CMHC premium is not covered anywhere on the site.
- **Pillar:** /first-time-home-buyers-toronto/
- **Required links:** /first-time-home-buyers-toronto/, /buyers/, /blog/fhsa-and-home-buyers-plan-toronto/, /blog/mortgage-stress-test-toronto/, /mortgage-calculator-toronto/, /land-transfer-tax-calculator-toronto/
- **Extras:** /blog/closing-costs-buying-home-toronto/, /contact/
- **Sources:** FCAC down payment, Finance Canada (December 15, 2024 reforms), CMHC purchase criteria and premium table, CRA HBP and FHSA pages.
- **Do not:** state gift letter requirements or proof of funds periods (no primary source), or a Toronto average price.

## Next step

Flip each draft to `draft: false` on its publish date, tick the topic in `BLOG-TOPICS.md` and add a line here marking it published.
