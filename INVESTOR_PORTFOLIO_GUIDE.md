# Investor Portfolio Implementation Guide

## Overview
A complete data-driven investor portfolio system with automatic metric calculations, investment tracking, founder ratings, and performance metrics.

## Key Features Implemented

### 1️⃣ Amount Invested - Data-Driven Source of Truth

**Source:** `Investment` table (Prisma model)

**How it works:**
- Created when founder **accepts a deal** (triggers `acceptDeal` action in [dealRoom.ts](app/actions/dealRoom.ts))
- Modal collects: amount, equity, deal stage, investment type
- System creates Investment record automatically
- **Never manually edited** in portfolio

**Calculated in:** `getInvestorPortfolioStats()` in [portfolio.ts](app/actions/portfolio.ts)
```typescript
totalInvested = SUM(Investment.amount) WHERE investorId = currentUser
activeInvestments = COUNT(Investment) WHERE investorId = currentUser AND relationship.status = DEAL_ACCEPTED
```

---

### 2️⃣ Founder Rating - Investor-Only System

**Rules:**
- ✅ Only investors can rate founders
- ✅ Only investors who **invested** (have Investment record)
- ✅ Must **participated in discussion** before rating
- ✅ Ratings are 1-5 scale with optional feedback

**Trigger:** After deal accepted, investors see "Rate Founder" button

**Component:** [RateFounderButton.tsx](components/portfolio/RateFounderButton.tsx)

**Rating breakdown:**
- Communication (1-5)
- Transparency (1-5)
- Execution (1-5)
- Average = (comm + trans + exec) / 3

**Calculated:** `getInvestorPortfolioStats()`
```typescript
averageFounderRating = AVG(Rating.score) WHERE ratedUserId = any_founder AND ratedRole = "FOUNDER"
```

---

### 3️⃣ Founder Performance Metrics - All Auto-Calculated

**Source:** All calculated server-side in `getFounderMetrics()` in [portfolio.ts](app/actions/portfolio.ts)

#### METRIC 1: Investors Onboarded
```
COUNT(DISTINCT Investment.investorId) 
WHERE startup.founderId = userId AND status = DEAL_ACCEPTED
```

#### METRIC 2: Average Investor Rating
```
AVG(Rating.score) 
WHERE ratedUserId = founderId AND ratedRole = "FOUNDER"
```
Default: `N/A` if no ratings

#### METRIC 3: Update Frequency
```
- Updates in last 90 days: COUNT(StartupUpdate)
- Display: "X.X updates / month"
- If no updates in 45+ days: "Inactive (no updates in X days)"
```

#### METRIC 4: Deal Conversion Rate
```
(DEAL_ACCEPTED relationships / Total requests) * 100
```

Display location: **Investor Portfolio → Founder Metrics Tab**

---

## Data Flow Diagram

```
Deal Acceptance
    ↓
Founder clicks "Accept Deal"
    ↓
AcceptDealModal collects: amount, equity, stage, type
    ↓
acceptDeal() creates Investment record
    ↓
StartupRelationship status → DEAL_ACCEPTED
    ↓
Investor Portfolio auto-updates:
├── Total Invested (from Investment sum)
├── Active Investments (from accepted relationships)
├── Founder Rating Avg (from ratings given)
└── Deal Rate (from accepted vs total)

Investor rates founder (with RateFounderButton)
    ↓
submitRating() validates:
├── Investment exists
├── Discussion participated
├── Deal accepted
    ↓
Rating record created
    ↓
Portfolio Founder Metrics tab updates
```

---

## Files Created/Modified

### ✅ New Files Created

1. **[app/actions/portfolio.ts](app/actions/portfolio.ts)** - Core portfolio logic
   - `getPortfolioData()` - Complete portfolio fetch
   - `getInvestorPortfolioStats()` - Investment metrics
   - `getFounderMetrics()` - Founder performance metrics
   - `savePrivateNote()`, `deletePrivateNote()`, `getPrivateNotes()` - Note management

2. **[components/portfolio/PrivateNoteEditor.tsx](components/portfolio/PrivateNoteEditor.tsx)** - Client component for managing notes
   - Save/delete functionality
   - Rich inline editing

### ✅ Modified Files

1. **[app/actions/dealRoom.ts](app/actions/dealRoom.ts)**
   - Enhanced `submitRating()` - Added investment validation
   - Marked portfolio functions as deprecated (moved to portfolio.ts)
   - Improved rating rule enforcement

2. **[app/(root)/user/me/portfolio/page.tsx](app/(root)/user/me/portfolio/page.tsx)**
   - Complete rewrite using new actions
   - Fixed metric calculations
   - Integrated PrivateNoteEditor
   - Proper investor vs founder data separation
   - Stats cards display: Total Invested, Active Investments, Founder Rating, Deal Rate

