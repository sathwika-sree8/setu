# Quick Reference: Investor Portfolio System

## Files at a Glance

| File | Type | Purpose | Status |
|------|------|---------|--------|
| [app/actions/portfolio.ts](app/actions/portfolio.ts) | Server Actions | Core portfolio logic, metric calculations, private notes | ✅ NEW |
| [components/portfolio/PrivateNoteEditor.tsx](components/portfolio/PrivateNoteEditor.tsx) | Client Component | UI for editing/deleting private notes | ✅ NEW |
| [app/actions/dealRoom.ts](app/actions/dealRoom.ts) | Server Actions | Deal acceptance, rating submission with validation | ✅ UPDATED |
| [app/(root)/user/me/portfolio/page.tsx](app/(root)/user/me/portfolio/page.tsx) | Page Component | Complete portfolio display with all tabs | ✅ UPDATED |
| [components/requests/AcceptDealModal.tsx](components/requests/AcceptDealModal.tsx) | Modal Component | Investment details input | ✓ Already correct |
| [components/portfolio/RateFounderButton.tsx](components/portfolio/RateFounderButton.tsx) | Client Component | Founder rating UI | ✓ Already correct |

---

## Server Actions Quick Lookup

### From `app/actions/portfolio.ts`

```typescript
// Get investor portfolio stats
await getInvestorPortfolioStats(userId)
// Returns: { totalInvested, activeInvestments, averageFounderRating, ratingsCount, investmentCount }

// Get founder performance metrics
await getFounderMetrics(userId)
// Returns: { investorsOnboarded, avgInvestorRating, updateStatus, dealRate, totalRequests, acceptedDeals }

// Get all private notes
await getPrivateNotes(userId)
// Returns: PrivateNote[]

// Save private note
await savePrivateNote(startupId, content)
// Returns: PrivateNote

// Delete private note
await deletePrivateNote(startupId)
// Returns: void

// Get single private note
await getPrivateNote(startupId)
// Returns: PrivateNote | null
```

### From `app/actions/dealRoom.ts`

```typescript
// Accept deal (triggered when founder confirms investment details)
await acceptDeal(relationshipId, amount, equity?, stage, investmentType)
// Returns: { success: true, message: string }
// Creates: Investment record
// Updates: StartupRelationship.status → "DEAL_ACCEPTED"
// Revalidates: /user/me/portfolio

// Submit rating (triggered when investor rates founder)
await submitRating(ratedUserId, "FOUNDER", startupId, score, feedback?)
// Returns: Rating
// Validates: Investment exists, discussion participated
// Revalidates: /user/me/portfolio
```

---

## Database Schema Quick Reference

```prisma
model Investment {
  investorId:     String      // Who invested
  startupId:      String      // In which startup
  amount:         Float       // Dollar amount
  equity:         Float?      // % ownership (optional)
  dealStage:      DealStage   // PRE_SEED | SEED | SERIES_A...
  investmentType: InvestmentType  // SAFE | CONVERTIBLE_NOTE | EQUITY...
  createdAt:      DateTime    // When deal accepted
}

model Rating {
  raterId:        String      // Investor
  ratedUserId:    String      // Founder
  ratedRole:      String      // "FOUNDER" or "INVESTOR"
  startupId:      String      // Which startup
  score:          Int         // 1-5
  feedback:       String?     // Optional text
  createdAt:      DateTime    // When submitted
}

model PrivateNote {
  investorId:     String      // Who wrote it
  startupId:      String      // About which startup
  content:        String      // The note text
  updatedAt:      DateTime    // Last modified
}
```

---

## Component Props Quick Lookup

### `<RateFounderButton />`
```typescript
<RateFounderButton
  founderId={string}           // Founder's clerk ID
  startupId={string}           // Startup ID
  hasRated={boolean}           // Already rated?
  canRate={boolean}            // Eligible to rate?
/>
```

### `<PrivateNoteEditor />`
```typescript
<PrivateNoteEditor
  startupId={string}           // Which startup
  startupTitle={string}        // For display
  initialContent={string}      // Existing note content (default "")
/>
```

### `<AcceptDealModal />`
```typescript
<AcceptDealModal
  open={boolean}
  relationshipId={string | null}
  onClose={() => void}
  onAccepted={() => void}      // Optional callback
/>
```

---

## Validation Rules

### Can investor rate founder?
```typescript
✓ Investment record exists
✓ StartupRelationship.status === "DEAL_ACCEPTED"
✓ Investor sent ≥1 message in discussion
```

### Can investor accept deal?
```typescript
✓ StartupRelationship.status === "IN_DISCUSSION"
✓ User is the founder
✓ amount > 0 (required)
✓ equity 0-100 or undefined (optional)
```

### Can save private note?
```typescript
✓ content.trim().length > 0
✓ User is investor
```

---

## Calculation Formulas

