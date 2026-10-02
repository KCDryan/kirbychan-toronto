Last Markham commit reviewed: f71add5

# Markham to Toronto sync ledger

Markham commits handled before this skill existed. Toronto received them through
kirbychan-toronto-prompt.md and kirbychan-toronto-update-prompt.md. Every "confirm" row was checked
on 2026-10-02 (first run of the kirbychan-toronto-sync skill).

| Markham | Subject | Class | Toronto result |
|---|---|---|---|
| f5f7e3e | SEO audit fixes | PORT | Ported via update prompt Part 4. Confirmed: website() schema, robots `/cdn-cgi/` in all 12 groups, check-blog query string fix, Tina SLUG_FILLER, sitemap reads blog/quick/, Cloudflare Insights in every CSP, Keep exploring links (97fc28b) |
| 4ae4580 | In-body links from pillar guides | ADAPT | Toronto guides linked. Confirmed: 7 of 9 guides link /sold/, all link hubs and tools |
| 134c45b | Listing counts: page by skip | PORT | Done before the update prompt (97b5018 and earlier) |
| a58e5e9 | Redesign the home search | PORT | Toronto abdbe55 and 6a569d1 |
| fcf0130 | Card photos Medium size | PORT | Confirmed: coverQuery asks for `ImageSizeDescription eq 'Medium'` |
| 7005ae2 | Landing pages with listings in HTML | PORT | Confirmed: ea94f9a; every type and neighbourhood page shows 24 cards live |
| a16cbb0, 5aa0378, f114d50, 5219225, 9d4570a | Map search | PORT | Toronto map live (fab840a, e635f77, b384f3b, 2effcce and follow-ups) with Toronto-specific improvements |
| 08553dc, 1ced211, 4ce8558 | Temporary probes and redeploys | SKIP | Temporary |

## Run of 2026-10-02

| Markham | Subject | Class | Toronto result |
|---|---|---|---|
| 22b399f | Home search: clearer intro line | ALREADY | Toronto wrote its own line at the owner's request (6c6d508) |
| 6e898fb | Map: 400 a day lookup cap; unknown cities fall back to Markham | PORT | City fallback ported: an unknown `city=` falls back to Toronto, with a self-check (99aaa74). Toronto already caps lookups at 2,000 a day (e635f77) |
| a4e6604 | TinaCMS content update | SKIP | Markham agent post |
| 6084abb | Daily listing counts | SKIP | Bot commit |
| 3e58478 | Map: shared GTA map from kirbychantoronto.com | SKIP | Markham-only proxy that reads Toronto's /api/map |
| 7c4f89f | Favicon in the site's green | SKIP | Toronto keeps its blue |
| 9b0a3df | Link to the sister site kirbychantoronto.com | MIRROR | Footer link "Markham real estate: kirbychanmarkham.com" (99aaa74). The Toronto vs Markham page already had a section linking the Markham neighbourhood guides |
| 2b790a8 | Neighbourhood landing descriptions under 150 characters | ALREADY | Toronto landing descriptions are already within 140 to 160 |
| f71add5 | SEO audit build | PORT and ADAPT | See below |

f71add5 in detail:

| Part | Class | Toronto result |
|---|---|---|
| check-blog reads guide slugs from the guides folder | ALREADY | Done in the update run |
| FAQs on the type landing pages | PORT | Toronto-written FAQs on bungalows, condos, townhouses and houses (99aaa74) |
| Intros with links on blog categories, /services/, /market-reports/ | PORT | Toronto-written intros (99aaa74) |
| "What X offers" replacing "Who X suits" | ALREADY | Toronto's neighbourhood guides never had "Who X suits"; their closing sections describe budgets, home types and transit |
| condo-vs-retirement-home-markham | ALREADY | condo-vs-retirement-residence-cost-toronto (490e06e) |
| power-of-attorney-sell-house-ontario | ALREADY | selling-a-parents-house-with-power-of-attorney-ontario (59d0977) |
| selling-a-parents-house-markham | ALREADY | Covered by the power of attorney post (59d0977); a second post would compete with it |
| markham-seniors-property-tax-relief | ALREADY | Toronto's property tax post has City relief programs and Ontario's Senior Homeowners' Property Tax Grant (b816835) |
| life-lease-housing-markham | ADAPT | life-lease-housing-toronto (99aaa74) |
| parent-moving-to-retirement-home-house | ADAPT | parent-moving-into-care-house-toronto, built around Toronto's Vacant Home Tax care exemption (99aaa74) |
| retiring-in-markham | ADAPT | retiring-in-toronto (99aaa74) |
| stay-or-sell-aging-in-place-ontario | ADAPT | stay-or-sell-toronto-house (99aaa74) |
| unionville-vs-markham-village, Markham neighbourhood wording | SKIP | Markham-only content |
