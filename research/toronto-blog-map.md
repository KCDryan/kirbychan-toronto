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

## 4 more topics, drafted 2026-10-21

The three topics above were all used, so these four were taken from `BLOG-TOPICS.md`: the first usable topic in each day's queue, in rota order (Sunday, Tuesday, Wednesday, Thursday). Skipped: Monday's remaining condo topics (need price data, or repeat `mortgage-stress-test-toronto`, per the 2026-10-19 log), "Buying a first condo" ("toronto condo for sale" supports `/buyers/`), "Are Toronto condo prices falling" (TRREB price data), "What it costs to sell" (overlaps `toronto-downsizing-costs`), and "Toronto property tax compared with Markham" (covered by `/toronto-vs-markham/` and the other comparison pages). Each is a draft with a past date; set a new published date when flipping it live.

### 4. Downsizing from a house to renting an apartment in Toronto
- **Used:** drafted 2026-10-21 as `downsizing-from-house-to-apartment-toronto` (draft, published date 2026-10-18, a Sunday).
- **Target query:** downsizing from house to apartment. From the downsizing questions in `KEYWORDS.md` and the Sunday queue in `BLOG-TOPICS.md`. The pillar `/downsizing-toronto/` covers buying a condo, townhouse or bungalow, so the post takes the renting angle only.
- **Gap:** nothing on the site explains what a downsizer signs up to as a tenant: the standard lease, the rent deposit cap, the rent increase guideline and the November 15, 2018 exemption, notice to leave and the landlord's own use rules changed on September 21, 2026. The care home post covers the landlord side of renting out a parent's house, not the tenant side.
- **Pillar:** /downsizing-toronto/
- **Required links:** /downsizing-toronto/, /services/downsizing/, /sellers/, /home-valuation/, /blog/condo-vs-retirement-residence-cost-toronto/, /blog/sell-first-or-buy-first-downsizing-toronto/
- **Extras:** /blog/selling-a-house-in-ontario-taxes/, /blog/toronto-downsizing-costs/, /contact/
- **Sources:** ontario.ca (Renting in Ontario: your rights, residential rent increases, guide to the standard lease), LTB brochures (A Guide to the Residential Tenancies Act, How a Landlord Can End a Tenancy, updated September 21, 2026), CRA principal residence, toronto.ca RentSafeTO for tenants.
- **Do not:** quote average Toronto rents (no primary source opened), say that a given share of buildings is exempt from rent control or repeat the principal residence rules (link to the taxes post).

### 5. Is it better to sell a house before or after death
- **Replaced 2026-10-23:** the draft repeated `selling-parents-house-after-death-ontario-taxes` and was removed. The Nov 4 slot now holds `probate-ontario-no-will` (target query: probate ontario no will). See `BLOG-LOG.md`.
- **Used:** drafted 2026-10-21 as `sell-house-before-or-after-death-ontario` (draft, published date 2026-10-20).
- **Target query:** is it better to sell a house before or after death. From the estates and probate seeds in `KEYWORDS.md` and the Tuesday queue in `BLOG-TOPICS.md`. The phrase carries no place name, so "Ontario" sits in the slug, H1 and body rather than in the query.
- **Gap:** the estate posts each cover one path (the taxes after death, selling before probate, selling with a power of attorney). Nothing compares the two paths side by side: who signs, the deemed sale against a sale during life, what Estate Administration Tax is charged on and the Vacant Home Tax exemptions for each.
- **Pillar:** /selling-an-estate-home-toronto/
- **Required links:** /selling-an-estate-home-toronto/, /services/estate-sales/, /sellers/, /home-valuation/, /blog/selling-a-house-before-probate-ontario/, /blog/selling-parents-house-after-death-ontario-taxes/, /blog/selling-a-parents-house-with-power-of-attorney-ontario/
- **Extras:** /blog/toronto-property-tax/, /contact/
- **Sources:** ontario.ca Estate Administration Tax and apply for probate, ontario.ca make a power of attorney, Substitute Decisions Act s. 12, Estates Administration Act ss. 9 and 17, canada.ca (CRA capital gains for deceased persons, principal residence, final return due dates), toronto.ca Vacant Home Tax.
- **Do not:** say selling first avoids probate or its tax, advise on joint ownership or adding a child to title, quote legal or commission fees or describe a real family.

