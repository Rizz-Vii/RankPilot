// Basic account taxonomy & helpers (Phase 4 ledger foundation)
// Minimal until expanded in later phases.

export type AccountCategory =
  | "Revenue"
  | "COGS"
  | "OperatingExpense"
  | "Asset"
  | "Liability"
  | "Equity";
export type NormalBalance = "debit" | "credit";

export interface AccountDef {
  code: string;
  name: string;
  category: AccountCategory;
  normal: NormalBalance;
}

export const CHART_OF_ACCOUNTS: AccountDef[] = [
  {
    code: "REV_SUBS",
    name: "Subscription Revenue",
    category: "Revenue",
    normal: "credit",
  },
  {
    code: "REV_PRO",
    name: "Professional Services Revenue",
    category: "Revenue",
    normal: "credit",
  },
  {
    code: "COGS_HOSTING",
    name: "Hosting Costs",
    category: "COGS",
    normal: "debit",
  },
  {
    code: "COGS_SUPPORT",
    name: "Support Labor",
    category: "COGS",
    normal: "debit",
  },
  {
    code: "OPEX_SAL",
    name: "Salaries & Wages",
    category: "OperatingExpense",
    normal: "debit",
  },
  {
    code: "OPEX_MKT",
    name: "Marketing Expense",
    category: "OperatingExpense",
    normal: "debit",
  },
  { code: "ASSET_CASH", name: "Cash", category: "Asset", normal: "debit" },
  {
    code: "ASSET_AR",
    name: "Accounts Receivable",
    category: "Asset",
    normal: "debit",
  },
  {
    code: "LIAB_AP",
    name: "Accounts Payable",
    category: "Liability",
    normal: "credit",
  },
  {
    code: "LIAB_DEFREV",
    name: "Deferred Revenue",
    category: "Liability",
    normal: "credit",
  },
  {
    code: "EQUITY_RE",
    name: "Retained Earnings",
    category: "Equity",
    normal: "credit",
  },
];

const byCode = new Map(CHART_OF_ACCOUNTS.map((a) => [a.code, a] as const));
export function getAccount(code: string): AccountDef | undefined {
  return byCode.get(code);
}

export interface JournalEntryLine {
  account: string;
  side: "debit" | "credit";
  amount: number;
}
export interface JournalEntry {
  id?: string;
  userId: string;
  teamId?: string | null;
  date: string; // ISO date
  period: string; // YYYY-MM
  lines: JournalEntryLine[];
  memo?: string;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function isBalanced(lines: JournalEntryLine[]): boolean {
  const debit = lines
    .filter((l) => l.side === "debit")
    .reduce((s, l) => s + l.amount, 0);
  const credit = lines
    .filter((l) => l.side === "credit")
    .reduce((s, l) => s + l.amount, 0);
  return Math.abs(debit - credit) < 1e-6;
}

export function signedAmount(
  line: JournalEntryLine,
  normal: NormalBalance
): number {
  return (line.side === normal ? 1 : -1) * line.amount;
}
