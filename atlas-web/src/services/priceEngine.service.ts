import * as XLSX from "xlsx";

export type PriceEngineMargins = {
  store: number;
  reseller: number;
  online: number;
};

export type PriceEngineCommercialSettings = {
  supplierName: string;
  brand: string;
  category?: string;
  discount: number;
  storeMargin: number;
  resellerMargin: number;
  onlineMargin: number;
};

export type PriceEngineAnalysis = {
  fileName: string;
  sheetName: string;
  totalRows: number;
  recognizedColumns: string[];
  missingColumns: string[];
  hasTemporaryColumn: boolean;
};

export type PriceEngineResult = {
  fileName: string;
  totalRows: number;
  changedRows: number;
  unchangedRows: number;
  warnings: string[];
};

type ColumnKey = "cost" | "store" | "reseller" | "online";

type WorkbookContext = {
  workbook: XLSX.WorkBook;
  worksheet: XLSX.WorkSheet;
  sheetName: string;
  range: XLSX.Range;
  headerRow: number;
  headers: string[];
  columns: Partial<Record<ColumnKey, number>>;
};

const TEMPORARY_TABLE_PRICE_COLUMN = "Novo PrecoTabela";
const TEMPORARY_TABLE_PRICE_COLUMN_ALT = "Novo Preço Tabela";
const LEGACY_TEMPORARY_COST_COLUMN = "Novo PrecoCusto";
const LEGACY_TEMPORARY_COST_COLUMN_ALT = "Novo Preço Custo";

const TEMPORARY_COLUMNS = [
  TEMPORARY_TABLE_PRICE_COLUMN,
  TEMPORARY_TABLE_PRICE_COLUMN_ALT,
  LEGACY_TEMPORARY_COST_COLUMN,
  LEGACY_TEMPORARY_COST_COLUMN_ALT,
];

const COLUMN_DEFINITIONS: Record<ColumnKey, { label: string; aliases: string[] }> = {
  cost: {
    label: "PrecoCusto",
    aliases: [
      "PrecoCusto",
      "PreçoCusto",
      "Preço Custo",
      "Preco Custo",
      "Preço de Custo",
      "Preco de Custo",
      "Custo",
      "Preço Compra",
      "Preco Compra",
    ],
  },
  store: {
    label: "Loja",
    aliases: ["Loja", "Preço Loja", "Preco Loja", "PVP Loja", "PVP"],
  },
  reseller: {
    label: "Revenda",
    aliases: ["Revenda", "Preço Revenda", "Preco Revenda", "PVP Revenda"],
  },
  online: {
    label: "Site Online",
    aliases: [
      "Site Online",
      "SiteOnline",
      "Online",
      "Preço Online",
      "Preco Online",
      "Preço Site Online",
      "Preco Site Online",
      "Site",
    ],
  },
};

const REQUIRED_KEYS: ColumnKey[] = ["cost", "store", "reseller", "online"];

export async function analyzePriceFile(file: File): Promise<PriceEngineAnalysis> {
  const context = await readWorkbook(file);
  const hasTemporaryColumn = findColumnIndex(context.headers, TEMPORARY_COLUMNS) !== -1;

  const recognizedColumns = REQUIRED_KEYS.filter(
    (key) => context.columns[key] !== undefined
  ).map((key) => COLUMN_DEFINITIONS[key].label);

  const missingColumns = REQUIRED_KEYS.filter(
    (key) => context.columns[key] === undefined
  ).map((key) => COLUMN_DEFINITIONS[key].label);

  return {
    fileName: file.name,
    sheetName: context.sheetName,
    totalRows: countDataRows(context),
    recognizedColumns,
    missingColumns,
    hasTemporaryColumn,
  };
}

export async function preparePriceMap(file: File): Promise<Blob> {
  const context = await readWorkbook(file);

  assertRequiredColumns(context);

  const temporaryColumnIndex = findColumnIndex(context.headers, TEMPORARY_COLUMNS);

  if (temporaryColumnIndex === -1) {
    const newColumnIndex = context.range.e.c + 1;
    const headerCell = XLSX.utils.encode_cell({ r: context.headerRow, c: newColumnIndex });

    context.worksheet[headerCell] = {
      t: "s",
      v: TEMPORARY_TABLE_PRICE_COLUMN,
    };

    context.range.e.c = newColumnIndex;
    context.worksheet["!ref"] = XLSX.utils.encode_range(context.range);
  }

  return workbookToBlob(context.workbook);
}

