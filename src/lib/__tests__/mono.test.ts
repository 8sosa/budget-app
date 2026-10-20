import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exchangeCode, getTransactions, MonoError, toSyncedTransaction } from "../mono";

describe("toSyncedTransaction", () => {
  it("converts kobo, direction and the Lagos calendar day", () => {
    expect(
      toSyncedTransaction({ id: "tx1", narration: "Airtime  MTN", amount: 150000, type: "debit", date: "2026-10-19T23:30:00.000Z" })
    ).toEqual({
      date: "2026-10-20", // 00:30 in Lagos
      description: "Airtime MTN",
      amount: 1500,
      type: "expense",
      category: "Utilities",
      externalId: "mono:tx1",
    });
    expect(toSyncedTransaction({ id: "tx2", narration: "SALARY", amount: 50000000, type: "credit", date: "2026-10-01T09:00:00Z" }))
      .toMatchObject({ type: "income", amount: 500000, category: "Salary" });
  });

  it("drops zero amounts and bad dates", () => {
    expect(toSyncedTransaction({ id: "a", amount: 0, type: "debit", date: "2026-10-01" })).toBeNull();
    expect(toSyncedTransaction({ id: "b", amount: 100, type: "debit", date: "nope" })).toBeNull();
  });
});

describe("Mono API calls", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    process.env.MONO_SECRET_KEY = "test_sk";
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));

  it("exchanges the widget code with the secret key", async () => {
    fetchMock.mockReturnValueOnce(reply(200, { data: { id: "acc_123" } }));
    await expect(exchangeCode("code_abc")).resolves.toBe("acc_123");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.withmono.com/v2/accounts/auth");
    expect(init.method).toBe("POST");
    expect(init.headers["mono-sec-key"]).toBe("test_sk");
    expect(JSON.parse(init.body)).toEqual({ code: "code_abc" });
  });

  it("surfaces Mono's error message", async () => {
    fetchMock.mockReturnValueOnce(reply(400, { message: "Invalid code" }));
    await expect(exchangeCode("bad")).rejects.toThrow(new MonoError("Invalid code"));
  });

  it("follows pagination with DD-MM-YYYY dates", async () => {
    fetchMock
      .mockReturnValueOnce(reply(200, {
        data: [{ id: "1", narration: "Bolt", amount: 250000, type: "debit", date: "2026-10-02T10:00:00Z" }],
        meta: { next: "https://api.withmono.com/v2/accounts/acc/transactions?page=2" },
      }))
      .mockReturnValueOnce(reply(200, {
        data: [{ id: "2", narration: "Transfer from ADA", amount: 1000000, type: "credit", date: "2026-10-03T10:00:00Z" }],
        meta: { next: null },
      }));

    const rows = await getTransactions("acc", new Date(Date.UTC(2026, 9, 1)), new Date(Date.UTC(2026, 9, 20)));
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.withmono.com/v2/accounts/acc/transactions?start=01-10-2026&end=20-10-2026&paginate=true"
    );
    expect(rows.map((r) => [r.externalId, r.type, r.amount])).toEqual([
      ["mono:1", "expense", 2500],
      ["mono:2", "income", 10000],
    ]);
  });

  it("never sends the secret key to another host", async () => {
    fetchMock.mockReturnValueOnce(reply(200, { data: [], meta: { next: "https://evil.example.com/steal" } }));
    await expect(getTransactions("acc", new Date(), new Date())).rejects.toThrow(MonoError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
