import type { Prisma } from "@prisma/client";

// Money is stored as Decimal; convert once when reading so the UI and
// client components only ever see plain numbers.
export function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : value.toNumber();
}
