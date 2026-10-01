# Toronto launch checklist

What still has to happen before kirbychantoronto.com is public. Nothing here has been invented or
estimated. Setup steps are in `README.md`; the editor steps are in `TINA-CMS.md`.

**Blocking** items must be done before launch because the site does not work or is not compliant,
without them.

---

## 1. Owner items. Only you can do these

| # | What | Where | Blocking |
| --- | --- | --- | --- |
| 1 | Register `kirbychantoronto.com` and put it on Cloudflare DNS (add the site under **Websites** and change the nameservers at the registrar) | Registrar, Cloudflare | Yes |
| 2 | Create the Cloudflare **Pages** project (not a Worker) connected to `KCDryan/kirbychan-toronto`: branch `main`, build `npm run build`, output `dist`, `NODE_VERSION` `22`. Then add `kirbychantoronto.com` and `www.kirbychantoronto.com` as custom domains | Cloudflare | Yes |
| 3 | Add the variables and secrets: `PROPTX_IDX_TOKEN`, `PROPTX_VOW_TOKEN`, `VOW_SECRET`, `RESEND_API_KEY`, `VOW_EMAIL_FROM`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `TINA_CLIENT_ID`, `TINA_TOKEN` and optionally `LEAD_WEBHOOK_URL`. Create a Turnstile widget for `kirbychantoronto.com` for the two Turnstile keys. Generate `VOW_SECRET` once and never change it | Cloudflare, **Settings > Variables and secrets** | Yes |
| 4 | Create the D1 database `kirbychan-toronto-vow` and bind it to the Pages project as `VOW_DB` for Production and Preview | Cloudflare, D1 and **Settings > Bindings** | Yes, for `/sold/` |
| 5 | Verify a sending domain in Resend and set `VOW_EMAIL_FROM` to an address on it | Resend | Yes. Without it leads and VOW emails are not sent |
| 6 | Set up an inbox for `info@kirbychantoronto.com`. Leads currently go to `info@kirbychanmarkham.com` through `leadsEmail` in `src/data/site.json`; change that value once the new inbox receives mail | Email provider, `src/data/site.json` | Decide before launch |
| 7 | Create a GA4 property for kirbychantoronto.com and put its measurement ID in `ga4` | `src/data/site.json` | No. Analytics are off while it is empty |
| 8 | Tina Cloud: project on `KCDryan/kirbychan-toronto`, Site URLs for `https://kirbychantoronto.com` and `https://www.kirbychantoronto.com`, a token with `*` branch access | app.tina.io | No. The site builds without the editor |
| 9 | Confirm in writing with PropTx that the IDX and VOW agreements cover kirbychantoronto.com, not only kirbychanmarkham.com | PropTx | Yes, for `/homes-for-sale/` and `/sold/` |
| 10 | Add the site to Google Search Console and Bing Webmaster Tools and submit `https://kirbychantoronto.com/sitemap-index.xml` | Google, Bing | No |
| 11 | Fix GitHub Actions billing on the private repository. Workflow runs are currently failing on billing, so CI and the daily listing count refresh do not run | GitHub, account billing | Yes, for the daily counts |
| 12 | Turn on two-factor authentication for every account that can publish: GitHub, Cloudflare, Tina Cloud, Resend, the registrar and the email provider | Each service | Yes |
| 13 | Have a lawyer read `/privacy/`, `/terms/`, `/accessibility/` and `/sold/terms/` for the new domain | `src/pages/` | Yes |
| 14 | Confirm the brokerage disclosure with eXp compliance: "Kirby Chan & Co. Real Estate Team, eXp Realty Brokerage. Kirby Chan, Broker." | `src/data/site.json` | Yes |
| 15 | Blog uploads at `/upload/`: add the secret `UPLOAD_PASSWORD` (one shared password, at least 12 characters) for Production, then retry the latest deployment so it takes effect | Cloudflare, **Settings > Variables and secrets** | Yes, for `/upload/` |
| 16 | Optional: create a deploy hook for branch `main` and save its URL as the secret `DEPLOY_HOOK_URL`, so the blog list, sitemap and RSS feed catch up a few minutes after each upload instead of the next morning | Cloudflare, **Settings > Builds > Deploy hooks** | No. Uploaded posts are live either way |

---

## 2. One decision left from the Markham copy

| # | What | Where |
| --- | --- | --- |
| 15 | The VOW key derivation salt is `kirbychanmarkham-vow`. It works as it is and was kept because the security code was copied unchanged. If you want it renamed, do it before the first account is created, because changing it later makes existing accounts unreadable | `src/lib/vow.ts` |

---

## 3. Verification before you call it done

- [ ] `npm run verify` passes from a clean `npm ci`
- [ ] The first Cloudflare build log shows `Executing user build command: npm run build` and
      `Found Functions directory`
- [ ] `https://kirbychantoronto.com/leaside-toronto/` and the other eleven guides load and
      `/leaside/` redirects to `/leaside-toronto/`
- [ ] `/toronto-house-prices/`, `/toronto-vs-markham/`, `/toronto-vs-mississauga/` and
      `/toronto-vs-vaughan/` show the period in `src/data/trreb-monthly.json`
- [ ] `/land-transfer-tax-calculator-toronto/` returns both the Ontario and the Toronto municipal tax
      for a test price and matches the City of Toronto and Ontario rate tables
- [ ] `/map-of-toronto/` draws all twelve guides
- [ ] Submit the contact form end to end and confirm the lead arrives at the `leadsEmail` inbox
      (and at `LEAD_WEBHOOK_URL` if set)
- [ ] Turnstile appears on the forms and a failed challenge is rejected
- [ ] `/homes-for-sale/` returns Toronto listings from PropTx
- [ ] Register a test account on `/sold/`, confirm the email arrives, sign in and run a search
- [ ] `https://kirbychantoronto.com/admin/` loads the Tina editor, the GitHub login popup completes
      and `/admin/status.html` loads
- [ ] Lighthouse mobile 95 or better on the homepage, `/leaside-toronto/` and `/downsizing-toronto/`
- [ ] Every schema type validates in the
      [Rich Results Test](https://search.google.com/test/rich-results): `RealEstateAgent`,
      `BreadcrumbList`, `FAQPage`, `BlogPosting`, `VideoObject`, `Place`
- [ ] Test the menus with the keyboard only and with reduced motion switched on
- [ ] Run `node scripts/indexnow.mjs /` once the domain is live and check it returns 200 or 202

---

## 4. Worth knowing

1. **Community figures are Q2 2026.** `src/data/market.json` holds TRREB medians from the Toronto
   Central, East and West community reports for April to June 2026. The update routine refreshes
   them when TRREB publishes the next quarter.
2. **Monthly figures are August 2026.** `src/data/trreb-monthly.json` comes from Market Watch
   `mw2608.pdf`.
3. **The map is drawn from City of Toronto Open Data boundaries** by
   `scripts/build-toronto-map.mjs`. Rerun it only when the City republishes the boundaries or a
   guide is added.
4. **The Content Security Policy in `public/_headers` allows inline scripts.** That is needed for
   the JSON-LD blocks. `/admin/*` has its own looser rules for Tina.

## Cloudflare Pages projects

- `kirbychan-toronto` is the production project. It is connected to GitHub (`KCDryan/kirbychan-toronto`, branch `main`, build `npm run build`, output `dist`, `NODE_VERSION=22`) and deploys on every push. It is live at https://kirbychan-toronto.pages.dev until the custom domains are added.
- `kirbychan-toronto-dev` was a one-off direct upload preview at https://kirbychan-toronto-dev.pages.dev. It does not update on push and can be deleted.
