import type { JournalEntry} from './accounts';
import { CHART_OF_ACCOUNTS, signedAmount } from './accounts';

export interface ProfitAndLossFigures {
    revenue: number;
    cogs: number;
    grossProfit: number;
    opex: number;
    netIncome: number;
}

export interface BalanceSheetFigures {
    assets: number;
    liabilities: number;
    equity: number;
}

const accountMap = new Map(CHART_OF_ACCOUNTS.map(a => [a.code, a] as const));

export function computePnL(period: string, entries: JournalEntry[]): ProfitAndLossFigures {
    const lines = entries.filter(e => e.period === period).flatMap(e => e.lines);
    let revenue = 0, cogs = 0, opex = 0;
    for (const l of lines) {
        const acct = accountMap.get(l.account);
        if (!acct) continue;
        if (acct.category === 'Revenue') revenue += signedAmount(l, acct.normal);
        else if (acct.category === 'COGS') cogs += signedAmount(l, acct.normal);
        else if (acct.category === 'OperatingExpense') opex += signedAmount(l, acct.normal);
    }
    cogs = Math.abs(cogs);
    opex = Math.abs(opex);
    const grossProfit = revenue - cogs;
    const netIncome = grossProfit - opex;
    return { revenue, cogs, grossProfit, opex, netIncome };
}

export function computeBalanceSheet(asOfPeriod: string, entries: JournalEntry[]): BalanceSheetFigures {
    const lines = entries.filter(e => e.period <= asOfPeriod).flatMap(e => e.lines);
    let assets = 0, liabilities = 0, equity = 0;
    for (const l of lines) {
        const acct = accountMap.get(l.account);
        if (!acct) continue;
        const amt = signedAmount(l, acct.normal);
        if (acct.category === 'Asset') assets += amt;
        else if (acct.category === 'Liability') liabilities += amt;
        else if (acct.category === 'Equity') equity += amt;
    }
    return { assets, liabilities, equity };
}
