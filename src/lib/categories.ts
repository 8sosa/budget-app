// Shared between client and server: no Prisma imports here.

// Same list the receipt scanner is told to choose from.
export const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Utilities",
  "Entertainment",
  "Shopping",
  "Health",
  "Housing",
  "Other",
];

// One spelling per category, so "food", " Food " and "FOOD" all become "Food"
// and spending lines up with its budget.
export function normalizeCategory(raw: string | null | undefined): string {
  const cleaned = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!cleaned) return "Other";

  const preset = DEFAULT_CATEGORIES.find((c) => c.toLowerCase() === cleaned.toLowerCase());
  if (preset) return preset;

  return cleaned
    .toLowerCase()
    .replace(/(^|\s)\S/g, (ch) => ch.toUpperCase());
}

// Defaults first, then the user's own categories, without duplicates.
export function mergeCategories(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of lists) {
    for (const cat of list) {
      const name = normalizeCategory(cat);
      if (!seen.has(name)) {
        seen.add(name);
        result.push(name);
      }
    }
  }
  return result;
}
