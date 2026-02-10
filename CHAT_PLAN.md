# Floating Chat System Implementation Plan

## Overview
Build a persistent, floating, movable chat system for Founders and Investors with full message persistence, unread indicators, and global access across the app.

## Files to Create/Modify

### 1. Database Schema Updates
**File: `prisma/schema.prisma`**
- Add `read` field to Message model
- Add `rejected` status option to StartupRelationship

### 2. Type Definitions
**File: `lib/types/chat.ts`** (NEW)
- Chat interface types
- Message interface types
- Relationship types

### 3. Server Actions
**File: `app/actions/chat.ts`** (UPDATE)
- `getMyChats()` - Fetch all accepted relationships with last message
- `getMessages(relationshipId)` - Get messages for a specific chat
- `markMessagesAsRead(relationshipId)` - Mark messages as read
- `getUnreadCount()` - Get total unread count across all chats

**File: `app/actions/dealRoom.ts`** (UPDATE)
- Add `rejectDealRoomRequest()` action
- Update `acceptDealRoomRequest()` to not redirect but return success

### 4. Hooks
**File: `hooks/useDraggable.ts`** (NEW)
- Draggable functionality for floating icon
- Touch and mouse support
- Snap to edges
- localStorage persistence

**File: `hooks/useChat.ts`** (NEW)
- Chat state management
- Optimistic updates
- Polling for new messages

### 5. Chat Components
**File: `components/chat/ChatList.tsx`** (NEW)
- List of all accepted chats
- Last message preview
- Unread badge count
- Participant name and startup info

**File: `components/chat/ChatBubble.tsx`** (NEW)
- Individual message bubble
- Timestamp display
- Sent/received styling

**File: `components/chat/ChatInput.tsx`** (NEW)
- Text input with send button
- Empty message validation

**File: `components/chat/ChatWindow.tsx`** (UPDATE)
- Active chat view with messages
- Header with back button
- Message list with ChatBubble
- ChatInput at bottom

**File: `components/chat/ChatPanel.tsx`** (UPDATE)
- Chat list view
- Active chat view switching
- Empty state

**File: `components/chat/FloatingChat.tsx`** (UPDATE)
- Draggable message icon
- Unread badge on icon
- Panel toggle
- localStorage persistence

### 6. UI Components
**File: `components/ui/badge.tsx`** (NEW)
- Unread badge component

### 7. Layout Integration
**File: `app/layout.tsx`** (UPDATE)
- Import FloatingChat component

**File: `app/(root)/layout.tsx`** (UPDATE)
- Already imports Navbar, no changes needed

### 8. Update Existing Components
**File: `components/AcceptRequestButton.tsx`** (UPDATE)
- Show notification when chat becomes available
- Optionally open chat panel on accept

**File: `components/FounderRequests.tsx`** (UPDATE)
- Add Reject button option

## Implementation Order

1. **Phase 1: Database & Types**
   - Update Prisma schema
   - Create type definitions

2. **Phase 2: Server Actions**
   - Implement chat actions
   - Update deal room actions

3. **Phase 3: Core Components**
   - Create hooks (useDraggable, useChat)
   - Create ChatBubble, ChatInput, ChatList

4. **Phase 4: Chat Views**
   - Update ChatWindow
   - Update ChatPanel
   - Update FloatingChat

5. **Phase 5: Integration**
   - Add FloatingChat to root layout
   - Update AcceptRequestButton

6. **Phase 6: Testing & Refinement**
   - Test drag functionality
   - Test unread indicators
   - Test chat persistence

## Chat Access Rules (Enforced)
- Chat enabled ONLY when:
  - `StartupRelationship` exists AND
  - `status === "chatting"` (accepted) AND
  - Current user is either `founderId` OR `investorId`
- If status === "rejected", chat is read-only or inaccessible

## UI Requirements
- Instagram-like floating icon (bottom-right)
- Draggable across screen
- Smooth animations
- Mobile friendly
- No full page reloads
- Position persistence in localStorage

## Edge Cases
- User logs out → chat disappears
- Relationship deleted → chat removed
- Same user opens app in two tabs
- Message sent while panel closed
- Network delay on send
- Empty chat state
- First message case

