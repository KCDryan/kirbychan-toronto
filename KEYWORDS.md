# Keyword research

Researched 30 September 2026 from Google's own autocomplete for Canada
(`suggestqueries.google.com`, `hl=en&gl=ca`), which returns the queries Google actually completes
for real users. That is demand evidence rather than opinion. It does not give search volumes, and
no number in this file should be read as one.

**What this file cannot tell you.** Autocomplete shows that a query exists and is common enough to
suggest. It does not rank queries against each other. Real volumes and our own positions need Google
Search Console, which is the one source that reports what this site is already being shown for. Once
that data exists, check these targets against it and correct anything this file got wrong.

Method, to repeat it:

```
curl -s "https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=ca&q=SEED"
```

118 seeds were run, covering downsizing, seniors, estates and probate, agent terms, land transfer
tax, property tax, prices, condos, first time buyers, sellers, valuation, best neighbourhood
queries, twelve neighbourhoods (real estate, homes for sale, condos, living in) and the city
comparison seeds. Competitor domains came from web searches on ten of the core queries, recorded at
the end. No competitor page was used as a source of facts.

---

## The ten to target

Ordered by how much they are worth to this business, weighing commercial intent against how
realistic the fight is for a domain this young.

| # | Query | Why | Page that owns it |
| --- | --- | --- | --- |
| 1 | downsizing toronto / senior downsizing toronto | The niche itself and the pillar. Real demand, though the rest of the suggestions are service firms rather than agents | `/downsizing-toronto/` |
| 2 | selling an estate home in ontario / can you sell a house before probate in ontario | Executors asking exactly the question we answer, with a clean suggestion set | `/selling-an-estate-home-toronto/` |
| 3 | toronto land transfer tax calculator (+ first time buyer, rebate, vs markham, vs mississauga) | The richest seed found. Double tax is Toronto's defining buying cost | `/land-transfer-tax-calculator-toronto/` |
| 4 | toronto property tax (rate 2026, due dates 2026, seniors rebate, deferral) | Very rich set. The seniors relief and deferral strands fit the niche exactly | blog post: Toronto property tax 2026 rates, due dates and seniors relief |
| 5 | toronto house prices / average home price toronto | Repeat research intent with chart, history and 2026 angles; feeds valuation | `/toronto-house-prices/` |
| 6 | toronto home value estimator / toronto house valuation | Direct seller intent. "home valuation toronto" exists; the command phrase "sell my house toronto" is thin | `/home-valuation/` |
| 7 | selling a house in ontario / cost of selling a house in toronto | High intent seller research with costs, taxes and calculator angles | `/sellers/` |
| 8 | toronto real estate agent / best realtor toronto | The core commercial term. Noisy (see below) but the plain head term is still the business | `/` |
| 9 | first time home buyer toronto / first time home buyer ontario (+ land transfer tax, rebate, down payment) | Unlike Markham, the Toronto qualified phrase has real demand here, driven by the municipal tax rebate | `/first-time-home-buyers-toronto/` |
| 10 | leaside real estate, lawrence park real estate, willowdale real estate, don mills real estate and similar, plus best neighbourhood in toronto to live | Neighbourhood depth is where a small team beats portals. Downsizing slant is ours alone | `/neighbourhoods/`, `/leaside-toronto/` style pages, `/best-toronto-neighbourhoods-for-downsizing/` |

`/buyers/` has no single head term of its own. It picks up "toronto condo for sale", "mortgage
calculator toronto condo" and "mortgage stress test ontario calculator" as supporting phrases.

## What the data actually said

**"downsizing toronto" is real but shared with service firms and a brand.**

```
downsizing toronto
toronto downsizing services
downsizing divas toronto
downsizing companies toronto
downsizing diva toronto east
senior downsizing toronto
downsizing divas cost toronto
```

"senior downsizing toronto" is the phrase to use in the pillar title. Downsizing Divas is a brand
fight, not ours. The general downsizing questions are strong blog topics:

```
at what age should seniors downsize
downsizing tips for seniors
downsizing help for seniors near me
should seniors downsize
downsizing from house to condo
downsizing from house to apartment
how to cope with downsizing your home
should i downsize my house
senior moving services toronto
can seniors claim moving expenses in canada
```

**Estates and probate carry the clearest executor intent found.** The Toronto qualified versions
are empty; the Ontario versions are rich.