### 6. How real estate commission works when you sell in Ontario
- **Used:** drafted 2026-10-21 as `selling-a-house-in-ontario-commission` (draft, dated 2026-10-14).
- **Target query:** selling a house in ontario commission. From `KEYWORDS.md` target 7 (selling a house in ontario, with costs, taxes and calculator angles) and the Wednesday queue in `BLOG-TOPICS.md`. The head term "selling a house in ontario" belongs to `/sellers/` and the taxes angle to `selling-a-house-in-ontario-taxes`, so the post takes the commission angle only.
- **Gap:** `toronto-downsizing-costs` says in two paragraphs that commission is negotiable. Nothing on the site explains what a listing agreement must say about payment, what a seller may offer the buyer's brokerage, how multiple representation changes the amount, the ban on commission based on the list to sale price difference or when commission is still owed.
- **Pillar:** /sellers/
- **Required links:** /sellers/, /home-valuation/, /blog/selling-a-house-in-ontario-taxes/, /blog/toronto-downsizing-costs/, /selling-an-estate-home-toronto/, /contact/
- **Extras:** /downsizing-toronto/, /selling-a-home-after-separation-toronto/, /buyers/
- **Sources:** reco.on.ca (signing a contract with a brokerage, multiple representation, working with an agent, RECO Information Guide PDF, choosing an agent as a seller, risks of representing yourself), canada.ca (CRA definitions for capital gains).
- **Do not:** quote commission percentages, ranges or typical rates, compare brokerages, state HST on commission or when commission is paid (no primary source opened), or imply our own fees.

### 7. Don Mills or Leaside: two Line 5 neighbourhoods compared
- **Used:** drafted 2026-10-21 as `don-mills-real-estate-vs-leaside` (draft, published date 2026-10-15, a Thursday).
- **Target query:** don mills real estate. From the neighbourhood seeds in `KEYWORDS.md` (target 10: "don mills real estate and similar") and the Thursday queue in `BLOG-TOPICS.md`. The Don Mills guide targets "living in don mills, toronto", so there is no overlap.
- **Gap:** both neighbourhood guides carry prices and a transit paragraph each. Nothing compares the six Line 5 stations across the two areas (station type, buses, parking, stops to Union) or sets their 2021 Census housing stock side by side for a newcomer.
- **Pillar:** /relocating-to-toronto/
- **Required links:** /don-mills-toronto/, /leaside-toronto/, /relocating-to-toronto/, /homes-for-sale/don-mills/, /homes-for-sale/leaside/, /blog/leaside-vs-lawrence-park/, /blog/toronto-subway-commute-by-neighbourhood/
- **Extras:** /map-of-toronto/, /contact/
- **Sources:** TTC Line 5 opening notice (February 6, 2026) and station pages for Leaside, Laird, Sunnybrook Park, Don Valley, Aga Khan Park & Museum and Wynford; TTC subway map; Metrolinx Eglinton Crosstown page; City of Toronto 2021 Neighbourhood Profiles (158 model workbook on open.toronto.ca); toronto.ca heritage conservation districts and tree and ravine permits; TPL Leaside, Don Mills and Brookbanks branch pages.
- **Do not:** quote TRREB prices or sales counts (the guides carry them), state a North York-wide figure, describe either area as suited to a type of buyer or give commutes in minutes.

## 1 more topic, drafted 2026-10-23

All seven topics above are used, so this one comes from the Friday queue in `BLOG-TOPICS.md` (first unused Friday topic; the Riverdale topic is published).

