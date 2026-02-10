# Implementation Verification & Testing Guide

## Quick Start Verification

### 1. Installation Check
```bash
# No new dependencies needed - everything uses existing setup
# Just verify imports work correctly
```

### 2. Database Check
```
Run: npx prisma db push
All models should already exist:
- Investment ✅
- Rating ✅
- PrivateNote ✅
- StartupRelationship ✅
- StartupUpdate ✅
```

### 3. File Verification
```
✅ app/actions/portfolio.ts - NEW (core logic)
✅ components/portfolio/PrivateNoteEditor.tsx - NEW (UI component)
✅ app/actions/dealRoom.ts - UPDATED (rating validation)
✅ app/(root)/user/me/portfolio/page.tsx - UPDATED (complete rewrite)
✅ components/requests/AcceptDealModal.tsx - UNCHANGED (already correct)
✅ components/portfolio/RateFounderButton.tsx - UNCHANGED (already correct)
```

---

## Testing Scenarios

### Scenario 1: New Investor Makes Investment

**Steps:**
1. Create 2 users: Founder (F) and Investor (I)
2. I sends investment request to F's startup
3. F accepts request → status = IN_DISCUSSION
4. Both send messages (20+ chars each)
5. F clicks "Accept Deal"
6. F enters: amount=$50,000, equity=5%, stage=SEED, type=EQUITY
7. Confirm → relationship status = DEAL_ACCEPTED

**Expected Results:**
- Investment record created with $50,000
- Investor portfolio shows:
  - Total Invested: $50,000
  - Active Investments: 1
  - Founder Metrics → Investors Onboarded: 1
- "Rate Founder" button appears for I

**Verification SQL:**
```sql
SELECT * FROM "Investment" WHERE investorId = '<I_id>' AND startupId = '<startup_id>';
SELECT * FROM "StartupRelationship" WHERE founderId = '<F_id>' AND investorId = '<I_id>';
```

---

### Scenario 2: Investor Rates Founder

**Prerequisites:** Scenario 1 complete

**Steps:**
1. I clicks "Rate Founder" button
2. Sets: Communication=4, Transparency=5, Execution=4
3. Adds feedback: "Great communication"
4. Submits rating

**Expected Results:**
- Rating record created with score=4 (average)
- Portfolio Founder Rating Avg: 4.0
- Button changes to "Rated" (disabled)
- Cannot re-rate (upsert updates if retry)

**Verification SQL:**
```sql
SELECT * FROM "Rating" WHERE raterId = '<I_id>' AND ratedUserId = '<F_id>';
```

---

### Scenario 3: Multiple Investors Rate Same Founder

**Prerequisites:** Same founder with 2+ investors who invested

**Steps:**
1. Investor A: rates founder 5.0
2. Investor B: rates founder 3.0
3. Check Foundation Rating Avg in portfolio

**Expected Results:**
- Founder Rating Avg = (5 + 3) / 2 = 4.0
- Only counts investors who have Investment record

**SQL:**
```sql
SELECT AVG(score) FROM "Rating" 
WHERE ratedUserId = '<F_id>' AND ratedRole = 'FOUNDER';
```

---

### Scenario 4: Private Notes

**Prerequisites:** At least 1 investment exists

**Steps:**
1. Investor goes to Portfolio → Private Notes tab
2. Clicks on investment card
3. Adds text: "Strong product-market fit"
4. Clicks "Save Note"
5. Later: Clicks trash icon → confirms delete

**Expected Results:**
- Note saved to database after confirm
- Reloading page shows note persists
- Delete removes note, shows empty state

**Verification SQL:**
```sql
SELECT * FROM "PrivateNote" WHERE investorId = '<I_id>' AND startupId = '<startup_id>';
```

---

### Scenario 5: Founder Performance Metrics

**Prerequisites:** Founder has:
- 2 investors with DEAL_ACCEPTED
- Posted 5 updates in last 90 days
- Received ratings from those investors

