# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A personal Hexo (v8) blog whose entire identity lives in a single custom theme, **`lysk-qiyu`** (恋与深空·祁煜 / "Love and Deepspace"). The theme is a heavily hand-built, glassmorphism + canvas-effects design (deep-sea, sakura, fish cursor trails). Content is Chinese-language security/dev study notes under `source/_posts/`. Almost all meaningful work happens inside `themes/lysk-qiyu/`.

## Commands

```bash
npm run server   # hexo server — live preview at http://localhost:4000
npm run build    # hexo generate — render site into public/
npm run clean    # hexo clean — delete public/ and db.json cache
npm run deploy   # hexo deploy — no-op until deploy.type is set in _config.yml
```

**Config caching is aggressive.** After editing either `_config.yml` (root) or `themes/lysk-qiyu/_config.yml`, you MUST run `hexo clean && hexo generate` or restart `hexo server` — Hexo caches config in `db.json` and will serve stale values otherwise. `hexo server` also does not always pick up new asset files in `themes/lysk-qiyu/source/`; when in doubt, clean first.

Create posts with `hexo new post "<title>"` (uses scaffold `scaffolds/post.md`), which writes to `source/_posts/`.

There is no test suite, linter, or automated verification. Visual/functional verification requires manual review.

## Architecture

### Config resolution (two-file cascade)
Site-level `_config.yml` (Hexo defaults, mostly untouched — `title: Hexo`, `url: http://example.com`) is overridden by `themes/lysk-qiyu/_config.yml`, which holds the real site title, menu, hero copy, effect toggles, glass parameters, and the asset manifest. EJS templates read `theme.*` first and fall back to `config.*` (see the `pick()` helper repeated across `layout.ejs`, `head.ejs`, `index.ejs`). When changing site appearance/text, edit the **theme** `_config.yml`, not the root one.

### Rendering pipeline
- Layouts are **EJS** (`hexo-renderer-ejs`); posts/pages are **Markdown** (`hexo-renderer-marked`). Stylus renderer is installed but the theme ships plain CSS, not `.styl`.
- `layout/layout.ejs` is the single shell wrapping every page. It computes body classes (`page-kind-*`, `page-theme-*`, `page-slug-*`) from the page type/path, serializes all effect settings into a `data-effect-config` JSON attribute on `.theme-shell`, and exposes glass/asset values as CSS custom properties (`--glass-bg`, `--bg-image`, etc.) inline on that element. The canvas (`#qiyu-ocean-canvas`) and fish layer (`#qiyu-fish-layer`) are declared here.
- `_partial/styles.ejs` and `_partial/scripts.ejs` are the **explicit, ordered manifests** of every CSS and JS file. New CSS/JS assets under `themes/lysk-qiyu/source/` are NOT auto-included — you must add a `<%- css(...) %>` / `<%- js(...) %>` line here, and order matters (see JS load order below).

### Client-side effects (the core of the theme)
All browser JS is an IIFE-based namespace on `window.QiyuTheme`, loaded in strict dependency order by `scripts.ejs`:
1. `js/core/utils.js` — `QiyuTheme.utils` (random, clamp, lerp, loadImage, `resolveLowPower`).
2. `js/core/config.js` — `QiyuTheme.createConfig(shell)` parses the `data-effect-config` attribute from `.theme-shell` into a merged config object with defaults.
3. `js/effects/cursor.js`, `trail.js`, `sakura.js` — each defines a `QiyuTheme.create*Effects(...)` factory that returns an effect system object.
4. `js/main.js` — the orchestrator. Reads the shell, builds the config, instantiates the three effect systems, runs a single `requestAnimationFrame` loop against the shared 2D canvas context (`#qiyu-ocean-canvas`), and wires up all page interactions (`initDetailCarousels`, `initOpeningTransition`, `initWallpaperCarousels`, `initMusicBubbles`, `initScrollTopButtons`, `initSakuraLoading`, `initPaintFrames`, `initGeneratedToc`).

**Critical:** `main.js` bails early (returns silently) if the shell, canvas, or any `create*Effects` factory is missing — a broken/reordered `scripts.ejs` silently disables **all** effects rather than erroring in the console. Keep the load order and the factory-name checks in `main.js:9` in sync.

Effects respect `prefers-reduced-motion` and a low-power heuristic (`resolveLowPower`: ≤4 cores or viewport width <768px). Effect intensity is tuned in the theme `_config.yml` under `effects:` and reduced on reading (post) pages via `reading_density`. Code comments throughout the JS are in Chinese.

### CSS organization
`themes/lysk-qiyu/source/css/` is split by concern: `settings/variables.css` (design tokens), `base/reset.css`, then `layout/`, `components/`, `content/`, `effects/`, and `responsive.css`. Page-type theming keys off the body classes emitted by `layout.ejs` (`page-kind-*`, `page-theme-*`, `page-slug-*`). 

**Tailwind note:** `tailwindcss` v4 is listed in `package.json` but is **not imported** by any CSS file or build step — the theme is entirely hand-written CSS. Tailwind utility classes will not work. Do not add Tailwind classes to markup.

## Design brief & working constraints
`ai阅读.md` (root) is the authoritative design spec for the theme — it defines the four thematic pages (深海/deep-sea, 樱花/sakura, 古风/classical, 画家/painter), the coral-red palette (`#C85040` / `#C05040`), animation timings, and layout intent. Consult it before making visual/structural theme changes. 

It also records standing constraints from the owner: 
- **Do not change the cursor-trail design**
- **Do not swap the opening background image**
- Theme work does not require reading `source/_posts/` content
- Theme work does not require spinning up a server to verify (though `npm run server` is available if you need it)

## Content & assets
- Posts: `source/_posts/*.md` with standard Hexo front-matter. `source/about/`, `source/tags/`, `source/categories/` provide the menu pages.
- Theme images live in `themes/lysk-qiyu/source/images/` and are referenced by path in the theme `_config.yml` `assets:` / `carousel_images:` blocks. `PICTURE/` and `mp3/` at the repo root are source material copied into the theme.
- `public/` (generated) and `db.json` (Hexo cache) are gitignored — never edit them by hand.
