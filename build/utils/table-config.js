import {
  formatDisplayNames,
  typeDisplayNames,
  categoryDisplayNames,
  columnWidthMap,
  numericHeaderHints,
} from "./helpers.js";

const DEFAULT_MAX_PLAYERS = 5;
const DEFAULT_MAX_GAMES = 9;

const resultsBaseColumns = [
  { key: "Place", label: "Place", type: "number", sortable: true },
  { key: "Team", label: "Team", type: "string", sortable: false },
  { key: "HCP", label: "HCP", type: "number", sortable: true },
  { key: "Scratch", label: "Scratch", type: "number", sortable: true },
  {
    key: "Scratch Series",
    label: "Scratch Series",
    type: "number",
    sortable: true,
  },
  { key: "HCP Series", label: "HCP Series", type: "number", sortable: true },
  { key: "Squad", label: "Squad", type: "string", sortable: true },
];

const singlesBaseColumns = [
  { key: "Place", label: "Place", type: "number", sortable: true },
  { key: "Player", label: "Player", type: "string", sortable: false },
  { key: "HCP", label: "HCP", type: "number", sortable: true },
  { key: "Scratch", label: "Scratch", type: "number", sortable: true },
  {
    key: "Scratch Series",
    label: "Scratch Series",
    type: "number",
    sortable: true,
  },
  { key: "HCP Series", label: "HCP Series", type: "number", sortable: true },
  { key: "Squad", label: "Squad", type: "string", sortable: true },
];

const formatPresets = {
  results: {
    playersKey: "Player",
    baseColumns: resultsBaseColumns,
  },
  singles: {
    playersKey: "Player",
    baseColumns: singlesBaseColumns,
  },
};

export function getFormatPreset(format) {
  return formatPresets[format] || null;
}

function toColumnConfig(column) {
  return {
    key: column.key,
    label: column.label || column.key,
    type:
      column.type ||
      (numericHeaderHints.some((hint) =>
        column.key.toLowerCase().includes(hint),
      )
        ? "number"
        : "string"),
    sortable: column.sortable !== false,
    width:
      column.width ||
      columnWidthMap[column.label || column.key] ||
      columnWidthMap["*"],
  };
}

function buildGameColumns(headers, maxGames = DEFAULT_MAX_GAMES) {
  const gameColumns = [];
  for (let i = 1; i <= maxGames; i += 1) {
    const key = `Game ${i}`;
    if (headers.includes(key)) {
      gameColumns.push({
        key,
        label: key,
        type: "number",
        sortable: true,
        width:
          columnWidthMap[key] ||
          columnWidthMap["Game 1"] ||
          columnWidthMap["*"],
      });
    }
  }
  return gameColumns;
}

function buildPlayerColumns(headers, maxPlayers = DEFAULT_MAX_PLAYERS) {
  const playerColumns = [];
  const playerKey = "Player";
  if (headers.includes(playerKey)) {
    playerColumns.push({
      key: playerKey,
      label: playerKey,
      type: "string",
      sortable: false,
      width: columnWidthMap[playerKey] || columnWidthMap["*"],
    });
  }

  for (let i = 1; i <= maxPlayers; i += 1) {
    const key = `Player ${i}`;
    if (headers.includes(key)) {
      playerColumns.push({
        key,
        label: key,
        type: "string",
        sortable: false,
        width:
          columnWidthMap[key] ||
          columnWidthMap["Player 1"] ||
          columnWidthMap["*"],
      });
    }
  }

  return playerColumns;
}

export function buildColumnsFromFormat(format, headers, options = {}) {
  const preset = getFormatPreset(format);
  if (!preset) return null;

  const maxPlayers = options.maxPlayers || DEFAULT_MAX_PLAYERS;
  const maxGames = options.maxGames || DEFAULT_MAX_GAMES;

  const playerColumns = buildPlayerColumns(headers, maxPlayers);
  const gameColumns = buildGameColumns(headers, maxGames);

  const baseColumns = preset.baseColumns
    .filter((column) => headers.includes(column.key))
    .map((column) => toColumnConfig(column));

  const ordered = [
    baseColumns.find((col) => col.key === "Place"),
    baseColumns.find((col) => col.key === "Team"),
    ...playerColumns,
    baseColumns.find((col) => col.key === "HCP"),
    ...gameColumns,
    baseColumns.find((col) => col.key === "Scratch"),
    baseColumns.find((col) => col.key === "Scratch Series"),
    baseColumns.find((col) => col.key === "HCP Series"),
    baseColumns.find((col) => col.key === "Squad"),
  ].filter(Boolean);

  return ordered.map(toColumnConfig);
}

export function buildColumnsFromMeta(columns) {
  if (!Array.isArray(columns)) return null;
  return columns.map((column) => toColumnConfig(column));
}

export function buildTabConfig({ headers, rows, fileConfig, defaultSortKey }) {
  const metaColumns = buildColumnsFromMeta(fileConfig?.columns);
  const formatColumns = buildColumnsFromFormat(
    fileConfig?.format,
    headers,
    fileConfig?.formatOptions,
  );
  const columns =
    metaColumns ||
    formatColumns ||
    headers.map((key) => toColumnConfig({ key }));

  const sortKeyCandidate = columns.find(
    (column) => column.sortable && column.key === defaultSortKey,
  )
    ? defaultSortKey
    : columns.find((column) => column.sortable)?.key || "";

  return {
    columns,
    rows,
    defaultSortKey: sortKeyCandidate,
  };
}

export function getDisplayBadges(meta) {
  const badges = [];
  if (meta.format) {
    badges.push({
      type: "format",
      label: formatDisplayNames[meta.format] || "Unknown",
    });
  }
  if (meta.type) {
    badges.push({
      type: "type",
      label: typeDisplayNames[meta.type] || "Unknown",
    });
  }
  if (meta.category) {
    badges.push({
      type: "category",
      label: categoryDisplayNames[meta.category] || "Unknown",
    });
  }
  if (meta.pattern) {
    badges.push({ type: "pattern", label: meta.pattern });
  }
  return badges;
}
