# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a static HTML-based bowling tournament results viewer. It displays tournament results from CSV files with dynamic sorting, searching, and tabbed navigation. The system is designed to be simple: no build step, no dependencies - just HTML, vanilla JavaScript, and CDN-loaded libraries.

## Architecture

### Single-Page Application Structure

The application consists of a single `index.html` file that:
- Loads tournament metadata from `meta.json`
- Dynamically creates tabs based on the event configuration
- Fetches and parses tab-separated CSV files using PapaParse
- Renders sortable tables with client-side search functionality

### Data Organization

Event data is organized in the following structure:

```
data/events/{event-name}/{year}/
  ├── meta.json           # Event configuration
  ├── results.csv         # Tab-separated results file
  ├── singles.csv         # Tab-separated singles results
  └── scratch-pot.csv     # Tab-separated scratch pot results
```

**Important:** CSV files use **tab-separated** values (TSV format), not commas.

### Event Configuration (`meta.json`)

The `meta.json` file defines the event and controls what tabs/data are displayed:

```json
{
  "format": "doubles-reentry",
  "type": "handicap",
  "pattern": "Wednesday 4's",
  "name": "Nearly New Years Doubles 2026",
  "dates": ["03/01/2025", "04/01/2025"],
  "organizer": "Gobwlng Events",
  "lastUpdated": "2025-01-04T18:30:00",
  "files": [
    {"name": "Results", "file": "results.csv"},
    {"name": "Singles", "file": "singles.csv"},
    {"name": "Scratch Pot", "file": "scratch-pot.csv"}
  ]
}
```

Fields:
- `format`: Tournament format slug (e.g., "doubles-reentry") - mapped to display name via `formatDisplayNames`
- `type`: Tournament type slug (e.g., "handicap") - mapped to display name via `typeDisplayNames`
- `pattern`: Bowling pattern name (displayed as-is)
- `name`: Display name for the event
- `dates`: Array of dates (formatted as dd/mm/yyyy)
- `organizer`: Event organizer name (optional, defaults to "Tournament Organizer")
- `lastUpdated`: ISO 8601 timestamp of last update (optional, defaults to current time)
- `files`: Array of objects with `name` (tab label) and `file` (CSV filename)

### CSV Data Format

**Doubles/Team Results:**
- Tab-separated values
- Columns: Place, Team, Squad, Player 1, Player 2, Game 1, Game 2, Game 3, Scratch, HCP Series, Team HCP

**Singles Results:**
- Tab-separated values
- Columns: Place, Squad, Player, HCP, Game 1, Game 2, Game 3, Scratch, HCP Series

### Key JavaScript Components

**Event Configuration:**
- `EVENT_BASE_PATH`: Points to the event data directory (currently hardcoded to `./data/events/new-years-doubles/2026`)
- To add a new event, update this path or parameterize it via query string

**Format & Type Display Mappings:**
- `formatDisplayNames`: Maps format slugs to display names (e.g., "doubles-reentry" → "Re-Entry Doubles")
- `typeDisplayNames`: Maps type slugs to display names (e.g., "handicap" → "Handicap")
- Easy to extend: add new slug→name mappings to these objects
- Unmapped values default to "Unknown"

**Column Width Mapping:**
- `columnWidthMap` in index.html:85-106 defines Tailwind width classes for each column header
- Add new column types here to control their display width

**Table State Management:**
- `tableState` object: Stores headers, original rows, and sort state for each tab
- Each tab has a unique key (slugified from the tab name)

**Sorting Logic:**
- Numeric columns detected via `numericHeaderHints` array (index.html:112-120)
- Numeric values are extracted by stripping commas and parsing
- Fallback to alphabetic sorting for non-numeric columns
- Stable sort preserves original order for equal values

**Search:**
- Client-side, case-insensitive search across all columns
- Filters visible rows in the active tab only
- Preserves sort state during search

## Adding a New Event

1. Create directory: `data/events/{event-name}/{year}/`
2. Add `meta.json` with event configuration
3. Add CSV files (tab-separated) referenced in `meta.json`
4. Update `EVENT_BASE_PATH` in index.html:85 to point to the new event

## Modifying Display

**Add new column type:**
1. Add column name to `columnWidthMap` in index.html:85-106
2. If numeric, ensure column name matches a hint in `numericHeaderHints` (index.html:112-120)

**Change default sort:**
- Tables default to sorting by "Place" column (ascending)
- Modify logic in index.html:500-503 and index.html:434-436

## Page Structure

**Header:**
- Dynamic event title with responsive sizing
- Color-coded badges with icons for format (blue), type (emerald), and pattern (purple)
- Prominent date display with calendar icon
- All content pulled from `meta.json`

**Footer:**
- Organizer information (from `meta.json`, left-aligned)
- Last updated timestamp (from `meta.json` or current time, stacked below organizer)
- Hardcoded copyright: "© 2026 GoBowling Shipley Lanes • Built with ❤️ for bowling"
- Ultra-minimal styling: no background, no icons, blends seamlessly with page

## Deployment (Cloudflare Pages)

### File Structure
```
/
  index.html          # Main tournament results page
  404.html            # Custom 404 error page
  wrangler.toml       # Cloudflare Pages configuration
  _headers            # Cache and security headers
  CLAUDE.md           # This file
  data/
    events/
      {event-name}/
        {year}/
          meta.json   # Event configuration
          *.csv       # Results data (tab-separated)
```

### Deployment Steps
1. Connect repository to Cloudflare Pages
2. Set build output directory to `.` (root)
3. No build command needed (static site)
4. Deploy automatically on push to main branch

### Configuration Files
- **wrangler.toml**: Cloudflare Pages settings, build output directory
- **_headers**: Caching (5 min for data files, 1 min for HTML) and security headers
- **404.html**: Custom error page with bowling theme

### Current Limitations (v0)
- `EVENT_BASE_PATH` is hardcoded to single event (`./data/events/new-years-doubles/2026`)
- Multi-event support planned for future versions
- Will require parameterization via query string or event listing page

## Technical Constraints

- No build system or bundler
- Libraries loaded from CDN (Tailwind CSS, PapaParse)
- All JavaScript is inline within index.html
- Uses polyfill for `Element.prototype.setHTMLUnsafe` for SVG icon rendering
- Designed for modern browsers with ES6+ support
- Print styles included for clean printing (hides controls, shows all tabs)

## CSV File Format

**Critical:** All CSV files must use **tab characters** (`\t`) as delimiters, not commas. The PapaParse configuration in index.html:419 explicitly sets `delimiter: "\t"`.