import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { readStatementRows } from "../read";
import { parseStatementRows, StatementError } from "../parse";

describe("readStatementRows", () => {
  it("reads an .xlsx export with real date cells", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Statement");
    sheet.addRow(["Account Statement"]);
    sheet.addRow(["Trans. Time", "Description", "Debit(₦)", "Credit(₦)", "Transaction Reference"]);
    sheet.addRow([new Date(Date.UTC(2026, 9, 1)), "Mobile Data", 1500, null, "R1"]);
    sheet.addRow([new Date(Date.UTC(2026, 9, 2)), "Transfer from ADA", null, 20000, "R2"]);
    const buffer = await workbook.xlsx.writeBuffer();

    const file = new File([buffer], "opay.xlsx");
    const rows = parseStatementRows(await readStatementRows(file), "opay");
    expect(rows.map((r) => [r.date, r.type, r.amount, r.reference])).toEqual([
      ["2026-10-01", "expense", 1500, "R1"],
      ["2026-10-02", "income", 20000, "R2"],
    ]);
  });

  it("reads a CSV export", async () => {
    const file = new File(["Date,Description,Debit,Credit\n01/10/2026,Bolt ride,3200,\n"], "access.csv");
    const rows = parseStatementRows(await readStatementRows(file), "access");
    expect(rows).toMatchObject([{ date: "2026-10-01", type: "expense", amount: 3200, category: "Transport" }]);
  });

  it("rejects old .xls and unknown files with a helpful message", async () => {
    await expect(readStatementRows(new File(["x"], "s.xls"))).rejects.toThrow(StatementError);
    await expect(readStatementRows(new File(["x"], "s.txt"))).rejects.toThrow(/CSV, Excel/);
  });
});
