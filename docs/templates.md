# Template Reference Guide

This document explains the EJS template structure for the bowling tournament results site. Templates are located in `templates/` and rendered at build time.

## Template Overview

```
templates/
  layout.ejs          # Base layout (currently unused - styles inline)
  pages/
    event.ejs         # Individual event results page
    index.ejs         # Events listing/homepage
    404.ejs           # Error page
```

---

## Event Page (`templates/pages/event.ejs`)

The main template for displaying tournament results. Receives pre-parsed data from the build script.

### Template Variables

| Variable             | Type   | Description                               |
| -------------------- | ------ | ----------------------------------------- |
| `meta`               | Object | Event metadata from `meta.json`           |
| `tabs`               | Array  | Tab data with column config and pre-sorted rows |
| `tableState`         | Object | Pre-built state for client-side sorting   |
| `lockfile`           | Object | Build metadata with timestamps            |
| `formatDisplayNames` | Object | Format slug → display name mapping        |
| `typeDisplayNames`   | Object | Type slug → display name mapping          |
| `columnWidthMap`     | Object | Column name → Tailwind width class        |
| `numericHeaderHints` | Array  | Keywords indicating numeric columns       |

### Helper Functions Available

```javascript
slugify(str); // Convert string to URL-safe slug
getColumnWidthClass(h); // Get Tailwind width class for column
isLikelyNumericHeader(h); // Check if column is numeric
isNumericValue(v, h); // Check if value should be right-aligned
formatDateRange(dates); // Format array of dates
getDisplayName(v, map); // Get display name from mapping
formatLastUpdated(ts); // Format timestamp for display
```

### Page Structure

```
┌─────────────────────────────────────────────┐
│              Event Header                    │
│  Title, Format/Type/Pattern badges, Dates   │
├─────────────────────────────────────────────┤
│  Tab Navigation (Results | Singles | ...)    │
├─────────────────────────────────────────────┤
│  Search Input                                │
├─────────────────────────────────────────────┤
│  Tab Panels                                  │
│  ┌─────────────────────────────────────────┐│
│  │  Table Header (sortable columns)        ││
│  │  Table Body (pre-rendered rows)         ││
│  └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│              Footer                          │
│  Organizer, Last Updated, Copyright         │
└─────────────────────────────────────────────┘
```

### Header Section

Renders event name, badges (format, type, pattern), and dates:

```ejs
<header id="eventHeader" class="mb-8 text-center">
  <h1><%%= meta.name %></h1>

  <%% if (meta.format) { %>
    <span class="... text-blue-700 bg-blue-100 ...">
      <%%= getDisplayName(meta.format, formatDisplayNames) %>
    </span>
  <%% } %>
  <!-- Similar for type and pattern badges -->

  <%% if (meta.dates && meta.dates.length) { %>
    <span><%%= formatDateRange(meta.dates) %></span>
  <%% } %>
</header>
```

### Tab Navigation

Tabs are rendered from the `tabs` array. First tab is active by default:

```ejs
<nav id="tabsNav" class="-mb-px flex gap-4">
  <%% tabs.forEach((tab, index) => { %>
    <button
      class="tab-btn ... <%%= tab.isActive ? 'text-blue-600 border-blue-600' : 'text-gray-500' %>"
      data-tab-target="<%%= tab.id %>"
      aria-selected="<%%= tab.isActive ? 'true' : 'false' %>"
    ><%%= tab.name %></button>
  <%% }); %>
</nav>
```

### Pre-Rendered Tables

Tables are fully rendered at build time with all data:

```ejs
<%% tabs.forEach((tab) => { %>
  <div id="<%%= tab.id %>" class="tab-panel <%%= tab.isActive ? '' : 'hidden' %>">
    <table>
      <thead>
        <tr id="<%%= tab.id %>Header">
          <%% tab.columns.forEach((column) => { %>
            <th class="<%%= column.width %>" data-key="<%%= column.key %>">
              <%%= column.label %>
            </th>
          <%% }); %>
        </tr>
      </thead>
      <tbody id="<%%= tab.id %>Body">
        <%% tab.rows.forEach((row, rowIndex) => { %>
          <tr class="<%%= rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50' %>">
            <%% tab.columns.forEach((column) => { %>
              <td class="<%%= isNumericValue(row[column.key], column.key) ? 'text-right tabular-nums' : '' %>">
                <%%= row[column.key] || '' %>
              </td>
            <%% }); %>
          </tr>
        <%% }); %>
      </tbody>
    </table>
  </div>
<%% }); %>
```

### Client-Side JavaScript

The inline JavaScript handles:

1. **Sorting** - Re-renders table rows when column headers are clicked
2. **Searching** - Filters visible rows based on search input
3. **Tab Switching** - Shows/hides panels, resets sort state

Key pattern - tableState is pre-serialized as JSON:

```ejs
<script>
  const tableState = <%%- JSON.stringify(tableState) %>;
  // Note: <%- %> outputs unescaped (raw JSON)
</script>
```

---

## Index Page (`templates/pages/index.ejs`)

Homepage listing all events as cards.

### Template Variables

| Variable             | Type     | Description                          |
| -------------------- | -------- | ------------------------------------ |
| `events`             | Array    | List of `{slug, year, meta}` objects |
| `formatDisplayNames` | Object   | Format mappings                      |
| `typeDisplayNames`   | Object   | Type mappings                        |
| `formatDateRange`    | Function | Date formatting                      |
| `getDisplayName`     | Function | Display name lookup                  |

### Card Structure

```ejs
<%% events.forEach((event) => { %>
  <a href="/events/<%%= event.slug %>/<%%= event.year %>/">
    <h2><%%= event.meta.name %></h2>
    <!-- Badges for format, type, pattern -->
    <span><%%= formatDateRange(event.meta.dates) %></span>
    <span>View Results →</span>
  </a>
<%% }); %>
```

---

## 404 Page (`templates/pages/404.ejs`)

Simple error page with bowling theme.

### Template Variables

| Variable      | Type   | Description                |
| ------------- | ------ | -------------------------- |
| `currentYear` | Number | Current year for copyright |

---

## Adding New Features

### New Column Type

1. Add to `columnWidthMap` in `build/utils/helpers.js`:

   ```javascript
   'New Column': 'min-w-[5rem]',
   ```

2. If numeric, add keyword to `numericHeaderHints`:
   ```javascript
   const numericHeaderHints = ['place', 'game', ..., 'newkeyword'];
   ```

### New Event Format

Add to `formatDisplayNames` in `build/utils/helpers.js`:

```javascript
'new-format-slug': 'Display Name',
```

### New Badge Type

In `event.ejs`, duplicate an existing badge block and customize:

```ejs
<%% if (meta.newField) { %>
  <span class="... text-amber-700 bg-amber-100 ...">
    <%%= meta.newField %>
  </span>
<%% } %>
```

---

## Data Flow

```
meta.json + CSV files
        ↓
  Build Script (build/build.js)
        ↓
  Parse CSV → Sort by Place → Build tabs array
        ↓
  Render EJS with pre-baked data
        ↓
  dist/events/{slug}/{year}/index.html
  (All data embedded, no runtime fetching)
```

## Key Design Decisions

1. **No Runtime CSV Fetching** - All data pre-baked into HTML
2. **Client-Side Sorting** - JavaScript re-renders from embedded `tableState`
3. **Git-Based Timestamps** - Lockfile captures last modification from git
4. **Tab-Separated CSV** - PapaParse configured with `delimiter: '\t'`
5. **Tailwind Build** - CSS generated during build via PostCSS
6. **Table Formats** - Standard formats and per-file column mapping live in `docs/table-formats.md`
