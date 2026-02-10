# TODO: Investor-Founder Platform Redesign

## Phase 1: Database Schema Updates
- [x] 1.1 Update RelationshipStatus enum with new states (PENDING, IN_DISCUSSION, DEAL_ACCEPTED, DEAL_REJECTED, CLOSED)
- [x] 1.2 Add Investment model with amount, equity, round info
- [x] 1.3 Add Rating model for founder/investor ratings
- [x] 1.4 Add PrivateNote model for investor notes
- [ ] 1.5 Create new Prisma migration

## Phase 2: Server Actions & API Updates
- [x] 2.1 Update dealRoom.ts with new state machine actions
- [x] 2.2 Update chat.ts to allow messages in IN_DISCUSSION and DEAL_ACCEPTED states
- [x] 2.3 Create getAllRequests() action for unified tabs
- [ ] 2.4 Create submitRating() action
- [ ] 2.5 Create private note actions

## Phase 3: Request Tab Redesign
- [x] 3.1 Create RequestCard component with context-aware actions
- [x] 3.2 Create RequestsTabs component with Received/Sent/Archived tabs
- [x] 3.3 Update /user/me/requests page to use new components
- [x] 3.4 Add status badges with color coding

## Phase 4: Chat System Updates
- [x] 4.1 Update ChatPanel to work with new status flow
- [x] 4.2 Add chat access for IN_DISCUSSION and DEAL_ACCEPTED states
- [x] 4.3 Update ChatRoom to work with new status flow

## Phase 5: Investor Profile Tab
- [x] 5.1 Create /user/me/portfolio page with:
  - [x] 5.2 Portfolio Overview component (stats cards)
  - [x] 5.3 My Investments component with investment cards
  - [x] 5.4 Updates Feed placeholder
  - [x] 5.5 Performance Analytics placeholder
  - [x] 5.6 Founder Performance metrics
  - [x] 5.7 Private Notes component

## Phase 6: Rating & Reputation System
- [ ] 6.1 Create RatingModal component
- [ ] 6.2 Add rating submission after DEAL_ACCEPTED
- [ ] 6.3 Display ratings in investor profile

## Phase 7: Integration
- [x] 7.1 Add Badge component
- [x] 7.2 Add Card component
- [x] 7.3 Add Tabs component
- [x] 7.4 Add Skeleton component
- [ ] 7.5 Update Navbar with Portfolio link
- [ ] 7.6 Test complete request lifecycle