**Expected Portfolio Display:**
- Investors Onboarded: 2
- Avg Investor Rating: (sum of ratings) / investor count
- Update Frequency: ~1.67 updates/month (5 updates / 3 months)
- Deal Conversion Rate: calculations based on total requests

**Verification:**
```sql
-- Investors onboarded
SELECT COUNT(DISTINCT investorId) FROM "StartupRelationship" 
WHERE founderId = '<F_id>' AND status = 'DEAL_ACCEPTED';

-- Update frequency
SELECT COUNT(*) FROM "StartupUpdate" 
WHERE authorId = '<F_id>' AND createdAt >= now() - interval '90 days';

-- Avg investor rating
SELECT AVG(score) FROM "Rating" WHERE ratedUserId = '<F_id>';
```

---

## Common Issues & Solutions

### Issue 1: "No investments yet" but investment record exists
**Cause:** Investment created but relationship not DEAL_ACCEPTED
**Fix:** Check StartupRelationship.status = DEAL_ACCEPTED
**SQL:** `SELECT * FROM "StartupRelationship" WHERE id = '<rel_id>';`

### Issue 2: "Rate Founder" button disabled but deal accepted
**Cause:** Investor hasn't sent message in discussion
**Fix:** Both users must send ≥1 message before rating
**Check:** `SELECT * FROM "Message" WHERE relationshipId = '<rel_id>' AND senderId = '<I_id>';`

### Issue 3: Rating doesn't appear in average
**Cause:** 
  - Investment doesn't exist for investor
  - ratedRole != "FOUNDER"
  - raterId not same as current investor
**Fix:** Re-run submitRating validation

### Issue 4: Private note appears blank after save
**Cause:** Component not revalidating after save
**Fix:** Already handled via revalidatePath in savePrivateNote()

### Issue 5: Portfolio page 404
**Cause:** File not saved or syntax error
**Fix:** Check [app/(root)/user/me/portfolio/page.tsx](app/(root)/user/me/portfolio/page.tsx) exists

---

## Deployment Checklist

- [ ] Deploy [app/actions/portfolio.ts](app/actions/portfolio.ts)
- [ ] Deploy [components/portfolio/PrivateNoteEditor.tsx](components/portfolio/PrivateNoteEditor.tsx)
- [ ] Deploy updated [app/actions/dealRoom.ts](app/actions/dealRoom.ts)
- [ ] Deploy updated [app/(root)/user/me/portfolio/page.tsx](app/(root)/user/me/portfolio/page.tsx)
- [ ] Run `npx prisma db push` (no migrations needed, models exist)
- [ ] Test deal acceptance flow
- [ ] Test rating submission
- [ ] Test private notes CRUD
- [ ] Verify metrics calculate correctly
- [ ] Check revalidatePath working (portfolio refreshing)

---

## Performance Notes

### Query Optimization
- Investment queries use indexes on investorId and startupId ✅
- Rating queries use index on ratedUserId ✅
- Relationships indexed and filtered for status ✅

### Caching Strategy
- `revalidatePath("/user/me/portfolio")` after:
  - Deal acceptance (acceptDeal)
  - Rating submission (submitRating)
  - Note save/delete (savePrivateNote, deletePrivateNote)

### Data Loading
- Server-side queries in portfolio page (no waterfalls)
- Promise.all for parallel data fetching ✅
- Sanity client fetches happen after DB queries

---

## Rollback Plan

If issues occur:

```bash
# Remove new files
rm app/actions/portfolio.ts
rm components/portfolio/PrivateNoteEditor.tsx

# Revert changed files from git
git checkout app/actions/dealRoom.ts
git checkout app/(root)/user/me/portfolio/page.tsx

# Existing data remains intact (no schema changes)
```

The portfolio page will fall back to old logic (static values).

---

## Success Indicators

✅ All metrics update automatically after user actions
✅ No manual data entry in portfolio UI
✅ All values source from database
✅ Deal acceptance → Investment creation (automatic)
✅ Rating submission validates investment exists
✅ Private notes persist and reload
✅ Portfolio refreshes without page reload
✅ Founder metrics calculate server-side
✅ Empty states show for zero investments/ratings
