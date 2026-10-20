import { describe, expect, it } from "vitest";
import { categorize } from "../categorize";
import { parseAmount, parseCsv, parseStatementDate, parseStatementRows, StatementError } from "../parse";

describe("parseAmount", () => {
  it.each([
    ["₦12,500.00", 12500],
    ["12,500.50", 12500.5],
    ["-1,000", -1000],
    ["(250.00)", -250],
    ["3,000.00 DR", -3000],
    ["NGN 4,000", 4000],
    [4500, 4500],
  ])("%s -> %s", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(["", "--", "-", null, undefined])("%s -> null", (input) => {
    expect(parseAmount(input)).toBeNull();
  });
});

describe("parseStatementDate", () => {
  it.each([
    ["2026-10-01 14:22:10", "2026-10-01"],
    ["01/10/2026", "2026-10-01"], // day first
    ["1-10-26", "2026-10-01"],
    ["01 Oct 2026 14:22", "2026-10-01"],
    ["01-OCT-2026", "2026-10-01"],
    ["1st October, 2026", "2026-10-01"],
    ["Oct 1, 2026", "2026-10-01"],
    ["Thu, Oct 01 2026", "2026-10-01"],
  ])("%s -> %s", (input, expected) => {
    expect(parseStatementDate(input)).toBe(expected);
  });

  it("reads spreadsheet dates and serial numbers", () => {
    expect(parseStatementDate(new Date(Date.UTC(2026, 9, 1)))).toBe("2026-10-01");
    expect(parseStatementDate(46296)).toBe("2026-10-01");
  });

  it.each(["Opening Balance", "31/02/2026", "", "Total"])("rejects %s", (input) => {
    expect(parseStatementDate(input)).toBeNull();
  });
});

describe("parseCsv", () => {
  it("handles quotes, embedded commas and CRLF", () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
    ]);
  });

  it("detects semicolon delimiters", () => {
    expect(parseCsv("Date;Amount\n01/10/2026;500")).toEqual([
      ["Date", "Amount"],
      ["01/10/2026", "500"],
    ]);
  });
});

// Shaped like an OPay export: account details first, then the table
const OPAY = [
  ["OPay Digital Services Limited"],
  ["Account Name", "SOSA TEST"],
  ["Period", "01 Oct 2026 - 31 Oct 2026"],
  [],
  ["Trans. Time", "Value Date", "Description", "Debit(₦)", "Credit(₦)", "Balance After(₦)", "Channel", "Transaction Reference"],
  ["01 Oct 2026 08:15:02", "01 Oct 2026", "Transfer from JOHN DOE", "--", "50,000.00", "52,000.00", "Bank Transfer", "100004261001"],
  ["01 Oct 2026 09:00:00", "01 Oct 2026", "Airtime MTN 08012345678", "1,000.00", "--", "51,000.00", "App", "100004261002"],
  ["02 Oct 2026 12:30:45", "02 Oct 2026", "Transfer to Chowdeck Technologies", "4,500.00", "--", "46,500.00", "App", "100004261003"],
  ["03 Oct 2026 07:00:00", "03 Oct 2026", "Electricity IKEDC Prepaid", "10,000.00", "--", "36,500.00", "App", "100004261004"],
  ["", "", "Total", "15,500.00", "50,000.00", "", "", ""],
];

describe("parseStatementRows", () => {
  it("reads an OPay-style statement", () => {
    const rows = parseStatementRows(OPAY, "opay");
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({
      date: "2026-10-01",
      type: "income",
      amount: 50000,
      reference: "100004261001",
      category: "Income",
    });
    expect(rows.slice(1).map((r) => [r.type, r.amount, r.category])).toEqual([
      ["expense", 1000, "Utilities"],
      ["expense", 4500, "Food"],
      ["expense", 10000, "Utilities"],
    ]);
  });

  it("reads an Access-style statement with numeric day-first dates", () => {
    const rows = parseStatementRows(
      [
        ["Posted Date", "Value Date", "Description", "Debit", "Credit", "Balance"],
        ["05/10/2026", "05/10/2026", "SALARY OCT 2026 ACME LTD", "", "350,000.00", "400,000.00"],
        ["06/10/2026", "06/10/2026", "SMS ALERT CHARGES", "4.00", "", "399,996.00"],
        ["07/10/2026", "07/10/2026", "POS PURCHASE SHOPRITE LEKKI", "23,450.75", "", "376,545.25"],
      ],
      "access"
    );
    expect(rows.map((r) => [r.date, r.type, r.amount, r.category])).toEqual([
      ["2026-10-05", "income", 350000, "Salary"],
      ["2026-10-06", "expense", 4, "Bank Charges"],
      ["2026-10-07", "expense", 23450.75, "Food"],
    ]);
  });

  it("reads a signed amount column", () => {
    const rows = parseStatementRows(
      [
        ["Date", "Narration", "Amount"],
        ["2026-10-01", "Uber trip", "-2,500"],
        ["2026-10-02", "Refund from Jumia", "2,500"],
      ],
      "other"
    );
    expect(rows.map((r) => [r.type, r.amount, r.category])).toEqual([
      ["expense", 2500, "Transport"],
      ["income", 2500, "Refunds"],
    ]);
  });

  it("gives the same line the same id on every import, and identical lines different ids", () => {
    const table = [
      ["Date", "Description", "Debit", "Credit"],
      ["01/10/2026", "Airtime", "100", ""],
      ["01/10/2026", "Airtime", "100", ""],
    ];
    const first = parseStatementRows(table, "access");
    const again = parseStatementRows(table, "access");
    expect(first.map((r) => r.externalId)).toEqual(again.map((r) => r.externalId));
    expect(first[0].externalId).not.toBe(first[1].externalId);
    expect(first[0].externalId.startsWith("access:")).toBe(true);
  });

  it("explains when there is no transaction table", () => {
    expect(() => parseStatementRows([["hello", "world"]], "opay")).toThrow(StatementError);
  });
});

describe("categorize", () => {
  it("falls back to Other and Income", () => {
    expect(categorize("XYZ ENTERPRISES", "expense")).toBe("Other");
    expect(categorize("XYZ ENTERPRISES", "income")).toBe("Income");
  });
});
