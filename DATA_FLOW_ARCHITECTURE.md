# Data Flow & Architecture Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     INVESTOR PORTFOLIO PAGE                      │
│              app/(root)/user/me/portfolio/page.tsx               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─ calls getInvestorPortfolioStats()
                              ├─ calls getFounderMetrics()
                              ├─ calls getPrivateNotes()
                              └─ calls prisma directly for raw data
                              │
                ┌─────────────┴────────────┬──────────────────┐
                │                          │                  │
        ┌───────▼────────┐      ┌──────────▼──────┐  ┌────────▼──────┐
        │ app/actions/   │      │ Prisma Queries  │  │ Sanity Client │
        │ portfolio.ts   │      │  (DB)           │  │  (Startup     │
        │                │      │                 │  │   data)       │
        │ • getInvestor  │      │ • Investment    │  └────────────────┘
        │   PortfolioSts │      │ • Rating        │
        │ • getFounder   │      │ • Private Note  │
        │   Metrics      │      │ • Relationship  │
        │ • getPrivate   │      │ • Update        │
        │   Notes        │      └─────────────────┘
        └────────────────┘
             │
             ├─ Returns calculated stats
             ├─ Returns metrics
             └─ Returns notes
```

---

## Deal Acceptance Flow

```
STEP 1: Investment Request
┌─────────────────────────────────┐
│ Investor sends request to founder │ → StartupRelationship created
│                                   │   status = "PENDING"
└─────────────────────────────────┘
         │
         │ (investor + founder communicate)
         ▼
STEP 2: Start Discussion
┌─────────────────────────────────┐
│ Founder accepts request          │ → status = "IN_DISCUSSION"
│ (acceptRequest action)           │   messages now allowed
└─────────────────────────────────┘
         │
         │ (at least 1 message from each user)
         ▼
STEP 3: Accept Deal
┌─────────────────────────────────┐
│ Founder clicks "Accept Deal"     │
│ Modal appears asking for:        │
│  • Amount (required)             │
│  • Equity % (optional)           │
│  • Deal Stage (required)         │
│  • Investment Type (required)    │
│                                  │
│ Calls: acceptDeal(relationshipId,│
│        amount, equity, stage,    │
│        investmentType)           │
└─────────────────────────────────┘
         │
         ▼
STEP 4: Backend Processing
┌─────────────────────────────────┐
│ 1. Update StartupRelationship    │
│    status → "DEAL_ACCEPTED"      │
│                                  │
│ 2. Create Investment record:     │
│    {                             │
│      investorId: <user_id>      │
│      startupId: <startup_id>    │
│      amount: <number>           │
│      equity: <number|null>      │
│      dealStage: <enum>          │
│      investmentType: <enum>     │
│      createdAt: now()           │
│    }                             │
│                                  │
│ 3. Revalidate Portfolio Page    │
│    (clear cache)                │
└─────────────────────────────────┘
         │
         ▼
STEP 5: Portfolio Updates
┌─────────────────────────────────┐
│ INVESTOR SEES:                   │
│ ✓ Total Invested increases       │
│ ✓ Active Investments increment   │
│ ✓ Deal shows in "My Investments" │
│ ✓ "Rate Founder" button appears  │
│                                  │
│ FOUNDER SEES:                    │
│ ✓ Investors Onboarded increment  │
│ ✓ Deal Conversion Rate updates   │
│ ✓ Status changes to DEAL_ACCEPTED│
└─────────────────────────────────┘
```

---

## Rating Submission Flow

```
PRECONDITIONS:
  ✅ Deal is DEAL_ACCEPTED
  ✅ Investment record exists
  ✅ User sent ≥1 message in discussion
  ✅ User is the investor (not founder)

        │
        ▼
┌─────────────────────────────────┐
│ Investor clicks "Rate Founder"   │
│ Modal appears with fields:       │
│  • Communication (1-5)           │
│  • Transparency (1-5)            │
│  • Execution (1-5)               │
│  • Feedback (optional text)      │
│                                  │
│ Calculates: score = average(3)   │
│ Validation: 1 ≤ score ≤ 5       │
│                                  │
│ Calls: submitRating(             │
│   founderId,                     │
│   "FOUNDER",                     │
│   startupId,                     │
│   avgScore,                      │
│   feedback                       │
│ )                                │
└─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ VALIDATION CHECKS:               │
│                                  │
│ 1. Is rater an investor?         │
│    relationship.investorId === userId
│                                  │
│ 2. Is relationship DEAL_ACCEPTED?│
│    relationship.status === "DEAL_ACCEPTED"
│                                  │
│ 3. Does Investment record exist? │
│    Investment where {            │
│      investorId = userId,        │
│      startupId = startupId       │
│    }                             │
│                                  │
│ 4. Did rater participate?        │
│    Message where {               │
│      relationshipId = relId,     │
│      senderId = userId           │
│    } EXISTS                      │
└──────────────────────────────────┘
         │
    ┌────┴────┐
    │          │
    ▼          ▼
 PASS       FAIL
   │          │
   │          └─► Throw Error
   │             (e.g., "Only investors who invested can rate")
   │
   ▼
