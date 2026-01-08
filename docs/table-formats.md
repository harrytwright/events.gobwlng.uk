# Table Formats & Column Mapping

This project supports standardized tables for common result formats and a per-file column map for non-standard CSVs. Configure these in each event’s `meta.json` file under `files`.

## Standard Results (`format: "results"`)

Expected header set (optional columns are skipped if missing):
- `Place`
- `Team` (optional)
- `Player 1` … `Player N` (up to 5)
- `HCP` (optional)
- `Game 1` … `Game N` (up to 9)
- `Scratch` or `Scratch Series`
- `HCP Series` (optional)
- `Squad` (optional)

This is intended for `results.csv` so widths and sorting stay consistent across events.

## Singles (`format: "singles"`)

Expected header set (optional columns are skipped if missing):
- `Place`
- `Player`
- `HCP` (optional)
- `Game 1` … `Game N` (up to 9)
- `Scratch` or `Scratch Series`
- `HCP Series` (optional)
- `Squad` (optional)

## Format Options

You can override player/game limits per file:
```json
{ "format": "results", "formatOptions": { "maxPlayers": 5, "maxGames": 9 } }
```

## Custom Column Mapping

For non-standard CSVs (group stages, side pots, etc.), define an explicit column list:
```json
{
  "name": "Scratch Pot",
  "file": "scratch-pot.csv",
  "columns": [
    { "key": "Place", "label": "Place", "type": "number", "sortable": true, "width": "min-w-[4rem]" },
    { "key": "Player", "label": "Player", "type": "string", "sortable": true, "width": "min-w-[10rem]" },
    { "key": "Scratch", "label": "Scratch", "type": "number", "sortable": true, "width": "min-w-[6rem]" }
  ]
}
```

### Column Fields
- `key` (required): CSV header to read.
- `label`: Display name for the table header.
- `type`: `number` or `string` (controls sorting).
- `sortable`: `true`/`false` (default `true`).
- `width`: Tailwind width class (e.g., `min-w-[6rem]`).

## Notes
- If both `format` and `columns` are present, `columns` wins.
- Any columns not listed in `columns` are hidden.
