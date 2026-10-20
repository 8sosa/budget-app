// Turns the rows of a bank statement (from CSV, Excel or a PDF) into transactions.
// Shared between client and server: no Prisma or Node imports here.

import { categorize } from "./categorize";

export const BANKS = {
  opay: "OPay",
  access: "Access Bank",
  other: "Other bank",
} as const;
export type Bank = keyof typeof BANKS;

export type TransactionType = "expense" | "income";

export type StatementRow = {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // always positive; type says which way the money went
  type: TransactionType;
  category: string;
  reference: string | null;
  externalId: string; // stable across re-imports of the same line
};

export type Cell = string | number | Date | null | undefined;

// A problem with the statement itself, worded for the user.
export class StatementError extends Error {}

// Column names seen on OPay and Access Bank exports, plus common generic ones.
// Earlier names win, so "Trans. Time" is used over "Value Date" when both exist.
const COLUMNS = {
  date: ["transtime", "transactiontime", "transdate", "transactiondate", "posteddate", "postingdate", "date", "valuedate"],
  description: ["description", "narration", "narrative", "transactiondetails", "details", "remarks", "particulars"],
  debit: ["debit", "debitamount", "withdrawal", "withdrawals", "moneyout", "paidout", "dr"],
  credit: ["credit", "creditamount", "deposit", "deposits", "moneyin", "paidin", "cr"],
  amount: ["amount", "transactionamount"],
  direction: ["drcr", "crdr", "direction", "type", "transactiontype"],
  reference: ["transactionreference", "referenceno", "reference", "refno", "ref", "transactionid", "sessionid"],
} as const;
type Field = keyof typeof COLUMNS;
type ColumnMap = Partial<Record<Field, number>>;

const normalizeHeader = (cell: Cell) => String(cell ?? "").toLowerCase().replace(/[^a-z]/g, "");

function mapColumns(header: Cell[]): ColumnMap {
  const names = header.map(normalizeHeader);
  const map: ColumnMap = {};
  const taken = new Set<number>();

  // Exact names first, then prefixes ("debit₦" -> "debit"), so a loose match
  // never steals a column another field names exactly.
  for (const loose of [false, true]) {
    for (const field of Object.keys(COLUMNS) as Field[]) {
      if (map[field] !== undefined) continue;
      for (const synonym of COLUMNS[field]) {
        const idx = names.findIndex((n, i) =>
          !taken.has(i) && (n === synonym || (loose && synonym.length >= 4 && n.startsWith(synonym)))
        );
        if (idx !== -1) {
          map[field] = idx;
          taken.add(idx);
          break;
        }
      }
    }
  }
  return map;
}

const hasMoneyColumns = (m: ColumnMap) =>
  (m.debit !== undefined && m.credit !== undefined) || m.amount !== undefined;

// Statements start with account details, so look for the first row that reads like a header.
export function findHeader(rows: Cell[][]): { index: number; columns: ColumnMap } | null {
  for (let i = 0; i < Math.min(rows.length, 60); i++) {
    const columns = mapColumns(rows[i]);
    if (columns.date !== undefined && columns.description !== undefined && hasMoneyColumns(columns)) {
      return { index: i, columns };
    }
  }
  return null;
}

