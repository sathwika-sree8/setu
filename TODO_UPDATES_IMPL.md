# Startup Updates Visibility Implementation

## Data Model Changes
- [x] 1. Add `UpdateVisibility` enum to Prisma schema
- [x] 2. Add `visibility` field to `StartupUpdate` model
- [ ] 3. Run Prisma migration (`npx prisma migrate dev`)

## Backend Actions (`app/actions/founderFeed.ts`)
- [x] 4. Add `createStartupUpdate` action with visibility parameter
- [x] 5. Add `getStartupUpdates` action with visibility filtering
- [x] 6. Add `getInvestorPortfolioUpdates` for investor portfolio updates

## Frontend Components
- [x] 7. Update `CreateFounderPost` with visibility selector and update type
- [x] 8. Create `StartupUpdatesFeed` component with visibility badges
- [x] 9. Update `StartupDetailsPage` to show updates based on permissions

## Investor Portfolio
- [x] 10. Update Updates Feed tab to show all updates from invested startups with visibility badges

## Next Steps
1. Run `npx prisma migrate dev` to apply database changes
2. Restart the development server
3. Test the new visibility features