```
selling an estate home in ontario
selling deceased estate property ontario
can you sell a house before probate in ontario
can you sell a property before probate is granted in ontario
can you sell a house in ontario without probate
how to sell a deceased estate house
selling parents house after death canada taxes ontario
selling parents house after death canada taxes ontario calculator
how long do you have to sell a house after someone dies
is it better to sell a house before or after death
can power of attorney sell property in ontario
can i sell my mother's house without power of attorney
probate ontario calculator
probate ontario fees
probate ontario how long
probate ontario no will
```

Each of those is a blog post in its own right and each links to `/selling-an-estate-home-toronto/`.

**"toronto land transfer tax" is the richest seed of the whole run.**

```
toronto land transfer tax calculator
toronto land transfer tax rebate
toronto land transfer tax rates
toronto land transfer tax first time home buyer
who pays land transfer tax in toronto
how much is land transfer tax in toronto
land transfer tax toronto vs mississauga
land transfer tax toronto vs markham
land transfer tax toronto condo
toronto municipal land transfer tax rebate
toronto municipal land transfer tax administration fee
why does toronto have a municipal land transfer tax
toronto land transfer tax refund affidavit
how much is land transfer tax in toronto for first time home buyers
do first time home buyers pay land transfer tax in ontario
```

The calculator page should answer "who pays", "how much", the first time buyer rebate and the
administration fee on the page itself. "vs markham" and "vs mississauga" are one comparison post.

**"toronto property tax" is nearly as rich and has a seniors strand.**

```
toronto property tax rate 2026
toronto property tax rate increase 2026
toronto property tax 2026 due dates
toronto property tax calculator
toronto property tax lookup
toronto property tax seniors
toronto property tax relief seniors
toronto property tax rebate for seniors how to apply
toronto property tax deferral program
toronto senior property tax deferral
ontario property tax relief for seniors
property tax toronto vs markham
toronto vs mississauga property tax
toronto vs vaughan property tax
toronto vacant home tax declaration 2026
toronto vacant home tax exemption
```

Three posts come out of this: the annual rate and due dates post, a seniors relief and deferral
post (squarely in the niche) and a vacant home tax post aimed at families holding a parent's empty
house while it is sold.

**Prices and value.** "toronto house prices" completes to chart, last 10 years, history, trend and
2026. "average home price toronto" completes by year and to 2025 and 2026. "toronto home value"
and "toronto home valuation" both return "toronto home value estimator", "toronto house valuation",
"toronto home appraisal" and "home valuation toronto". "sell my house toronto" returns almost
nothing useful.

**First time buyers behave differently from Markham.** "first time home buyer toronto" has its
own suggestion set, led by the land transfer tax, down payment, rebate and programs. The Ontario
family (down payment, rebate, requirements, rrsp, calculator) is still there and still worth
covering on the same page.

**Condos.** "toronto condo fees average", "toronto condo prices per square foot", "toronto condo
prices falling" and "toronto condo market forecast 2027" are live. "condo status certificate
toronto" completes only to "what is status certificate for condo ontario" and "condo status
certificate example". One status certificate post is enough.

**Neighbourhoods.** "leaside real estate", "leaside homes for sale", "leaside real estate agents",
"lawrence park real estate toronto", "willowdale real estate agent", "don mills real estate agents",
"banbury don mills homes for sale", "bayview village condos for sale", "yonge and eglinton condos",
"is yonge and eglinton a good place to live", "is willowdale a good neighbourhood", "is bayview
village a good area" and "toronto waterfront condos for sale" all return. The "is X a good place to
live" pattern is worth an FAQ block on each neighbourhood page. "best neighbourhood in toronto to
live" and "best neighbourhoods in toronto for families" are real; "for seniors" is empty.

**Bungalows.** "bungalow for sale toronto" and "bungalows for sale toronto west" exist. That is a
downsizer's search (one floor living) and belongs as a section of the downsizing pillar.

## Poisoned or empty seeds

Empty, returning nothing at all:

- downsizing toronto seniors, downsizing home toronto
- senior move manager toronto
- selling parents house toronto
- estate sale toronto house, probate ontario house sale, estate trustee sell house ontario
- real estate agent toronto seniors, toronto real estate seniors
- best neighbourhood in toronto for seniors
- living in lawrence park, living in islington village, islington village real estate

The seniors qualifier on agent and neighbourhood phrases has no autocomplete demand. Use it in copy
for relevance, never as the target phrase.

Poisoned, where the phrase now means something else:

