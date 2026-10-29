# Handoff: kirbychantoronto.com

For Grokbot, or any agent the owner (Ryan, support@kirbychandigital.com) gives write access to this
repository. Written 2026-10-19. It holds no passwords or tokens: the owner gives access directly, never in
a chat or in this file.

## The deal

- Claude writes the blog posts. Three a week, saved in the repository as drafts.
- Grokbot manages them. It publishes one on each Monday, Wednesday and Friday, checks the page went live
  and keeps the queue full by asking Claude for more.
- Nobody else edits site code or content without the owner's say-so. See "Do not touch".
- No Toronto blog routine exists today. On 2026-10-19 the scheduled tasks on the owner's Mac were
  Markham's blog and biweekly update and Grokbot's Fast Track Friday. Markham has its own blog routine on
  its own site: this handoff does not touch it.

## The site

- Live at https://kirbychantoronto.com (the `www` address redirects to it). Toronto real estate: 18
  neighbourhood guides, service guides, translated pages (French, Chinese, Persian, Russian, Spanish,
  Greek, Japanese), live MLS search with a map, a page per listing, sold prices behind sign-in, tax and
  mortgage calculators, and a blog.
- Brokerage: Kirby Chan & Co. Real Estate Team, eXp Realty Brokerage. Kirby Chan, Broker. Office 8763 Bayview
  Ave unit 127, Richmond Hill.
- Code: private GitHub repository `KCDryan/kirbychan-toronto`, branch `main`. Astro 5 static site plus
  Cloudflare Pages Functions.
- Deploy: a push to `main` builds on Cloudflare Pages (project `kirbychan-toronto`) and goes live in about 4 to
  6 minutes. There is no staging and no human review, so a bad push is public.
- Daily job: GitHub Action `Refresh listing counts` (11:15 UTC, which is 7:15 am Toronto in summer and 6:15 am
  in winter) updates listing counts and remembers new listings. It commits as `github-actions[bot]`, so run
  `git pull --rebase origin main` before every push.

## What Grokbot needs from the owner

1. Write access to the GitHub repository (a collaborator invitation or a fine-grained token limited to this
   one repository). The owner does this in GitHub settings.
2. Nothing else. No Cloudflare, listing feed or database access is needed for blogs.

**Commit identity.** GitHub rejects pushes that expose a personal email address ("push declined due to email
privacy restrictions"). Commit as `KCDryan` with the address
`329599168+KCDryan@users.noreply.github.com`. This clone is already set to it (`git config user.email`).
Any other clone must be set before the first commit.

## Two kinds of blog post

1. **Repository posts.** Files in `src/content/blog/<slug>.mdx`. These are what this handoff manages. 25 today.
2. **OneCut posts.** Written by OneCut Content at https://kirbychantoronto.com/upload/ (Pro account only, and
   the only way a post can be made there). They are stored in the site's database and live the moment they
   are published. Each build copies them into `src/content/blog/quick/` in the build checkout only; they are
   never committed. 20 today. **Do not create, edit, delete or look for these in the repository.** They are
   the owner's. They do count as already published: do not write a topic one of them covers.

Both kinds show on `/blog/`, in the sitemap and in the feed.

## Blog posts: how they work

- The front matter and every writing rule are in `BLOG-PLAYBOOK.md` (section 5 what never goes in a post,
  6 house style, 7 the SEO spec and front matter, 8 the fact check). Read it before touching a post.
- A post with `draft: true` is invisible: not on the blog page, in the sitemap, in the feed or in the
  category pages.
- **What the checks do with a draft.** `check-blog` (title and description length, headings, links, the
  SEO rules) skips drafts, so publishing is the first moment those rules run. `check-style` (Canadian
  spelling, no long dashes, no comma before "and" or "or") reads every file under `src/content`, drafts
  included. A draft with an American spelling or a long dash fails `npm run verify` for **every** push until
  it is fixed.
- The blog check rejects a `published` date after today (it compares with the UTC date). That is why
  scheduling is done by flipping a draft on the day, not by dating it ahead.

