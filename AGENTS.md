# Repository Guidelines

## Project Structure & Module Organization

This project pre-renders bowling event pages at build time. Key paths:

- `build/` generates HTML and lockfiles; helpers live in `build/utils/`.
- `templates/` holds EJS layouts and pages (`templates/pages/event.ejs`, `index.ejs`).
- `data/events/{slug}/{year}/` contains `meta.json` and tab-separated results files.
- `static/` includes site assets (CSS, etc.).
- `dist/` is generated output and is gitignored.
- `docs/` contains reference docs; `_headers` and `wrangler.toml` support Cloudflare Pages.

## Build, Test, and Development Commands

Run builds locally with Node 18+:

```
npm run build   # Clean + render HTML, build Tailwind CSS into dist/style/index.css, and generate meta-lock.json files
npm run dev     # Watch, rebuild, and live-reload dist/ at http://localhost:3000
npm run serve   # Serve dist/ without rebuilding (use after npm run build)
npm run clean   # Remove dist/
```

Use `npm run dev` to preview `dist/` in a browser after a build.

## Coding Style & Naming Conventions

- JavaScript uses ES modules (`"type": "module"`). Match existing style: 2-space indentation, double quotes, semicolons.
- Event data lives under `data/events/{slug}/{year}/`; use lowercase kebab-case for `{slug}` and 4-digit years.
- Results files are TSV (tab-separated), not comma CSV. File names should match `meta.json` `files[].file`.

## Testing Guidelines

There are no automated tests yet. Validate changes by:

- Running `npm run build`.
- Opening `dist/index.html` and `dist/events/{slug}/{year}/index.html` to check sorting, tabs, and search.
- Spot-checking that data columns render and align (especially numeric columns).

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit style (`feat: ...`, `fix(data): ...`, optional scopes). Keep messages short and imperative.
For PRs:

- Include a concise summary and list touched data files.
- If templates/styles change, add before/after screenshots or a brief visual description.
- Do not commit generated output (`dist/`) or `**/meta-lock.json` (both are gitignored).

## Configuration & Deployment Notes

Cloudflare Pages uses `wrangler.toml` with `pages_build_output_dir = "dist"`. Keep `_headers` aligned with caching needs when changing output structure.
