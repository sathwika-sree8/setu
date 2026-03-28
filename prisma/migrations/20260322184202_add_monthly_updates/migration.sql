/*
  Warnings:

  - You are about to drop the `InvestorStartup` table. If the table is not empty, all the data it contains will be lost.

*/

-- Ensure pgvector extension exists for AIDocument.embedding
CREATE EXTENSION IF NOT EXISTS vector;

-- DropTable
DROP TABLE "InvestorStartup";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Startup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT,
    "description" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currentRevenue" DOUBLE PRECISION,
    "currentBurnRate" DOUBLE PRECISION,
    "currentRunway" DOUBLE PRECISION,
    "lastUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "Startup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyUpdate" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "founderId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "expenses" DOUBLE PRECISION NOT NULL,
    "cashInBank" DOUBLE PRECISION NOT NULL,
    "users" INTEGER NOT NULL,
    "newCustomers" INTEGER NOT NULL,
    "burnRate" DOUBLE PRECISION NOT NULL,
    "runway" DOUBLE PRECISION NOT NULL,
    "growthRate" DOUBLE PRECISION NOT NULL,
    "achievements" TEXT NOT NULL,
    "challenges" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIDocument" (
    "id" TEXT NOT NULL,
    "startupId" TEXT,
    "type" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIChatMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIChatMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "MonthlyUpdate_startupId_idx" ON "MonthlyUpdate"("startupId");

-- CreateIndex
CREATE INDEX "MonthlyUpdate_founderId_idx" ON "MonthlyUpdate"("founderId");

-- CreateIndex
CREATE INDEX "MonthlyUpdate_createdAt_idx" ON "MonthlyUpdate"("createdAt");

-- CreateIndex
CREATE INDEX "AIDocument_startupId_idx" ON "AIDocument"("startupId");

-- CreateIndex
CREATE INDEX "AIChatMemory_userId_idx" ON "AIChatMemory"("userId");

-- AddForeignKey
ALTER TABLE "MonthlyUpdate" ADD CONSTRAINT "MonthlyUpdate_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyUpdate" ADD CONSTRAINT "MonthlyUpdate_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StartupUpdate" ADD CONSTRAINT "StartupUpdate_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
