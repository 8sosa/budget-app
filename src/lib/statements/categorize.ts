// First guess at a category from a statement description. The import preview
// lets the user change any of them before saving.

import type { TransactionType } from "./parse";

// Checked in order; the first match wins.
const EXPENSE_RULES: [RegExp, string][] = [
  [/\b(sms ?alert|stamp ?duty|vat|charges?|fee|maintenance|levy|commission)\b/i, "Bank Charges"],
  [/\b(airtime|data ?(bundle|plan|purchase)?|mtn|glo|airtel|9mobile|etisalat)\b/i, "Utilities"],
  [/\b(dstv|gotv|startimes|multichoice|electric|ikedc|ekedc|aedc|phed|ibedc|eedc|kaedco|jed|prepaid ?meter|nepa|phcn|water ?(bill|board)|lawma|waste)\b/i, "Utilities"],
  [/\b(netflix|spotify|showmax|apple\.com|itunes|youtube|boomplay|audiomack|cinema|filmhouse|genesis|bet9ja|sportybet|betking|1xbet|nairabet|game)\b/i, "Entertainment"],
  [/\b(uber|bolt|indrive|in-drive|taxify|rida|lagride|brt|cowry|fuel|petrol|filling ?station|total ?energies|mobil|conoil|oando|ardova|nnpc|parking|toll)\b/i, "Transport"],
  [/\b(chowdeck|glovo|jumia ?food|heyfood|chicken ?republic|kfc|domino|pizza|mr ?bigg|tantalizer|kilimanjaro|sweet ?sensation|restaurant|eatery|kitchen|cafe|food|suya|bukka)\b/i, "Food"],
  [/\b(shoprite|spar|ebeano|justrite|market ?square|supermarket|prince ?ebeano|grocer)\b/i, "Food"],
  [/\b(jumia|konga|temu|aliexpress|amazon|shein|mall|store|boutique|fashion)\b/i, "Shopping"],
  [/\b(pharmacy|medplus|hospital|clinic|health|hmo|lab|diagnostic)\b/i, "Health"],
  [/\b(rent|landlord|estate|service ?charge)\b/i, "Housing"],
  [/\b(owealth|savings?|piggyvest|cowrywise|target ?save|fixed ?deposit)\b/i, "Savings"],
  [/\b(transfer|trf|nip|to\s)/i, "Transfers"],
];

const INCOME_RULES: [RegExp, string][] = [
  [/\b(salary|payroll|wages?)\b/i, "Salary"],
  [/\b(reversal|refund|reversed)\b/i, "Refunds"],
  [/\b(interest|cashback|bonus)\b/i, "Interest & Rewards"],
  [/\b(owealth|savings?|piggyvest|cowrywise)\b/i, "Savings"],
];

export function categorize(description: string, type: TransactionType): string {
  const rules = type === "income" ? INCOME_RULES : EXPENSE_RULES;
  for (const [pattern, category] of rules) {
    if (pattern.test(description)) return category;
  }
  return type === "income" ? "Income" : "Other";
}