- estate sale toronto completes to weekend contents sales ("today", "this weekend kijiji",
  "reddit"). People searching it want to buy a lamp, not sell a house. Use "estate home" and
  "estate property" instead.
- toronto real estate agent completes partly to gossip about named agents (eyebrows, plastic
  surgery) and to rentals. The head term is still usable; do not chase the tail.
- toronto realtor completes to the realtor.ca portal, login, map and rentals. Portal intent.
- stress test ontario completes mostly to cardiac tests. Only "mortgage stress test ontario
  calculator" is ours.
- toronto vs vaughan completes to soccer fixtures and cinemas, apart from the property tax
  comparison. toronto vs mississauga is similar, apart from property tax and reddit.
- status certificate ontario completes to birth, marriage and corporation certificates.
- the annex completes to Anne Frank; high park to Highland Park in several US cities; riverdale to
  the Bronx, Edmonton and Calgary; lawrence park to Pennsylvania and Piermont NY; the beaches to
  Australia and Florida. Every neighbourhood page title must carry "Toronto".
- upsizing toronto returns only "upsize toronto". As in Markham, move up buyers do not use the word.
- moving to toronto is real but it is relocation from Vancouver, Montreal, the US and the UK,
  mostly renters. Not our buyer.
- retirement home toronto completes largely to jobs and hiring.

## Competitors seen

From web searches on: downsizing toronto realtor, toronto real estate agent seniors, leaside real
estate, lawrence park real estate toronto, toronto land transfer tax calculator, selling an estate
home in ontario toronto, toronto house prices 2026, toronto property tax rebate for seniors, best
toronto neighbourhoods for downsizing seniors, first time home buyer toronto land transfer tax
rebate. Domains listed, not read.

Agents and brokerages on downsizing, seniors and estates (the direct fight):

- juliekinnear.com (downsizing and estate pages both ranked)
- othengroup.com, barrylebow.com, westsidestoreys.com, torontorealtyboutique.com
- residencestoronto.com, ericareddy.com, gtaselling.com, francoisepollard.com
- downsizingexperts.ca (Transitions Realty), seniorrealty.ca, seniorsmatter.ca
- yourbiggestinvestment.ca, shusterrealestate.com, stuartnodell.com, johnson-team.com
- comflex.ca, noblerealestate.ca, joettefielding.com, urbangroup.com, christinecowernteam.com

Agents and brokerages on neighbourhood and buyer terms:

- bosleyrealestate.com, heapsestrin.com, allowayproperty.com, seymourrealestate.ca,
  shaheenandcompany.com, patrickrocca.com, torontocondoteam.ca, lacerdarealestate.com

Portals and franchise sites: realtor.ca, zillow.com, zolo.ca, redfin.ca, rew.ca, royallepage.ca,
blog.remax.ca.

Mortgage and calculator sites (own the land transfer tax calculator results): nesto.ca,
ratehub.ca, wowa.ca, taxbase.ca, ownright.com, canadalife.com, mortgagealliance.com,
landtransfertaxcalculator.ca.

Lawyers: kormans.ca, durhamlawyer.ca, insightlawfirm.ca, mrwills.com.

Downsizing and moving services (not agents): gogordons.com, tr1927.com, rightsizing.ca.

Government and industry: toronto.ca, canada.ca, trreb.ca.

Media: storeys.com, fivewalls.com, nowtoronto.com, cp24.com, seniortoronto.ca, sensomagazine.ca,
taxpage.com, reminetwork.com.

The seniors and downsizing agent field is crowded but made of small sites, which is winnable. The
land transfer tax calculator result is held by well funded fintech sites; expect to win the long
tails (who pays, administration fee, vs markham) before the head term.

## Rules that follow from this

1. **Target the query that exists, not the one that reads well.** The Toronto qualifier works on
   land transfer tax, property tax, prices and first time buyers. On estates and probate, Ontario is
   the real unit. On seniors, the qualifier has no demand at all.
2. **Say "estate home", never "estate sale".** The second phrase belongs to weekend contents sales.
3. **Put "Toronto" in every neighbourhood title.** Half the neighbourhood names collide with places
   in other countries.
4. **Check a seed before building a page on it.** A third of the seeds were empty or polluted, which
   we only found by looking.
5. **Do not chase a competitor's brand.** "downsizing divas toronto" is their name.
6. **Revisit once Search Console has data.** Everything above is demand evidence with no volumes
   attached. Our own impressions will beat it as a guide to what to write next.
