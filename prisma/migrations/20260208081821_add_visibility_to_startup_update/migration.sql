-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('PENDING', 'IN_DISCUSSION', 'DEAL_ACCEPTED', 'DEAL_REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B', 'SERIES_C', 'LATE', 'IPO');

-- CreateEnum
CREATE TYPE "InvestmentType" AS ENUM ('SAFE', 'CONVERTIBLE_NOTE', 'EQUITY', 'DIRECT_INVESTMENT');

-- CreateEnum
CREATE TYPE "UpdateType" AS ENUM ('REVENUE', 'FUNDRAISING', 'PRODUCT', 'HIRING', 'RISKS', 'GENERAL');

-- CreateTable
CREATE TABLE "FounderPost" (
    "id" TEXT NOT NULL,
    "startupId" TEXT,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FounderPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sentiment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StartupRelationship" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "founderId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "status" "RelationshipStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StartupRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorStartup" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "investedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "equity" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION,
    "dealStage" "DealStage",
    "investmentType" "InvestmentType",
    "round" TEXT,
    "termsUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "relationshipId" TEXT,

    CONSTRAINT "InvestorStartup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "equity" DOUBLE PRECISION,
    "preMoneyValuation" DOUBLE PRECISION,
    "postMoneyValuation" DOUBLE PRECISION,
    "dealStage" "DealStage" NOT NULL,
    "investmentType" "InvestmentType" NOT NULL,
    "round" TEXT,
    "termsUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "ratedUserId" TEXT NOT NULL,
    "ratedRole" TEXT NOT NULL,
    "startupId" TEXT,
    "score" INTEGER NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateNote" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivateNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StartupUpdate" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "updateType" "UpdateType" NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StartupUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Like_postId_userId_key" ON "Like"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "StartupRelationship_startupId_investorId_key" ON "StartupRelationship"("startupId", "investorId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestorStartup_relationshipId_key" ON "InvestorStartup"("relationshipId");

-- CreateIndex
CREATE INDEX "InvestorStartup_investorId_idx" ON "InvestorStartup"("investorId");

-- CreateIndex
CREATE INDEX "InvestorStartup_startupId_idx" ON "InvestorStartup"("startupId");

-- CreateIndex
CREATE INDEX "Investment_investorId_idx" ON "Investment"("investorId");

-- CreateIndex
CREATE INDEX "Investment_startupId_idx" ON "Investment"("startupId");

-- CreateIndex
CREATE INDEX "Rating_ratedUserId_idx" ON "Rating"("ratedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_raterId_ratedUserId_startupId_key" ON "Rating"("raterId", "ratedUserId", "startupId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivateNote_investorId_startupId_key" ON "PrivateNote"("investorId", "startupId");

-- CreateIndex
CREATE INDEX "StartupUpdate_startupId_idx" ON "StartupUpdate"("startupId");

-- CreateIndex
CREATE INDEX "StartupUpdate_createdAt_idx" ON "StartupUpdate"("createdAt");

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FounderPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FounderPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "StartupRelationship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
