# TODO: Ensure Clerk users exist in Prisma database

## Task
Add Prisma upsert to ensure every Clerk user automatically exists in the User table when they log in.

## Steps
- [ ] 1. Modify app/api/sync-author/route.ts to add Prisma user upsert
- [ ] 2. Test the implementation

## Implementation Details
Update the existing /api/sync-author route to include Prisma user upsert alongside Sanity sync:
- Import prisma from lib/prisma
- Add prisma.user.upsert after auth check
- This ensures users are created in PostgreSQL when they first sign in

