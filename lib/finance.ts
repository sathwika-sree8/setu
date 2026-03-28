import type { RevenueType, ValuationSource } from "@prisma/client";
import xirr from "xirr";

export const REVENUE_MULTIPLES: Record<RevenueType, number> = {
  SAAS: 8,
  MARKETPLACE: 5,
  FINTECH: 7,
  OTHER: 4,
};

export type CashflowPoint = {
  amount: number;
  date: Date;
};

export function calculateGrowthPercentage(currentRevenue: number, previousRevenue: number | null | undefined) {
  if (previousRevenue == null || previousRevenue <= 0) {
    return currentRevenue > 0 ? 100 : 0;
  }

  return ((currentRevenue - previousRevenue) / previousRevenue) * 100;
}

export function calculateBurnRate(expenses: number) {
  return expenses;
}

export function calculateRunway(cash: number, burnRate: number) {
  if (burnRate <= 0) return 0;
  return cash / burnRate;
}

export function calculateAutoValuation(revenue: number, revenueType: RevenueType | null | undefined) {
  const normalizedType = revenueType ?? "OTHER";
  const arr = revenue * 12;
  return arr * REVENUE_MULTIPLES[normalizedType];
}

export function calculateCurrentValuation(args: {
  monthlyRevenue: number;
  valuationSource: ValuationSource | null | undefined;
  revenueType: RevenueType | null | undefined;
  manualValuation: number | null | undefined;
  latestFundingRoundValuation: number | null | undefined;
}) {
  const source = args.valuationSource ?? "AUTO_ESTIMATE";

  if (source === "LAST_FUNDING_ROUND" && args.latestFundingRoundValuation != null) {
    return args.latestFundingRoundValuation;
  }

  if (source === "MANUAL" && args.manualValuation != null) {
    return args.manualValuation;
  }

  if (source === "LAST_FUNDING_ROUND" && args.latestFundingRoundValuation == null) {
    return calculateAutoValuation(args.monthlyRevenue, args.revenueType);
  }

  return calculateAutoValuation(args.monthlyRevenue, args.revenueType);
}

export function calculateOwnership(args: {
  investorShares: number | null | undefined;
  totalShares: number | null | undefined;
  equityPercent: number | null | undefined;
}) {
  if (args.investorShares != null && args.totalShares != null && args.totalShares > 0) {
    return args.investorShares / args.totalShares;
  }

  if (args.equityPercent != null && args.equityPercent > 0) {
    return args.equityPercent / 100;
  }

  return 0;
}

export function calculateStakeValue(ownership: number, valuation: number | null | undefined) {
  if (valuation == null) return 0;
  return ownership * valuation;
}

export function calculateValuationGrowth(currentValuation: number | null | undefined, previousValuation: number | null | undefined) {
  if (currentValuation == null || previousValuation == null || previousValuation <= 0) {
    return 0;
  }

  return ((currentValuation - previousValuation) / previousValuation) * 100;
}

export function calculateDilution(args: {
  sharesOwned: number | null | undefined;
  totalShares: number | null | undefined;
  latestRoundSharesIssued: number | null | undefined;
}) {
  const afterOwnership =
    args.sharesOwned != null &&
    args.totalShares != null &&
    args.totalShares > 0
      ? args.sharesOwned / args.totalShares
      : 0;

  if (
    args.sharesOwned == null ||
    args.totalShares == null ||
    args.totalShares <= 0 ||
    args.latestRoundSharesIssued == null ||
    args.latestRoundSharesIssued <= 0
  ) {
    return {
      beforeOwnership: 0,
      afterOwnership,
      dilutionPercent: 0,
      isAvailable: false,
    };
  }

  const previousTotalShares = args.totalShares - args.latestRoundSharesIssued;
  if (previousTotalShares <= 0) {
    return {
      beforeOwnership: afterOwnership,
      afterOwnership,
      dilutionPercent: 0,
      isAvailable: false,
    };
  }

  const beforeOwnership = args.sharesOwned / previousTotalShares;

  if (!Number.isFinite(beforeOwnership) || beforeOwnership <= 0 || beforeOwnership > 1) {
    return {
      beforeOwnership: afterOwnership,
      afterOwnership,
      dilutionPercent: 0,
      isAvailable: false,
    };
  }

  return {
    beforeOwnership,
    afterOwnership,
    dilutionPercent: Math.max(0, (beforeOwnership - afterOwnership) * 100),
    isAvailable: true,
  };
}

export function calculateMoic(portfolioValue: number, totalInvested: number) {
  if (totalInvested <= 0) return 0;
  return portfolioValue / totalInvested;
}

export function calculateIrr(cashflows: CashflowPoint[]) {
  if (cashflows.length < 2) return 0;
  if (!cashflows.some((item) => item.amount < 0) || !cashflows.some((item) => item.amount > 0)) {
    return 0;
  }

  try {
    return xirr(
      cashflows.map((cashflow) => ({
        amount: cashflow.amount,
        when: cashflow.date,
      })),
    );
  } catch {
    return 0;
  }
}

export type StartupAlert = {
  label: "High Risk" | "Declining" | "Inactive";
  severity: "red" | "yellow";
};

export function generateStartupAlerts(args: {
  runway: number;
  growthRate: number;
  lastUpdatedAt: Date | null | undefined;
  now?: Date;
}) {
  const alerts: StartupAlert[] = [];
  const now = args.now ?? new Date();

  if (args.runway < 6) {
    alerts.push({ label: "High Risk", severity: "red" });
  }

  if (args.growthRate < 0) {
    alerts.push({ label: "Declining", severity: "yellow" });
  }

  if (args.lastUpdatedAt) {
    const diffDays = (now.getTime() - args.lastUpdatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 30) {
      alerts.push({ label: "Inactive", severity: "yellow" });
    }
  } else {
    alerts.push({ label: "Inactive", severity: "yellow" });
  }

  return alerts;
}

export function deriveStartupStatus(alerts: StartupAlert[]) {
  if (alerts.some((alert) => alert.severity === "red")) return "Red";
  if (alerts.length > 0) return "Yellow";
  return "Green";
}