### Claude's side (writing)

- Writes each post from primary sources it opened that day, to the playbook, and saves it with
  `draft: true` and `published:` set to the intended publish date.
- Keeps at least 6 drafts queued (two weeks). When it saves a draft it ticks the topic in
  `BLOG-TOPICS.md` (adding the slug) and adds a line under a "Queue" heading in `BLOG-LOG.md` (create the
  heading if it is missing).
- Before writing, checks the topic against the published posts, repository and OneCut:
  `grep -h "^title:\|^h1:" src/content/blog/*.mdx` and
  `curl -s https://kirbychantoronto.com/api/upload/export` (public). If a post already answers the same
  question, skip the topic and say why in the log.
- The weekday themes in the playbook line up with the publishing days: Monday first time buyers, Wednesday
  selling, Friday moving up. Claude queues in that rotation so the oldest-first order matches the days.
- Topic queue, in order, from `BLOG-TOPICS.md` (each line there gives the category and the target query):
  1. Monday: Toronto condo prices per square foot: how to compare units
  2. Wednesday: Taxes when you sell a house in Ontario: what applies and what does not
  3. Friday: The Beaches or Riverdale: east end family houses compared
  4. Monday: The minimum down payment in Ontario and where it can come from (check it against
     `fhsa-and-home-buyers-plan-toronto`)
  5. Wednesday: Seller disclosure when selling a house in Ontario
  6. Friday: High Park or The Annex: family houses on Line 2 compared (check it against the OneCut High
     Park posts)
- **Skip this topic, it is covered:** "What it costs to sell a house in Toronto" (the OneCut posts
  `cost-to-sell-a-home-in-toronto` and `cost-to-sell-a-condo-in-toronto`).
- Already published (do not repeat): downsizing in many forms (costs, checklist, timeline, sell first or buy
  first, life lease, care homes, retiring, stay or sell, bungalow or condo, who helps), Toronto and Ontario
  land transfer tax, property tax, closing costs, closing day, FHSA and Home Buyers' Plan, the mortgage stress
  test, condo status certificates, selling before probate, power of attorney, estate taxes after a death,
  average price against the median, the subway commute, Leaside against Lawrence Park, and the OneCut posts
  on Rosedale, Lawrence Park, High Park, Willowdale, Don Mills, Bayview Village, lakefront buying, the HST
  rebate and where to live. The two commands above give the exact list.
- Internal links and target keywords: `KEYWORDS.md` and playbook section 7 (it lists the pages that exist).

### Grokbot's side (managing), every Monday, Wednesday and Friday

1. `git pull --rebase origin main`, then `npm ci` if `node_modules` is missing.
2. Take the oldest draft: among `src/content/blog/*.mdx` containing `draft: true`
   (`grep -l "^draft: true" src/content/blog/*.mdx`), the one with the earliest `published:`. If there are
   none, do nothing and tell the owner and Claude the queue is empty.
3. In that file delete the `draft: true` line and set `published:` to today's date in Toronto
   (`TZ=America/Toronto date +%F`).
4. Re-open the pages listed in the post's `sources` and re-read every dated figure (rates, fees, TRREB
   numbers). If a source now shows something different, do not publish: send the post back to Claude.
5. Commit only that post and the log, then verify and push in the same command, so a failed check can never
   be followed by a push:
   `git add src/content/blog/<slug>.mdx BLOG-LOG.md BLOG-TOPICS.md && git commit -m "Blog: <h1>" && npm run verify && git push origin HEAD:main`.
   If the push is rejected because the bot committed in the meantime, `git pull --rebase origin main`, run
   `npm run verify` again, then push. If it fails twice, stop. If verify fails, do not push: put the error
   in `BLOG-LOG.md` under "Needs owner attention" and tell the owner.
