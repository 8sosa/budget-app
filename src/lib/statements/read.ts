// Server only: reads an uploaded statement file into rows for parseStatementRows.

import ExcelJS from "exceljs";
import OpenAI from "openai";
import { parseCsv, StatementError, type Cell } from "./parse";

export async function readStatementRows(file: File, password?: string): Promise<Cell[][]> {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (name.endsWith(".csv") || file.type === "text/csv") {
    return parseCsv(new TextDecoder("utf-8").decode(buffer));
  }
  if (name.endsWith(".xlsx")) return readXlsx(buffer);
  if (name.endsWith(".xls")) {
    throw new StatementError("Old .xls files aren't supported. Open it and save as .xlsx or CSV, then upload again.");
  }
  if (name.endsWith(".pdf") || file.type === "application/pdf") return readPdf(buffer, password);

  throw new StatementError("Upload a CSV, Excel (.xlsx) or PDF statement.");
}

function cellValue(value: ExcelJS.CellValue): Cell {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || value instanceof Date) return value;
  if (typeof value === "boolean") return String(value);
  if ("richText" in value) return value.richText.map((r) => r.text).join("");
  if ("result" in value) return cellValue(value.result as ExcelJS.CellValue);
  if ("text" in value) return String(value.text);
  return null;
}

async function readXlsx(buffer: ArrayBuffer): Promise<Cell[][]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new StatementError("Couldn't open that Excel file. If it's password protected, remove the password or export a CSV.");
  }

  // The transactions are on the biggest sheet
  const sheet = workbook.worksheets.reduce<ExcelJS.Worksheet | undefined>(
    (best, ws) => (!best || ws.rowCount > best.rowCount ? ws : best),
    undefined
  );
  if (!sheet) return [];

  const rows: Cell[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: Cell[] = [];
    for (let c = 1; c <= row.cellCount; c++) cells.push(cellValue(row.getCell(c).value));
    rows.push(cells);
  });
  return rows;
}

const PDF_HEADER = ["date", "description", "debit", "credit", "reference"];
const PAGES_AT_ONCE = 4;

// PDF statements lose their columns when turned into text, so an AI model reads
// each page's transaction table back into rows. The rows then go through the same
// parser as CSV and Excel files.
async function readPdf(buffer: ArrayBuffer, password?: string): Promise<Cell[][]> {
  const { getDocumentProxy, extractText } = await import("unpdf");

  let pages: string[];
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer), password ? { password } : {});
    ({ text: pages } = await extractText(pdf, { mergePages: false }));
  } catch (error) {
    if ((error as { name?: string })?.name === "PasswordException") {
      throw new StatementError(password ? "That PDF password is wrong." : "This PDF is password protected. Enter its password and try again.");
    }
    throw new StatementError("Couldn't read that PDF.");
  }

  if (!pages.some((p) => p.trim())) {
    throw new StatementError("This PDF has no readable text (it may be a scan). Try the Excel or CSV export instead.");
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new StatementError("PDF import needs OPENAI_API_KEY to be set. CSV and Excel work without it.");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const rows: Cell[][] = [PDF_HEADER];

  for (let i = 0; i < pages.length; i += PAGES_AT_ONCE) {
    const batch = pages.slice(i, i + PAGES_AT_ONCE).map((page) => (page.trim() ? readPdfPage(openai, page) : []));
    for (const pageRows of await Promise.all(batch)) rows.push(...pageRows);
  }
  return rows;
}

async function readPdfPage(openai: OpenAI, text: string): Promise<Cell[][]> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You read one page of a Nigerian bank statement (e.g. OPay or Access Bank) as extracted text.
Return JSON: {"rows": [{"date": string, "description": string, "debit": number|null, "credit": number|null, "reference": string|null}]}
- One entry per transaction line, in page order. Skip opening/closing balances, totals, and account details.
- date: the transaction date exactly as written on the statement.
- debit: money out, credit: money in, as plain numbers without currency symbols or commas. Never put the running balance in either.
- reference: the transaction reference/ID/session ID if the line has one.
- If the page has no transactions, return {"rows": []}.`,
      },
      { role: "user", content: text.slice(0, 30000) },
    ],
  });

  try {
    const data = JSON.parse(completion.choices[0].message.content || "{}");
    if (!Array.isArray(data.rows)) return [];
    return data.rows.map((r: Record<string, unknown>) =>
      PDF_HEADER.map((key) => {
        const v = r[key];
        return typeof v === "string" || typeof v === "number" ? v : null;
      })
    );
  } catch {
    return [];
  }
}
