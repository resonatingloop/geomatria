# 2026-06-22 — Curated public GitHub Pages deploy

Step-by-step guide for shipping a **curated** public atlas to GitHub Pages while
full development continues in the same public repo. Curation, not secrecy: source
is public; only polished datasets/features reach the live site.

Plan of record: `~/.claude/plans/fancy-wandering-giraffe.md`.

How it works in one line: the public site is a **static build** gated by a
build-target flag (drops in-progress features) + an editable **allowlist**
(drops un-curated datasets). No branches involved.

---

## Part A — One-time setup (build the mechanism)

These are the code/config changes (done once; after this you just curate + tag).

### A1. Build-target flag — hide in-progress features

The flag is driven by Vite's build **mode**, not an env file — so the committed
`build:public` npm script (`vite build --mode public`) is the single source of
truth and a missing file can't silently leak the live toggle. It **fails closed**
to "full" for any other mode.

1. In `atlas/vite.config.js`, inline the flag from mode (see A2 for the combined
   config):
   ```js
   define: {
     "import.meta.env.VITE_DEPLOY_TARGET": JSON.stringify(
       mode === "public" ? "public" : "full"
     ),
   },
   ```
2. In `atlas/src/main.jsx`, near the other top constants:
   ```js
   const PUBLIC_BUILD = import.meta.env.VITE_DEPLOY_TARGET === "public";
   ```
3. Gate the live source so it's absent from the public build:
   - skip the live-toggle UI render when `PUBLIC_BUILD` (`{!PUBLIC_BUILD && (...)}`);
   - early-return the `loadLiveManifest` effect when `PUBLIC_BUILD`;
   - `selectedSource` then stays static (the toggle that could change it is gone).
   Vite inlines the flag → esbuild eliminates the dead `live` branches.
   Verify: `grep -c "live local instrument" dist/assets/*.js` returns **2** for a
   full build, **1** for a public build (the live-button title is stripped; the
   eyebrow string remains).

### A2. Base-aware asset URLs — work under `…github.io/geogematria/`

1. Add a helper (e.g. in `atlas/src/atlasData.js`):
   ```js
   export function resolveAssetUrl(path) {
     return import.meta.env.BASE_URL + String(path).replace(/^\//, "");
   }
   ```
2. Use `resolveAssetUrl(...)` at every fetch site:
   - manifest (`main.jsx:39` `MANIFEST_URL`),
   - basemap style (`main.jsx:45` `DARK_BASEMAP_STYLE_URL`),
   - each dataset GeoJSON (`entry.file`).
3. In `atlas/vite.config.js`, make `base` mode-driven:
   ```js
   export default defineConfig(({ mode }) => ({
     base: mode === "public" ? "/geogematria/" : "/",
     // ...existing plugins / server config
   }));
   ```
4. Relax the validation at `atlas/src/atlasData.js:37` to accept `data/`
   (with or without a leading slash) + `.geojson`.
5. Check `atlas/public/basemap-night.json` for internal absolute URLs
   (sprite/glyphs/tiles); base-prefix any that break under the subpath.

### A3. Data curation build step

1. Move datasets out of the auto-served dir (use `git mv`):
   `atlas/public/data/*` → `atlas/datasets/` (new source-of-truth, tracked).
2. Add `atlas/scripts/build-data.mjs` taking `--target=full|public`:
   - `full`: copy all datasets + full manifest into `atlas/public/data/`.
   - `public`: read `atlas/datasets/curation.public.json` allowlist, copy only
     those files + write a filtered `manifest.json` into `atlas/public/data/`.
3. Add `atlas/datasets/curation.public.json` — the editable allowlist (seed with
   a small starter set).
4. In `atlas/package.json` scripts:
   ```json
   "predev":  "node scripts/build-data.mjs --target=full",
   "prebuild":"node scripts/build-data.mjs --target=full",
   "build:public": "node scripts/build-data.mjs --target=public && vite build --mode public"
   ```
5. In `.gitignore`, add `atlas/public/data/` (now a generated artifact).

### A4. GitHub Pages workflow (manual / tag-triggered)

Add `.github/workflows/pages.yml`:
- Triggers: `workflow_dispatch` + `push: { tags: ["atlas-v*"] }`.
- Permissions: `pages: write`, `id-token: write`, `contents: read`;
  `environment: github-pages`.
- Steps: checkout → setup-node → `npm ci` (in `atlas/`) → `npm run build:public`
  → `actions/configure-pages` → `actions/upload-pages-artifact` (`path: atlas/dist`)
  → `actions/deploy-pages`.

### A5. Enable Pages (you, in GitHub UI — once)

Repo → **Settings → Pages → Build and deployment → Source = "GitHub Actions"**.

---

## Part B — Verify before first deploy

```bash
cd atlas

# 1. Full dev still normal (live toggle present, all datasets load)
npm run dev

# 2. Public build + serve under the project subpath
npm run build:public
npx vite preview --base /geogematria/
#   → live toggle / in-progress UI absent
#   → only curated datasets appear; basemap + GeoJSON load (no 404s)

# 3. Confirm the curation gate physically excluded files
ls dist/data/         # should contain ONLY allowlisted files

# 4. Tests
npm test
```

---

## Part C — Day-to-day, once it's live

**To curate** (decide what's public): open the running app, decide which datasets
look good / work, then edit `atlas/datasets/curation.public.json` to match.
Commit.

**To deploy** (publish the current curated state) — pick one:
- Tag a release:
  ```bash
  git tag atlas-v1   # bump the number each release
  git push origin atlas-v1
  ```
- Or GitHub UI → **Actions → Pages → Run workflow**.

The public site only changes when you do one of these — pushing to `main` alone
does **not** redeploy.

> **Deploy runs from `main`.** `workflow_dispatch` only shows in the Actions UI
> for workflows on the default branch, and the `github-pages` environment is
> branch-restricted to `main` by default. So "deploy" effectively means: merge
> the curated state to `main`, then tag/Run-workflow there — not tag from a
> `session-*` branch.

**To switch to a custom domain later:** set `base: "/"` for the public mode in
`vite.config.js` and add a `CNAME` file; the rest is unchanged.

---

## Notes / gotchas

- Vite copies everything in `public/` to `dist/` verbatim — that's why datasets
  must be excluded at the *file* level (Part A3), not just removed from the
  manifest.
- After A3, dev depends on the `predev` step regenerating `public/data/`.
- If in-progress *source* (not just the running feature) ever needs to be hidden,
  that's the trigger to split into a private dev repo + public deploy repo — the
  flag/allowlist carry over with no rework.
