import { expect, test } from "@playwright/test";
import type { JournalEntry } from "../../../src/lib/accounting/accounts";
import {
  computeBalanceSheet,
  computePnL,
} from "../../../src/lib/accounting/aggregation";

test.describe("accounting aggregation", () => {
  const baseEntries: JournalEntry[] = [
    {
      userId: "u",
      date: "2025-08-01",
      period: "2025-08",
      createdAt: new Date(),
      updatedAt: new Date(),
      lines: [
        { account: "REV_SUBS", side: "credit", amount: 50000 },
        { account: "ASSET_AR", side: "debit", amount: 50000 },
      ],
    },
    {
      userId: "u",
      date: "2025-08-02",
      period: "2025-08",
      createdAt: new Date(),
      updatedAt: new Date(),
      lines: [
        { account: "COGS_HOSTING", side: "debit", amount: 6000 },
        { account: "LIAB_AP", side: "credit", amount: 6000 },
      ],
    },
    {
      userId: "u",
      date: "2025-08-03",
      period: "2025-08",
      createdAt: new Date(),
      updatedAt: new Date(),
      lines: [
        { account: "OPEX_SAL", side: "debit", amount: 15000 },
        { account: "ASSET_CASH", side: "credit", amount: 15000 },
      ],
    },
  ];

  test("computePnL aggregates correctly", () => {
    const figures = computePnL("2025-08", baseEntries);
    expect(figures.revenue).toBe(50000);
    expect(figures.cogs).toBe(6000);
    expect(figures.grossProfit).toBe(44000);
    expect(figures.opex).toBe(15000);
    expect(figures.netIncome).toBe(29000);
  });

  test("computeBalanceSheet includes cumulative lines", () => {
    const bs = computeBalanceSheet("2025-08", baseEntries);
    expect(bs.assets).toBeGreaterThan(0); // Cash reduction + AR increase net positive depends on entries
  });
});
