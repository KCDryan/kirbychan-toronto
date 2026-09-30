# TinaCMS

A visual editor for agents' quick posts, at `https://kirbychantoronto.com/admin/`
(`/admin/index.html`). **A save commits straight to `main` and goes live
within minutes.** The Cloudflare build runs the house style and blog checks first, so an edit that
breaks them fails to deploy and the site keeps its last good version.

## What it edits

Only **Quick posts (agents)**, the files in `src/content/blog/quick/`. Full blog posts, guides,
neighbourhood pages and everything else are edited in the repository, so an agent cannot change
them from the editor.

## Quick posts for agents

A short form: headline, summary, category, author, date and the post, plus optional quick answer box, FAQ, sources and related neighbourhoods and services so a quick post can carry every section a full post has. `AGENT-BLOG-PROMPT.md` is a prompt that has Claude or ChatGPT produce each part in the right format. Everything else is derived in
`src/content.config.ts`, so a quick post renders with the same layout as a full post and shows the
agent's name in the byline and in the `BlogPosting` author. `scripts/check-blog.mjs` applies lighter
rules to quick posts (300 words minimum, a real summary, an author, a unique address) and the house
style check applies as usual. The steps for agents are in `AGENT-BLOG-GUIDE.md`.

## Import from HTML

`tina/import-html.ts` is the **Import from HTML** box at the top of the Quick post form. It parses
pasted HTML in the browser, keeps the article (or `main` or `body`), drops styles, scripts and
navigation, moves the first `h1` into Headline, pulls sections headed Quick answer, FAQ and Sources
into their fields, converts the rest to Markdown with turndown (GFM tables) and loads it into the
body with Tina's own `parseMDX`. It removes long dashes and commas before "and" or "or" and reports
what it changed. The editor only redraws on a form reset, so the import resets the form with the new
values and marks it changed.

## One post never blocks a deploy

`scripts/prepare-quick-posts.mjs` runs first in `scripts/build.mjs` and in CI. In a throwaway checkout
(`CF_PAGES` or `CI` set) it fixes long dashes, commas before "and" or "or" and American spellings in
quick posts, re-runs the style and blog checks and moves any quick post that still fails to
`.held-quick-posts/` so the rest of the site deploys. The report is published at
`/admin/status.html`. Run locally without those variables it only reports and never rewrites a file.
Full blog posts are unaffected: their problems still fail the build.

## Try it on this computer (no account needed)

```bash
npm run dev:cms
```

Then open `http://localhost:4321/admin/index.html`. Saves write straight to the files on disk. Run
`git diff` to see what changed and `git checkout -- src/content` to throw the edits away.

## Turn it on for the live site

1. Create a project at [app.tina.io](https://app.tina.io), connect the GitHub repository
   `KCDryan/kirbychan-toronto` and index the `main` branch.
2. Under Site URLs add both `https://kirbychantoronto.com` and `https://www.kirbychantoronto.com`.
   Tina refuses logins from any address that is not listed.
3. Copy the project's **Client ID** and create a read only **token** with branch access set to `*`,
   so it works for `main` and for preview branches.
4. In the Cloudflare Pages project, under **Settings > Variables and secrets**, add to
   **Production** (and Preview if you want the editor on preview builds): `TINA_CLIENT_ID` (plain)
   and `TINA_TOKEN` (secret).
5. Retry the latest production deployment. `scripts/build.mjs` builds the editor only when both
   variables are set and a Tina Cloud problem never stops the rest of the site deploying.
6. Open `https://kirbychantoronto.com/admin/` and log in.

The editor commits to the branch it was built from (`TINA_BRANCH`, else Cloudflare's
`CF_PAGES_BRANCH`), which for the live site is `main`. If a save publishes something wrong, revert
that commit on GitHub or use **Rollback** in Cloudflare.

### Two settings the editor depends on

- **Cross-Origin-Opener-Policy.** The public site sends `same-origin`. Tina's GitHub login runs in a
  popup that reports back to the editor and `same-origin` breaks that link, so `public/_headers`
  sets `Cross-Origin-Opener-Policy: unsafe-none` for `/admin/*` (and drops the site's Content
  Security Policy there). Keep that block if you edit the headers file.
- **The schema lock.** Tina Cloud compares `tina/tina-lock.json` with `tina/config.ts` on every
  deploy and will not build the editor when they differ. After any change to `tina/config.ts`, run
  `npx tinacms dev -c "node -e 0"` and commit the regenerated `tina/tina-lock.json`.
  `npm run check:tina-lock` fails when you forget.

## Publishing status

After a save, `https://kirbychantoronto.com/admin/status.html` shows what the build fixed in each
quick post and lists any post it held back, with the reason.

## What we learned testing it

- **Body text survives a save.** Every blog post, guide and neighbourhood page was loaded and saved
  back through Tina. The words, links, tables and the `<GuideCta>` blocks were all preserved and
  `npm run verify` still passed.
- **Tina reformats the file.** It switches YAML quotes, pads tables to line up, writes bullets as `*`
  and saves dates as full timestamps. The rendered pages are the same, but the first save of each
  file produces a large diff. `scripts/check-blog.mjs` now compares only the date part.
- **Tina does not enforce the house style in the editor.** Em dashes, commas before "and" or
  "or", title lengths and sources are checked when Cloudflare builds, so a bad edit is saved to
  GitHub but fails to deploy. Fix it in Tina and save again.
- **Every field must be listed in `tina/config.ts`.** Tina drops any frontmatter field it does not
  know about when it saves. If a field is added to `src/content.config.ts`, add it here too.