export async function processFilledPriceMap(
  file: File,
  settings: PriceEngineCommercialSettings | PriceEngineMargins
): Promise<{ blob: Blob; result: PriceEngineResult }> {
  const context = await readWorkbook(file);
  const warnings: string[] = [];

  assertRequiredColumns(context);

  const costColumn = context.columns.cost;
  const storeColumn = context.columns.store;
  const resellerColumn = context.columns.reseller;
  const onlineColumn = context.columns.online;
  const temporaryColumn = findColumnIndex(context.headers, TEMPORARY_COLUMNS);

  if (
    costColumn === undefined ||
    storeColumn === undefined ||
    resellerColumn === undefined ||
    onlineColumn === undefined
  ) {
    throw new Error("O ficheiro não tem todas as colunas obrigatórias reconhecidas.");
  }

  if (temporaryColumn === -1) {
    throw new Error(
      `O ficheiro ainda não tem a coluna provisória "${TEMPORARY_TABLE_PRICE_COLUMN}". Primeiro prepara o mapa no Atlas.`
    );
  }

  const commercialSettings = normalizeCommercialSettings(settings);

  let changedRows = 0;
  let unchangedRows = 0;

  for (let rowIndex = context.headerRow + 1; rowIndex <= context.range.e.r; rowIndex += 1) {
    if (isEmptyRow(context.worksheet, context.range, rowIndex)) continue;

    const temporaryCell = context.worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: temporaryColumn })];
    const newTablePrice = parseNumber(temporaryCell?.v);

    if (newTablePrice === null) {
      unchangedRows += 1;
      continue;
    }

    if (newTablePrice <= 0) {
      warnings.push(`Linha ${rowIndex + 1}: preço novo ignorado porque não é positivo.`);
      unchangedRows += 1;
      continue;
    }

    const newCost = calculateCostFromTablePrice(newTablePrice, commercialSettings.discount);

    setNumberCell(context.worksheet, rowIndex, costColumn, newCost);
    setNumberCell(context.worksheet, rowIndex, storeColumn, calculateSalePrice(newCost, commercialSettings.storeMargin));
    setNumberCell(context.worksheet, rowIndex, resellerColumn, calculateSalePrice(newCost, commercialSettings.resellerMargin));
    setNumberCell(context.worksheet, rowIndex, onlineColumn, calculateSalePrice(newCost, commercialSettings.onlineMargin));

    changedRows += 1;
  }

  removeColumn(context.worksheet, context.range, temporaryColumn);

  return {
    blob: workbookToBlob(context.workbook),
    result: {
      fileName: file.name,
      totalRows: countDataRows(context),
      changedRows,
      unchangedRows,
      warnings,
    },
  };
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export function buildPreparedFileName(fileName: string) {
  return replaceExtension(fileName, "_preparado_atlas.xlsx");
}

export function buildProcessedFileName(fileName: string) {
  return replaceExtension(fileName, "_keinvoice_pronto.xlsx");
}

function normalizeCommercialSettings(
  settings: PriceEngineCommercialSettings | PriceEngineMargins
): PriceEngineCommercialSettings {
  if ("discount" in settings) return settings;

  return {
    supplierName: "Manual",
    brand: "Manual",
    discount: 0,
    storeMargin: settings.store,
    resellerMargin: settings.reseller,
    onlineMargin: settings.online,
  };
}

async function readWorkbook(file: File): Promise<WorkbookContext> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("O ficheiro não tem folhas para analisar.");
  }

  const worksheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1:A1");
  const headerRow = findHeaderRow(worksheet, range);
  const headers = getHeaders(worksheet, range, headerRow);
  const columns = findColumns(headers);

  return {
    workbook,
    worksheet,
    sheetName,
    range,
    headerRow,
    headers,
    columns,
  };
}