// "₦12,500.00", "-1,000", "(250.00)", "3,000.00 DR", 4500 -> signed number; blanks and "--" -> null
export function parseAmount(cell: Cell): number | null {
  if (typeof cell === "number") return Number.isFinite(cell) ? cell : null;
  const text = String(cell ?? "").trim();
  if (!text) return null;

  const negative = /^-|^\(.*\)$|\bdr\.?$/i.test(text);
  const digits = text.replace(/[^0-9.]/g, "");
  if (!/\d/.test(digits)) return null;
  const value = parseFloat(digits);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function ymd(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d || y < 1990 || y > 2100) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const monthNumber = (name: string) => MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1;

// Nigerian statements write numeric dates day first (01/10/2026 is 1 October).
export function parseStatementDate(cell: Cell): string | null {
  if (cell instanceof Date) {
    if (isNaN(cell.getTime())) return null;
    // Spreadsheet dates are midnight UTC; nudge so the calendar day survives any offset
    const shifted = new Date(cell.getTime() + 12 * 3600 * 1000);
    return ymd(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
  }
  if (typeof cell === "number") {
    // Excel serial day number (days since 1899-12-30)
    if (cell < 20000 || cell > 80000) return null;
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(cell) * 86400000);
    return ymd(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }

  const text = String(cell ?? "").trim();
  let m: RegExpExecArray | null;

  if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(text))) return ymd(+m[1], +m[2], +m[3]);
  if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/.exec(text))) return ymd(+m[3], +m[2], +m[1]);
  if ((m = /^(\d{1,2})(?:st|nd|rd|th)?[-\s/]+([a-z]{3,9})\.?[-\s/,]+(\d{2,4})\b/i.exec(text))) {
    const month = monthNumber(m[2]);
    return month ? ymd(+m[3], month, +m[1]) : null;
  }
  if ((m = /^(?:[a-z]{3},?\s+)?([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i.exec(text))) {
    const month = monthNumber(m[1]);
    return month ? ymd(+m[3], month, +m[2]) : null;
  }
  return null;
}

const cellText = (cell: Cell) => (cell instanceof Date ? cell.toISOString() : String(cell ?? "")).trim();

// Small, dependency-free string hash (FNV-1a, 2 x 32 bit) so it runs in the browser too.
function fingerprint(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x5bd1e995);
  }
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}

function direction(cell: Cell): TransactionType | null {
  const text = normalizeHeader(cell);
  if (["dr", "d", "debit", "withdrawal", "out", "moneyout"].includes(text)) return "expense";
  if (["cr", "c", "credit", "deposit", "in", "moneyin"].includes(text)) return "income";
  return null;
}

export function parseStatementRows(rows: Cell[][], bank: Bank): StatementRow[] {
  const header = findHeader(rows);
  if (!header) {
    throw new StatementError("Couldn't find the transaction table. Look for a header row with Date, Description and Debit/Credit columns.");
  }
  const { columns } = header;
  const result: StatementRow[] = [];
  const seen = new Map<string, number>();

  for (const row of rows.slice(header.index + 1)) {
    const date = parseStatementDate(row[columns.date!]);
    if (!date) continue; // totals, page footers, repeated headers

    let amount: number | null;
    let type: TransactionType;

    if (columns.debit !== undefined && columns.credit !== undefined) {
      const debit = Math.abs(parseAmount(row[columns.debit]) ?? 0);
      const credit = Math.abs(parseAmount(row[columns.credit]) ?? 0);
      if (debit > 0) {
        amount = debit;
        type = "expense";
      } else {
        amount = credit;
        type = "income";
      }
    } else {
      const signed = parseAmount(row[columns.amount!]);
      if (signed === null) continue;
      const stated = columns.direction !== undefined ? direction(row[columns.direction]) : null;
      type = stated ?? (signed < 0 ? "expense" : "income");
      amount = Math.abs(signed);
    }
    if (!amount) continue; // opening balance and other zero lines

    amount = Math.round(amount * 100) / 100;
    const description = cellText(row[columns.description!]).replace(/\s+/g, " ").slice(0, 200) || "Bank transaction";
    const reference = columns.reference !== undefined ? cellText(row[columns.reference]) || null : null;

    // The same line imported twice must get the same id. Identical lines on the
    // same day (two ₦100 airtime top-ups) are told apart by their position.
    const key = [bank, date, type, amount.toFixed(2), description.toLowerCase(), reference ?? ""].join("|");
    const occurrence = seen.get(key) ?? 0;
    seen.set(key, occurrence + 1);

    result.push({
      date,
      description,
      amount,
      type,
      category: categorize(description, type),
      reference,
      externalId: `${bank}:${fingerprint(`${key}|${occurrence}`)}`,
    });
  }

  return result;
}

// Minimal RFC 4180 CSV reader: quoted fields, escaped quotes, commas/newlines inside quotes.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");

  // Some exports use semicolons or tabs; pick whichever appears most in the first lines
  const sample = input.slice(0, 2000);
  const delimiter = [",", ";", "\t"].reduce((best, d) =>
    sample.split(d).length > sample.split(best).length ? d : best
  );

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