┌─────────────────────────────────┐
│ UPSERT Rating record:           │
│  {                              │
│    raterId: <investor_id>      │
│    ratedUserId: <founder_id>   │
│    ratedRole: "FOUNDER"        │
│    startupId: <startup_id>     │
│    score: <1-5>                │
│    feedback: <text>            │
│    createdAt: now()            │
│  }                              │
│                                 │
│ Revalidate Portfolio Page       │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ INVESTOR PORTFOLIO UPDATES:     │
│                                  │
│ • "Rate Founder" button → "Rated"│
│ • Founder Rating Avg recalc     │
│   = AVG(all investor ratings)   │
│ • Cards refresh with new avg    │
└─────────────────────────────────┘
```

---

## Metric Calculation Details

### Total Invested (Investor View)

```
Query:
  Investment.findMany({
    where: { investorId: currentUser },
    select: { amount }
  })

Calculation:
  totalInvested = investments.reduce(
    (sum, inv) => sum + inv.amount
  )

Display: Formatted as currency
  e.g., "$50,000" or "$0"
```

### Active Investments

```
Query:
  StartupRelationship.findMany({
    where: { 
      investorId: currentUser,
      status: "DEAL_ACCEPTED"
    }
  })

Calculation:
  activeInvestments = relationships.length

Display: Integer count
  e.g., "3 active, 1 closed"
```

### Founder Rating Average

```
Query:
  Rating.findMany({
    where: { 
      raterId: currentUser,
      ratedRole: "FOUNDER"
    },
    select: { score }
  })

Calculation:
  IF scores.length > 0:
    avgRating = sum(scores) / scores.length
  ELSE:
    avgRating = null

Display: 
  IF avgRating:
    avgRating.toFixed(1)  → "4.3"
  ELSE:
    "N/A"
```

### Investors Onboarded (Founder View)

```
Query:
  StartupRelationship.findMany({
    where: { 
      founderId: currentUser,
      status: "DEAL_ACCEPTED"
    },
    select: { investorId }
  })

Calculation:
  investorIds = relationships.map(r => r.investorId)
  onboarded = new Set(investorIds).size  // Unique count

Display: Integer
  e.g., "5" = 5 unique investors
```

### Deal Conversion Rate (Founder View)

```
Query:
  StartupRelationship.findMany({
    where: { founderId: currentUser }
  })

Calculation:
  total = allRelationships.length
  accepted = relationships.filter(
    r => r.status === "DEAL_ACCEPTED"
  ).length
  
  rate = IF total > 0:
    Math.round((accepted / total) * 100)
  ELSE:
    0

Display: Percentage
  e.g., "66%" = 2 of 3 requests converted
```

### Update Frequency (Founder View)

```
Query:
  StartupUpdate.findMany({
    where: { authorId: currentUser },
    orderBy: { createdAt: "desc" }
  })

Calculation:
  last90Days = updates.filter(
    u => (now - u.createdAt) <= 90 days
  )
  
  frequency = last90Days.length / 3  // months
  
  IF frequency > 0:
    status = "${frequency.toFixed(1)} updates / month"
  ELSE IF (now - lastUpdate) > 45 days:
    status = "Inactive (no updates in X days)"
  ELSE:
    status = "No updates yet"

Display: Human-readable string
  e.g., "2.5 updates / month"
```

---

## Private Notes Flow

```
STEP 1: Load Notes
┌─────────────────────────────────┐
│ Portfolio page loads            │
│ Calls: getPrivateNotes()        │
│        (fetches all notes)      │
│                                  │
│ Returns: [                       │
│   {                              │
│     id: "note_id",              │
│     investorId: "user_id",      │
│     startupId: "startup_id",    │
│     content: "text...",         │
│     updatedAt: Date             │
│   }                             │
│ ]                                │
│                                  │
│ Maps to: startupId → content    │
└─────────────────────────────────┘

STEP 2: Display Notes
┌─────────────────────────────────┐
│ For each investment:             │
│   PrivateNoteEditor component   │
│   passes:                        │
│     • startupId                 │
│     • startupTitle              │
│     • initialContent (from map) │
│                                  │
│ Component renders as:           │
│   • Display mode (read-only)    │
│   • Click to edit               │
│   • Inline textarea edit        │
│   • Save/Cancel buttons         │
│   • Delete button (if not empty)│
└─────────────────────────────────┘