function findHeaderRow(worksheet: XLSX.WorkSheet, range: XLSX.Range) {
  let bestRow = range.s.r;
  let bestScore = -1;

  for (let row = range.s.r; row <= Math.min(range.e.r, range.s.r + 30); row += 1) {
    const headers = getHeaders(worksheet, range, row);
    const columns = findColumns(headers);
    const score = REQUIRED_KEYS.filter((key) => columns[key] !== undefined).length;

    if (score > bestScore) {
      bestScore = score;
      bestRow = row;
    }

    if (score === REQUIRED_KEYS.length) return row;
  }

  return bestRow;
}

function getHeaders(worksheet: XLSX.WorkSheet, range: XLSX.Range, row: number) {
  const headers: string[] = [];

  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: column })];
    headers[column] = String(cell?.v ?? "");
  }

  return headers;
}

function findColumns(headers: string[]): Partial<Record<ColumnKey, number>> {
  return REQUIRED_KEYS.reduce<Partial<Record<ColumnKey, number>>>((columns, key) => {
    const index = findColumnIndex(headers, COLUMN_DEFINITIONS[key].aliases);

    if (index !== -1) {
      columns[key] = index;
    }

    return columns;
  }, {});
}

function assertRequiredColumns(context: WorkbookContext) {
  const missingColumns = REQUIRED_KEYS.filter(
    (key) => context.columns[key] === undefined
  ).map((key) => COLUMN_DEFINITIONS[key].label);

  if (missingColumns.length === 0) return;

  const foundHeaders = context.headers
    .map((header) => header.trim())
    .filter(Boolean)
    .join(", ");

  throw new Error(
    `O ficheiro não tem as colunas obrigatórias: ${missingColumns.join(
      ", "
    )}. Colunas encontradas: ${foundHeaders || "nenhuma"}.`
  );
}

function findColumnIndex(headers: string[], possibilities: string[]) {
  const normalizedPossibilities = possibilities.map(normalizeHeader);

  return headers.findIndex((header) => normalizedPossibilities.includes(normalizeHeader(header)));
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function countDataRows(context: WorkbookContext) {
  let rows = 0;

  for (let row = context.headerRow + 1; row <= context.range.e.r; row += 1) {
    if (!isEmptyRow(context.worksheet, context.range, row)) rows += 1;
  }

  return rows;
}

function isEmptyRow(worksheet: XLSX.WorkSheet, range: XLSX.Range, row: number) {
  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const value = worksheet[XLSX.utils.encode_cell({ r: row, c: column })]?.v;

    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return false;
    }
  }

  return true;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const normalized = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function calculateCostFromTablePrice(tablePrice: number, discount: number) {
  const safeDiscount = Math.min(Math.max(discount, 0), 99.99);
  return roundMoney(tablePrice * (1 - safeDiscount / 100));
}

function calculateSalePrice(cost: number, margin: number) {
  const safeMargin = Math.min(Math.max(margin, 0), 99.99);
  const divisor = 1 - safeMargin / 100;

  return roundMoney(cost / divisor);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function setNumberCell(worksheet: XLSX.WorkSheet, row: number, column: number, value: number) {
  worksheet[XLSX.utils.encode_cell({ r: row, c: column })] = {
    t: "n",
    v: value,
  };
}

function removeColumn(worksheet: XLSX.WorkSheet, range: XLSX.Range, columnToRemove: number) {
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let column = columnToRemove; column < range.e.c; column += 1) {
      const currentCell = XLSX.utils.encode_cell({ r: row, c: column });
      const nextCell = XLSX.utils.encode_cell({ r: row, c: column + 1 });
      const nextValue = worksheet[nextCell];

      if (nextValue) {
        worksheet[currentCell] = nextValue;
      } else {
        delete worksheet[currentCell];
      }
    }

    delete worksheet[XLSX.utils.encode_cell({ r: row, c: range.e.c })];
  }

  range.e.c -= 1;
  worksheet["!ref"] = XLSX.utils.encode_range(range);
}

function workbookToBlob(workbook: XLSX.WorkBook) {
  const output = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  return new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function replaceExtension(fileName: string, suffix: string) {
  const cleanName = fileName.replace(/\.[^.]+$/, "");
  return `${cleanName}${suffix}`;
}
