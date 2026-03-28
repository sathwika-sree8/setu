// Chat-related TypeScript types

// Relationship status enum matching Prisma schema
export type RelationshipStatus = "requested" | "chatting" | "accepted" | "rejected";

export interface ChatRelationship {
  id: string;
  startupId: string;
  founderId: string;
  investorId: string;
  status: RelationshipStatus;
  createdAt: Date;
  startup?: {
    id: string;
    title: string;
    slug?: { current: string };
  };
  founder?: {
    _id: string;
    clerkId: string;
    name: string;
    username?: string;
    email?: string;
    image?: string;
    bio?: string;
  };
  investor?: {
    _id: string;
    clerkId: string;
    name: string;
    username?: string;
    email?: string;
    image?: string;
    bio?: string;
  };
  lastMessage?: Message | null;
  unreadCount?: number;
}

export interface Message {
  id: string;
  relationshipId: string;
  senderId: string;
  content: string;
  read?: boolean;
  createdAt: Date;
}

export interface ChatWithMessages extends ChatRelationship {
  messages: Message[];
}

export interface SendMessageInput {
  relationshipId: string;
  content: string;
}

export interface ChatListItem {
  id: string;
  relationshipId: string;
  participantId?: string;
  participantName: string;
  participantImage?: string;
  startupName: string;
  startupSlug?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: number;
  isOnline?: boolean;
}

export interface FloatingChatState {
  isOpen: boolean;
  position: {
    x: number;
    y: number;
  };
  activeChatId: string | null;
}

export interface ChatEvent {
  type: "NEW_MESSAGE" | "MESSAGE_READ" | "USER_ONLINE" | "USER_OFFLINE";
  data: {
    relationshipId?: string;
    message?: Message;
    userId?: string;
  };
}

// API Response types
export interface ChatApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GetChatsResponse {
  chats: ChatListItem[];
  totalUnread: number;
}

export interface GetMessagesResponse {
  messages: Message[];
  relationship: Pick<ChatRelationship, "id" | "startupId" | "founderId" | "investorId" | "status">;
}

export interface RealtimeRelationship {
  id: string;
  founderId: string;
  investorId: string;
}

export interface RealtimeSessionResponse {
  token: string;
  userId: string;
  expiresAt: number;
  relationships: RealtimeRelationship[];
  socketUrl: string | null;
  supabaseRealtimeEnabled: boolean;
}

// Validation types
export interface SendMessageValidation {
  relationshipId: string;
  content: string;
}