6. Wait for the deploy: both checks on the commit must finish
   (`gh api repos/KCDryan/kirbychan-toronto/commits/<sha>/check-runs`). Then check that
   `https://kirbychantoronto.com/blog/<slug>/` returns 200, that the slug is in
   `https://kirbychantoronto.com/sitemap-0.xml` and that the post is on `/blog/`. Use `curl`: some tools get a
   403 from the sitemap. Right after a deploy a page can serve the old build for a couple of minutes, so
   recheck before calling it a failure.
7. Tell search engines: `node scripts/indexnow.mjs /blog/<slug>/ /blog/`. A non-200 answer is not a failure;
   note it in the log.
8. Write one line in `BLOG-LOG.md`: date, slug, result.

Publish time is not set. Early morning Toronto time (about 8:00 am) is a reasonable default. The owner can
change it.

### Time-sensitive posts

- `average-home-price-toronto-vs-median` uses TRREB's September 2026 Market Watch. Replace the figures when the
  October report is out (early in November). The site's own monthly data (`src/data/trreb-monthly.json` and
  `/toronto-house-prices/`) still shows August 2026: that is the owner's to update, not a blog task.
- Posts that quote rates, fees, limits or deadlines go stale: `toronto-property-tax` (2026 rates),
  `land-transfer-tax-toronto`, `mortgage-stress-test-toronto`, `fhsa-and-home-buyers-plan-toronto` (annual
  limits), `closing-costs-buying-home-toronto` and `selling-parents-house-after-death-ontario-taxes` (CRA,
  Ontario and City of Toronto rules). Re-check the sources each quarter and send changes to Claude.
- "Are Toronto condo prices falling? What TRREB's figures show" goes stale every month and is the riskiest.
  It must describe what the report shows for its period and predict nothing. Publish it last and put a review
  date in the log.

## Do not touch

- Anything outside `src/content/blog/<slug>.mdx` (new files), `BLOG-LOG.md` and `BLOG-TOPICS.md`: components,
  pages, the database, listing code, workflows, translations, `package.json`, `public/` (that includes the
  `/home-review/` landing page).
- OneCut posts, `/upload/` and `src/content/blog/quick/` (see above).
- Sold prices or any sold data on a public page. That stays behind sign-in under TRREB's rules.
- Another brokerage's, agent's or lender's blog as a source. Primary sources only.
- Team Forward or eXp in a post body (named in the footer and team page only). This rule comes from the North
  York handoff; the Toronto playbook does not state it, so the owner should confirm it.
- Passing off other TRREB figures as the City of Toronto's. Market Watch publishes a City of Toronto row;
  use that row, or say which TRREB area a figure covers (playbook section 8).

## State today (2026-10-19)

- Drafts queued: 0. The first three drafts need writing before Wednesday, 2026-10-21 (this Monday has none).
- Posts live: 25 repository posts and 20 OneCut posts, all on `/blog/`.
- Blog photos: each post's card shows a neighbourhood photo. There are 18 photos, so with 45 posts each photo
  is used 2 or 3 times and no two cards side by side share one. The photos are assigned across all posts
  together (`assignCardHoods` in `src/lib/post-links.ts`). More photos need a source and an entry in
  `src/data/photo-credits.json` or the build fails.
- Owner items still open: confirm `sitemap-listings.xml` is submitted in Search Console; decide the listing
  indexing rules (a proposal is in `/Users/ryanchan/Kirby Chan Toronto/claude-queue/`); confirm the claims on
  the `/home-review/` page (awards, "top selling", "#1 Producer", licence number) against RECO's advertising
  rules; test one enquiry through the contact form to confirm it reaches info@ontariodownsizing.com and the
  Kirbify CRM; update the monthly TRREB data to September.

## If something goes wrong

- A bad post is live: set `draft: true` again and push. The page leaves the blog, sitemap and feed on the next
  deploy (4 to 6 minutes). Then tell the owner.
- The build fails: the live site keeps its last good version. Fix or revert the one file you changed.
- A push is declined for email privacy: set the commit identity (above), amend the one commit and push again.
- Anything else: stop and tell the owner. Do not work around a check.
