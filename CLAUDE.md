# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a build-time static site generator for bowling tournament results. It pre-renders HTML pages with embedded data from CSV files, providing sorting, searching, and tabbed navigation without runtime data fetching.

## Architecture

### Build-Time Static Generation

The system uses Node.js with EJS templates to generate static HTML at build time:

- **No runtime CSV fetching** - All data pre-baked into HTML
- **Multi-event support** - Events listing page at `/` with cards for each event
- **Git-based timestamps** - Lockfiles capture last modification from git history
- **Clean output** - Only HTML and lockfiles in `dist/`, raw data stays in source

### Project Structure

```
/
  build/
    build.js                # Main build script
    utils/
      discovery.js          # Event scanner
      csv.js                # CSV parsing
      git.js                # Git timestamp extraction
      lockfile.js           # Lockfile generation
      helpers.js            # Shared helper functions
  templates/
    layout.ejs              # Base layout (styles)
    pages/
      event.ejs             # Event results page
      index.ejs             # Events listing homepage
      404.ejs               # Error page
  data/
    events/
      {slug}/{year}/
        meta.json           # Event configuration
        meta-lock.json      # Generated lockfile
        *.csv               # Tab-separated results
  dist/                     # Build output (gitignored)
    index.html
    404.html
    _headers
    events/
      {slug}/{year}/
        index.html          # Pre-rendered event page
        meta-lock.json      # Copied lockfile
  docs/
    templates.md            # Template reference guide
  package.json
  wrangler.toml
  _headers
```

### Data Organization

Event data lives in `data/events/{slug}/{year}/`:

```
data/events/new-years-doubles/2026/
  ├── meta.json           # Event configuration
  ├── meta-lock.json      # Generated at build time
  ├── results.csv         # Tab-separated results
  ├── singles.csv         # Tab-separated singles
  └── scratch-pot.csv     # Tab-separated scratch pot
```

**Important:** CSV files use **tab-separated** values (TSV format), not commas.

### Event Configuration (`meta.json`)

```json
{
  "format": "doubles-reentry",
  "type": "handicap",
  "pattern": "Wednesday 4's",
  "name": "Nearly New Years Doubles 2026",
  "dates": ["03/01/2026", "04/01/2026"],
  "organizer": "Debbie Alderson, Harry Wright",
  "files": [
    { "name": "Results", "file": "results.csv" },
    { "name": "Singles", "file": "singles.csv" },
    { "name": "Scratch Pot", "file": "scratch-pot.csv" }
  ]
}
```

Fields:

- `format`: Tournament format slug → mapped to display name
- `type`: Tournament type slug → mapped to display name
- `pattern`: Bowling pattern name (displayed as-is)
- `name`: Display name for the event
- `dates`: Array of dates (dd/mm/yyyy format)
- `organizer`: Event organizer name(s)
- `files`: Array of `{name, file}` objects defining tabs

### Lockfile (`meta-lock.json`)

Generated at build time with git-based timestamps:

```json
{
  "generatedAt": "2026-01-06T09:28:04.402Z",
  "lastChangeAt": "2026-01-06T00:07:18.000Z",
  "lastChangeCommit": "2ba3ffd...",
  "sourceFiles": {
    "meta.json": { "lastModified": "..." },
    "results.csv": { "lastModified": "..." }
  }
}
```

## Build System

### Commands

```bash
npm run build   # Generate dist/ from templates and data
npm run clean   # Remove dist/ directory
npm run dev     # Build once, then serve dist/ at http://localhost:3000
npm run serve   # Serve dist/ without rebuilding
```

### Build Process

1. Clean `dist/` directory
2. Discover events by scanning `data/events/*/*/meta.json`
3. For each event:
   - Parse CSV files (tab-separated)
   - Sort by "Place" column by default
   - Generate `meta-lock.json` with git timestamps
   - Render EJS template with pre-baked data
   - Write to `dist/events/{slug}/{year}/index.html`
4. Generate events listing at `dist/index.html`
5. Generate 404 page at `dist/404.html`
6. Copy `_headers` to dist

### Helper Functions (`build/utils/helpers.js`)

Display name mappings:

- `formatDisplayNames`: Format slug → display name
- `typeDisplayNames`: Type slug → display name
- `columnWidthMap`: Column name → Tailwind width class
- `numericHeaderHints`: Keywords indicating numeric columns

Utility functions:

- `slugify(str)`: Convert to URL-safe slug
- `sortRows(rows, key, dir)`: Sort rows with numeric detection
- `formatDateRange(dates)`: Format date array
- `getDisplayName(value, map)`: Lookup display name

## Adding a New Event

1. Create directory: `data/events/{slug}/{year}/`
2. Add `meta.json` with event configuration
3. Add CSV files (tab-separated) referenced in `meta.json`
4. Run `npm run build`
5. Event automatically appears on homepage and at `/events/{slug}/{year}/`

## Modifying Display

**Add new column type:**

Edit `build/utils/helpers.js`:

```javascript
const columnWidthMap = {
  // ...existing columns...
  "New Column": "min-w-[5rem]",
};
```

**Add new format:**

```javascript
const formatDisplayNames = {
  // ...existing formats...
  "new-format": "Display Name",
};
```

**Add new badge type:**

Edit `templates/pages/event.ejs` and add a new badge block.

## URL Structure

| URL                                    | Description             |
| -------------------------------------- | ----------------------- |
| `/`                                    | Events listing homepage |
| `/events/{slug}/{year}/`               | Event results page      |
| `/events/{slug}/{year}/meta-lock.json` | Lockfile (reference)    |

## Deployment (Cloudflare Pages)

### Configuration

**wrangler.toml:**

```toml
pages_build_output_dir = "dist"
```

### Deployment Steps

1. Connect repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set build output directory: `dist`
4. Deploy automatically on push to main branch

### Caching Strategy

- HTML pages: 1 hour cache
- Lockfiles: 24 hour cache
- Index page: 30 minute cache (fresher event listings)

## Technical Details

### Dependencies

- `ejs`: Template rendering
- `papaparse`: CSV parsing (tab-separated)

### Client-Side JavaScript

Event pages include inline JavaScript for:

- **Sorting**: Re-renders table from embedded `tableState`
- **Searching**: Filters visible rows
- **Tab switching**: Shows/hides panels

The `tableState` object is pre-serialized as JSON at build time.

### CSV Format

All CSV files must use **tab characters** (`\t`) as delimiters. Configured in:

- Build: `build/utils/csv.js` with `delimiter: '\t'`

### Print Styles

Included in templates for clean printing (hides controls, shows all tabs).

## Documentation

- `docs/templates.md`: Detailed template reference guide
- This file: Project overview and build system
