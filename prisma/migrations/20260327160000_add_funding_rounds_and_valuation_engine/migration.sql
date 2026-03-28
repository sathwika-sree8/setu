-- Create enums
CREATE TYPE "RevenueType" AS ENUM ('SAAS', 'MARKETPLACE', 'FINTECH', 'OTHER');
CREATE TYPE "ValuationSource" AS ENUM ('LAST_FUNDING_ROUND', 'AUTO_ESTIMATE', 'MANUAL');

-- Alter startup snapshot fields
ALTER TABLE "Startup"
ADD COLUMN "currentGrowthRate" DOUBLE PRECISION,
ADD COLUMN "currentValuation" DOUBLE PRECISION,
ADD COLUMN "totalShares" DOUBLE PRECISION,
ADD COLUMN "revenueType" "RevenueType" DEFAULT 'OTHER',
ADD COLUMN "growthStage" TEXT,
ADD COLUMN "valuationSource" "ValuationSource" DEFAULT 'AUTO_ESTIMATE',
ADD COLUMN "manualValuation" DOUBLE PRECISION;

-- Extend monthly updates with calculated valuation
ALTER TABLE "MonthlyUpdate"
ADD COLUMN "valuation" DOUBLE PRECISION;

-- Extend investments for share-based ownership math
ALTER TABLE "Investment"
ADD COLUMN "shares" DOUBLE PRECISION,
ADD COLUMN "entryValuation" DOUBLE PRECISION;

-- Create funding rounds
CREATE TABLE "FundingRound" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "investmentAmount" DOUBLE PRECISION NOT NULL,
    "valuation" DOUBLE PRECISION NOT NULL,
    "sharesIssued" DOUBLE PRECISION NOT NULL,
    "leadInvestor" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundingRound_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FundingRound_startupId_idx" ON "FundingRound"("startupId");
CREATE INDEX "FundingRound_date_idx" ON "FundingRound"("date");

ALTER TABLE "FundingRound"
ADD CONSTRAINT "FundingRound_startupId_fkey"
FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
