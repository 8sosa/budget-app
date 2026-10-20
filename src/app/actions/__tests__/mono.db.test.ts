// Runs against a real Postgres when TEST_DATABASE_URL is set; skipped otherwise.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const url = process.env.TEST_DATABASE_URL;
if (url) process.env.NETLIFY_DB_URL = url;

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next-auth", () => ({ getServerSession: async () => ({ user: { email: "mono-test@example.com" } }) }));

describe.skipIf(!url)("Mono sync against the database", async () => {
  const { default: prisma } = await import("@/lib/prisma");
  const { linkMonoAccount, syncBankConnection } = await import("../mono");
  let userId: string;

  const reply = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  const tx = [
    { id: "m1", narration: "Transfer from JOHN DOE", amount: 5000000, type: "credit", date: "2026-10-20T07:15:02Z" },
    { id: "m2", narration: "Airtime MTN", amount: 100000, type: "debit", date: "2026-10-20T08:00:00Z" },
    { id: "m3", narration: "Bolt ride", amount: 320000, type: "debit", date: "2026-10-20T09:00:00Z" },
  ];

  beforeAll(async () => {
    process.env.MONO_SECRET_KEY = "sk";
    process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY = "pk";
    await prisma.user.deleteMany({ where: { email: "mono-test@example.com" } });
    const user = await prisma.user.create({ data: { email: "mono-test@example.com", currency: "₦" } });
    userId = user.id;
    // Already uploaded from an OPay statement: the same transfer in
    await prisma.transaction.create({
      data: { userId, amount: 50000, type: "income", category: "Income", description: "Transfer from JOHN DOE",
        date: new Date("2026-10-20T12:00:00Z"), source: "opay", externalId: "opay:abc" },
    });

    vi.stubGlobal("fetch", vi.fn((u: string) => {
      if (u.endsWith("/v2/accounts/auth")) return reply({ data: { id: "acc_1" } });
      if (u.endsWith("/v2/accounts/acc_1")) return reply({ data: { account: { name: "TEST", account_number: "8012345678", institution: { name: "OPay" } } } });
      return reply({ data: tx, meta: { next: null } });
    }));
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: "mono-test@example.com" } });
    vi.unstubAllGlobals();
    await prisma.$disconnect();
  });

  it("links, skips lines already imported from a statement, and re-syncs without duplicates", async () => {
    const linked = await linkMonoAccount("code");
    expect(linked).toMatchObject({ success: true, imported: 2, fetched: 3 });

    const connection = await prisma.bankConnection.findFirstOrThrow({ where: { userId } });
    expect(connection).toMatchObject({ institution: "OPay", accountNumber: "5678" });

    const again = await syncBankConnection(connection.id);
    expect(again).toMatchObject({ success: true, imported: 0 });

    const rows = await prisma.transaction.findMany({ where: { userId }, orderBy: { amount: "asc" } });
    expect(rows.map((r) => [r.source, r.type, r.amount.toNumber()])).toEqual([
      ["mono", "expense", 1000],
      ["mono", "expense", 3200],
      ["opay", "income", 50000],
    ]);
  });
});