### ✅ Unchanged (Already Working)

1. **[components/requests/AcceptDealModal.tsx](components/requests/AcceptDealModal.tsx)** ✓
   - Already collects investment details
   - Calls acceptDeal() properly

2. **[components/portfolio/RateFounderButton.tsx](components/portfolio/RateFounderButton.tsx)** ✓
   - Already has communication/transparency/execution fields
   - Calls submitRating() properly

---

## Database Models (Already Exist)

```prisma
model Investment {
  id                  String   @id @default(cuid())
  investorId          String   // Clerk userId
  startupId           String   // Sanity startup ID
  amount              Float
  equity              Float?   // Percentage ownership
  dealStage           DealStage
  investmentType      InvestmentType
  createdAt           DateTime @default(now())
  
  @@index([investorId])
  @@index([startupId])
}

model Rating {
  id                  String   @id @default(cuid())
  raterId             String   // Who submitted
  ratedUserId         String   // Who is rated
  ratedRole           String   // "FOUNDER" or "INVESTOR"
  startupId           String?  // Related to this startup
  score               Int      // 1-5
  feedback            String?
  createdAt           DateTime @default(now())
  
  @@unique([raterId, ratedUserId, startupId])
  @@index([ratedUserId])
}

model PrivateNote {
  id                  String   @id @default(cuid())
  investorId          String
  startupId           String
  content             String
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  @@unique([investorId, startupId])
}
```

---

## Summary Stats Card Display

| Card | Calculation | Source | Status |
|------|-------------|--------|--------|
| **Total Invested** | SUM(Investment.amount) | Investment table | ✅ Automatic |
| **Active Investments** | COUNT where status=DEAL_ACCEPTED | StartupRelationship | ✅ Automatic |
| **Founder Rating Avg** | AVG(Rating.score) from investors | Rating table | ✅ Automatic |
| **Deal Rate (Founder)** | (accepted / total) * 100 | StartupRelationship | ✅ Automatic |

---

## Empty State Handling

```typescript
// No investments
Total Invested → $0
Active Investments → 0
Founder Metrics → All show default values

// No ratings received
Founder Rating Avg → N/A
Avg Investor Rating → N/A

// No deal requests
Deal Rate → 0%
Update Status → "No updates yet"
```

---

## Action Flow - Accept Deal

```
1. Founder receives investment request
2. Founder clicks "Accept Deal"
3. AcceptDealModal opens → collects:
   - Amount invested (required)
   - Equity % (optional)
   - Deal Stage (dropdown)
   - Investment Type (dropdown)
4. accep tDeal(relationshipId, amount, equity, stage, type) called
5. Creates Investment record with fields
6. Updates StartupRelationship → DEAL_ACCEPTED
7. Investor portfolio auto-revalidates/refreshes
```

---

## Action Flow - Rate Founder

```
1. Investor with DEAL_ACCEPTED sees "Rate Founder" button
2. Investor must have sent ≥1 message in discussion
3. Investor clicks → modal opens with:
   - Communication (1-5)
   - Transparency (1-5)
   - Execution (1-5)
   - Feedback (optional)
4. submitRating() validates:
   - Investment exists for this investor/founder/startup
   - Deal is DEAL_ACCEPTED
   - Rater participated in discussion
5. Creates/updates Rating record
6. Average calculated from all investor ratings to founder
```

---

## Testing Checklist

- [ ] Create startup as founder
- [ ] Send investor request
- [ ] Investor accepts request → IN_DISCUSSION
- [ ] Both send messages (establish discussion)
- [ ] Founder accepts deal (modal shows)
- [ ] Enter investment amount & details
- [ ] Confirm → Investment created
- [ ] Portfolio updates:
  - [ ] Total Invested shows amount
  - [ ] Active Investments increments
  - [ ] Founder Metrics show new investor onboarded
- [ ] Investor rates founder
- [ ] Rating appears in Founder Rating Avg
- [ ] Investor adds private notes
- [ ] Notes save/delete properly

---

## Important Rules Enforced

✅ **Investment Creation:**
- Only triggered by deal acceptance
- Cannot be manually edited in UI
- All fields from modal captured

✅ **Founder Ratings:**
- Only investors can rate founders
- Only if investment exists
- Must participate in discussion first
- Score validated 1-5

✅ **Metrics:**
- All server-calculated
- Cached with `revalidatePath`
- No manual data entry

✅ **Private Notes:**
- Investor-only
- Per-startup basis
- Auto-saved on confirm
- Deletable with confirmation

---

## Future Enhancements

- [ ] Investor responsiveness metric (time between messages)
- [ ] Deal performance tracking (valuation changes)
- [ ] Portfolio charts/visualizations
- [ ] Export portfolio reports
- [ ] Investor network metrics
- [ ] Founder rating based on multiple categories