| Metric | Formula | Source |
|--------|---------|--------|
| **Total Invested** | SUM(Investment.amount) | Investment table |
| **Active Investments** | COUNT(StartupRelationship where status=DEAL_ACCEPTED) | StartupRelationship |
| **Founder Rating** | AVG(Rating.score) | Rating table |
| **Investors Onboarded** | COUNT(DISTINCT Investment.investorId) | Investment table |
| **Update Frequency** | COUNT(StartupUpdate in 90 days) / 3 | StartupUpdate |
| **Deal Rate** | (DEAL_ACCEPTED count / total count) * 100 | StartupRelationship |

---

## Common Code Patterns

### Fetch investor's investments
```typescript
const investments = await prisma.investment.findMany({
  where: { investorId: userId },
  orderBy: { createdAt: "desc" }
});
```

### Fetch accepted relationships
```typescript
const deals = await prisma.startupRelationship.findMany({
  where: { investorId: userId, status: "DEAL_ACCEPTED" }
});
```

### Fetch founder ratings
```typescript
const ratings = await prisma.rating.findMany({
  where: { ratedUserId: founderId, ratedRole: "FOUNDER" }
});
```

### Fetch private notes by startup
```typescript
const note = await prisma.privateNote.findUnique({
  where: { investorId_startupId: { investorId: userId, startupId } }
});
```

### Calculate average rating
```typescript
const avg = ratings.length > 0 
  ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
  : null;
```

---

## Display Formatting

```typescript
// Format currency
formatCurrency(amount) → "$50,000"

// Format date  
formatDate(date) → "Feb 8, 2026"

// Format rating
rating.toFixed(1) → "4.3"

// Format update frequency
`${(count / 3).toFixed(1)} updates / month` → "2.5 updates / month"

// Format percentage
`${rate}%` → "66%"
```

---

## Revalidation Hints

```typescript
// Called after these actions:
revalidatePath("/user/me/portfolio")

// Clears cache for portfolio page
// Next page load fetches fresh data
// User sees updated:
//  - Investments
//  - Ratings
//  - Private notes
//  - All metrics
```

---

## Testing Shortcuts

### Create test scenario
```sql
-- Create investor with investments
INSERT INTO "Investment" 
VALUES (default, '<investor_id>', '<startup_id>', 50000, 5, 'SEED', 'EQUITY', now());

-- Create relationship
INSERT INTO "StartupRelationship"
VALUES (default, '<startup_id>', '<founder_id>', '<investor_id>', 'DEAL_ACCEPTED', now());

-- Add message to show participation
INSERT INTO "Message"
VALUES (default, '<rel_id>', '<investor_id>', 'test message', false, now());

-- Submit rating
INSERT INTO "Rating"
VALUES (default, '<investor_id>', '<founder_id>', 'FOUNDER', '<startup_id>', 5, 'Great!', now());

-- Add private note
INSERT INTO "PrivateNote"
VALUES (default, '<investor_id>', '<startup_id>', 'Strong team', now(), now());
```

### Check portfolio numbers
```sql
-- Total invested
SELECT SUM(amount) FROM "Investment" WHERE investorId = '<user_id>';

-- Active investments
SELECT COUNT(*) FROM "StartupRelationship" 
WHERE investorId = '<user_id>' AND status = 'DEAL_ACCEPTED';

-- Founder ratings given
SELECT AVG(score) FROM "Rating" 
WHERE raterId = '<user_id>' AND ratedRole = 'FOUNDER';

-- Investors onboarded (as founder)
SELECT COUNT(DISTINCT investorId) FROM "StartupRelationship"
WHERE founderId = '<user_id>' AND status = 'DEAL_ACCEPTED';
```

---

## Troubleshooting Checklist

- [ ] `acceptDeal` throws error → Check relationshipId exists + status = IN_DISCUSSION
- [ ] Investment not created → Check acceptDeal() completed without error
- [ ] "Rate Founder" button disabled → Check user sent message + investment exists
- [ ] Rating not appearing → Check getInvestorPortfolioStats() is being called
- [ ] Portfolio page 404 → Check portfolio page component syntax/imports
- [ ] Private notes not saving → Check PrivateNoteEditor component props
- [ ] Metrics always zero → Check database queries - may need sample data
- [ ] Page loads but all metrics empty → Check auth (userId required)

---

## Quick Deploy Checklist

```bash
# 1. Create new files
✓ app/actions/portfolio.ts
✓ components/portfolio/PrivateNoteEditor.tsx

# 2. Update existing files
✓ app/actions/dealRoom.ts
✓ app/(root)/user/me/portfolio/page.tsx

# 3. Database
npx prisma db push  # (no schema changes - models already exist)

# 4. Test
- Accept a deal
- Check Total Invested updates
- Rate founder
- Check rating appears
- Add private note
- Check note saves

# 5. Monitor
- Check portfolio page loads
- Verify stats are dynamic
- Confirm all metrics calculated
```

---

## Key Points to Remember

1. **Source of Truth**: All data comes from DB, never hardcoded
2. **Automatic**: Metrics calculate server-side, no manual input needed
3. **Validated**: Investment required before rating, discussion before rating
4. **Revalidated**: Cache cleared after any mutation for fresh data
5. **Consistent**: Same calculations across all views
6. **User-Safe**: Investors can only rate founders they invested in
7. **Auditable**: All actions logged with timestamps (createdAt)