### 8. High Park or The Annex: family houses on Line 2 compared
- **Used:** drafted 2026-10-23 as `high-park-toronto-real-estate` (draft, published date 2026-11-06, a Friday).
- **Target query:** high park toronto real estate. From the neighbourhood seeds in `KEYWORDS.md` (target 10) and the Friday queue in `BLOG-TOPICS.md`. "Toronto" must stay in the phrase: bare "high park" completes to Highland Park in several US cities (`KEYWORDS.md`, poisoned seeds). The High Park guide targets "living in high park, toronto", so there is no overlap.
- **Gap:** both neighbourhood guides carry prices, Census stock and a transit paragraph. Nothing on the site covers what a move up buyer may add to a Toronto lot (multiplexes of up to four or six units, garden suites, laneway suites) or what happens when the house being bought has tenants (the purchaser's own use N12 rule). The Riverdale post covers trees and ravines, so this post links to it rather than repeating them.
- **Pillar:** /upsizing-toronto/
- **Required links:** /high-park-toronto/, /the-annex-toronto/, /upsizing-toronto/, /homes-for-sale/high-park/, /homes-for-sale/the-annex/, /blog/toronto-subway-commute-by-neighbourhood/, /blog/riverdale-toronto-real-estate/
- **Extras:** /map-of-toronto/, /best-toronto-neighbourhoods-for-families/, /blog/leaside-vs-lawrence-park/, /home-valuation/, /contact/
- **Sources:** TTC map and station pages (High Park, Keele, Runnymede, Dundas West, Spadina, St George, Bathurst), toronto.ca heritage conservation districts, multiplex housing, Expanding Housing Options in Neighbourhoods, garden suites and laneway suites, LTB How a Landlord Can End a Tenancy.
- **Do not:** quote TRREB prices or sales counts (the guides carry them), describe either area as suited to a type of buyer, give commutes in minutes, say High Park is in the Toronto and East York District (not verified) or state the purchaser N12 compensation rule as settled.

## 1 more topic, drafted 2026-10-26

From the Monday queue in `BLOG-TOPICS.md` (first unused Monday topic; the down payment topic is published).

### 9. Toronto condo prices per square foot: how to compare units
- **Used:** drafted 2026-10-26 as `toronto-condo-prices-per-square-foot` (draft, published date 2026-11-09, a Monday).
- **Target query:** toronto condo prices per square foot. From the Condos paragraph in `KEYWORDS.md` and the Monday queue in `BLOG-TOPICS.md`. Earlier runs skipped it as needing price data; this post takes a method angle and quotes no market prices.
- **Gap:** nothing on the site explains how a stated condo floor area is measured (HCRA Directive 3), where unit boundaries and fee shares are registered (declaration Schedules C and D, the description) or how parking, lockers, balconies, the fee and property tax change a price per square foot comparison. The status certificate and stress test posts cover the documents and the fee in approval, so this post links to them.
- **Pillar:** /first-time-home-buyers-toronto/
- **Required links:** /first-time-home-buyers-toronto/, /buyers/, /mortgage-calculator-toronto/, /blog/condo-status-certificate-toronto/, /blog/mortgage-stress-test-toronto/, /blog/closing-costs-buying-home-toronto/, /land-transfer-tax-calculator-toronto/, /contact/
- **Extras:** /new-construction-toronto/, /blog/toronto-property-tax/
- **Sources:** HCRA Directive 3 Floor Area Calculations; Condominium Act, 1998 ss. 2, 7, 8, 49, 72, 84; O. Reg. 48/01 s. 5; O. Reg. 49/01 ss. 5 and 6; CAO Fees and finances and What are common elements; MPAC condominium assessments; toronto.ca property tax rates and fees.
- **Do not:** state a Toronto-wide or neighbourhood price per square foot, average or median, use sold data, re-explain the status certificate contents, the GDS condo fee rule, closing costs, land transfer tax or the down payment, or claim a measurement standard for resale listings (none found).

## Next step

Flip each draft to `draft: false` on its publish date, tick the topic in `BLOG-TOPICS.md` and add a line here marking it published.