STEP 3: Save Note
┌─────────────────────────────────┐
│ User edits text and clicks Save │
│                                  │
│ Calls: savePrivateNote(         │
│   startupId,                    │
│   content                       │
│ )                                │
│                                  │
│ Backend:                        │
│   PrivateNote.upsert({         │
│     where: {                    │
│       investorId: userId,      │
│       startupId: startupId     │
│     },                         │
│     update: {                  │
│       content: newText,        │
│       updatedAt: now()         │
│     },                         │
│     create: {                  │
│       investorId: userId,      │
│       startupId: startupId,    │
│       content: newText         │
│     }                          │
│   })                           │
└─────────────────────────────────┘
   │
   └─► Revalidate Portfolio Page
       Component goes back to display mode

STEP 4: Delete Note
┌─────────────────────────────────┐
│ User clicks delete icon         │
│ Confirm dialog shows            │
│                                  │
│ Calls: deletePrivateNote(       │
│   startupId                     │
│ )                                │
│                                  │
│ Backend:                        │
│   PrivateNote.delete({         │
│     where: {                    │
│       investorId: userId,      │
│       startupId: startupId     │
│     }                          │
│   })                           │
└─────────────────────────────────┘
   │
   └─► Revalidate Portfolio Page
       Component clears content and returns to display mode
```

---

## Component Interactions

```
┌─────────────────────────────────────────────────────────────┐
│           InvestorPortfolioPage (SERVER)                    │
│                                                             │
│ Fetches all data and passes as props to client components  │
└─────────────────────────────────────────────────────────────┘
   │
   ├─ Stats Cards (static display)
   │
   └─ Tabs
      │
      ├─ My Investments
      │  ├─ OpenChatButton (client)
      │  ├─ RateFounderButton (client)
      │  │  └─ Calls: submitRating()
      │  └─ Modal for rating UI
      │
      ├─ Updates Feed (static display)
      │
      ├─ Performance (static/placeholder)
      │
      ├─ Founder Metrics (static display)
      │
      └─ Private Notes
         └─ PrivateNoteEditor (client component)
            ├─ Displays note
            ├─ Edit mode textarea
            ├─ Save button → savePrivateNote()
            └─ Delete button → deletePrivateNote()

```

---

## Data Consistency & Cache Invalidation

```
When does Portfolio Page Revalidate?

1. Deal Acceptance
   ├─ acceptDeal() in dealRoom.ts
   ├─ Creates Investment record
   └─ revalidatePath("/user/me/portfolio")

2. Rating Submission
   ├─ submitRating() in dealRoom.ts
   ├─ Creates/updates Rating record
   └─ revalidatePath("/user/me/portfolio")

3. Note Save/Delete
   ├─ savePrivateNote() in portfolio.ts
   ├─ Creates/updates PrivateNote record
   └─ revalidatePath("/user/me/portfolio")
   
   ├─ deletePrivateNote() in portfolio.ts
   ├─ Deletes PrivateNote record
   └─ revalidatePath("/user/me/portfolio")

All actions use revalidatePath to ensure
next page load shows fresh data from database.
```

---

## Error Handling

```
Rating Submission Errors:

❌ "Only investors can rate founders"
   └─ relationship.investorId !== userId

❌ "No accepted deal relationship found"
   └─ Relationship status !== DEAL_ACCEPTED

❌ "You can only rate founders you've invested in"
   └─ No Investment record for investor/startup

❌ "Please participate in the discussion before rating"
   └─ senderId !== userId in any Message

❌ "Rating must be between 1 and 5"
   └─ score < 1 OR score > 5

Private Note Errors:

❌ "Note content cannot be empty"
   └─ content.trim().length === 0

Deal Acceptance Errors:

❌ "Investment amount is required"
   └─ amount <= 0 OR not provided

❌ "Equity must be between 0 and 100"
   └─ equity < 0 OR equity > 100 (if provided)
```

---

## Summary: What Happens When...

| Action | Trigger | Creates | Updates | Refs | UI Change |
|--------|---------|---------|---------|------|-----------|
| **Accept Deal** | Founder clicks confirm | Investment | StartupRelationship | Deal Accepted | Portfolio refreshes |
| **Submit Rating** | Investor submits form | Rating | (none) | Investment verified | "Rated" button, metrics update |
| **Save Note** | Click "Save Note" | or update PrivateNote | (none) | (none) | Returns to display mode |
| **Delete Note** | Click trash + confirm | (delete) PrivateNote | (none) | (none) | Clears content |

