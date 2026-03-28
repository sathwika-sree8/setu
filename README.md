# SETU - Startup Investment Platform

A comprehensive startup investment platform that connects founders with investors, facilitating the entire investment deal lifecycle from initial contact to deal closure.

## Features

### 1. **Startup Discovery & Management**
- Browse and search startups by category/sector
- Startup profiles with descriptions, logos, and websites
- Sanity CMS integration for content management
- Real-time data with Sanity Live

### 2. **Investment Deal Flow**
- **Request System**: Investors send connection requests to founders
- **Deal Rooms**: Private chat spaces for investor-founder discussions
- **Deal Acceptance**: Founders accept deals with investment terms (amount, equity %, deal stage, investment type)
- **Investment Tracking**: Records investments with full details (SAFE, Convertible Note, Equity, Direct Investment)

### 3. **Portfolio Management (Investors)**
- View total invested amount
- Track active investments count
- Private notes per startup (investor-only)
- Rate founders (Communication, Transparency, Execution)
- View founder ratings and metrics

### 4. **Founder Metrics**
- Investors onboarded count
- Deal conversion rate percentage
- Update frequency tracking
- Performance analytics

### 5. **Communication System**
- Real-time chat between investors and founders in deal rooms
- Chat bubbles with read status
- Message history per relationship

### 6. **Startup Updates Feed**
- Founders post updates (Revenue, Fundraising, Product, Hiring, Risks, General)
- Visibility controls (Public / Investors Only)
- Like and comment system with sentiment analysis
- Founder posts and global posts

### 7. **AI-Powered Assistant** (Backend Integration)
- **Intent Detection**: Identifies query types (investments, revenue, updates, startup info)
- **Context-Aware Responses**: Uses embeddings for semantic search
- **Groq LLM Integration**: Llama 3.1 8B for fast responses
- **Freshness Detection**: Warns about stale data

### 8. **User Roles & Authentication**
- **Clerk Authentication**: GitHub OAuth
- **Role System**: INVESTOR / FOUNDER
- **User Profiles**: With startup associations

## Tech Stack

### **Frontend & Framework**

#### **Next.js 16 (App Router)**
- **Why**: 
  - Built-in React 19.2.3 support for latest features
  - App Router provides better code organization and performance via automatic code splitting
  - Server Components reduce client-side JavaScript, improving performance
  - Built-in API routes eliminate need for separate backend server
  - Incremental Static Regeneration (ISR) for dynamic startup data
  - Automatic image optimization for startup logos and media
  - Native support for Edge Functions via Sentry monitoring
- **Benefits**: Single codebase for frontend and backend, fast development, excellent SEO, automatic bundle optimization
- **Trade-offs**: Learning curve for App Router paradigm vs Pages Router

#### **TypeScript**
- **Why**:
  - Full type safety for a complex system with multiple user roles and data relationships
  - Prevents runtime errors in deal flow and payment logic
  - Better IDE autocomplete for developer experience
  - Easier refactoring with confidence across the large codebase
  - Clear contracts for API boundaries and component props
- **Benefits**: Maintainability, early error detection, self-documenting code
- **Trade-offs**: Slightly longer development time upfront

---

### **Styling & UI Components**

#### **Tailwind CSS + Radix UI**
- **Why**:
  - Tailwind: Utility-first CSS for rapid, consistent styling without writing custom CSS
  - Radix UI: Unstyled, accessible component primitives that work perfectly with Tailwind
  - Perfect combination: Radix provides accessibility foundations, Tailwind handles styling
- **Benefits**: 
  - No CSS-in-JS overhead (unlike styled-components)
  - Highly customizable with `tailwind.config.ts`
  - Built-in dark mode support for better UX
  - Excellent accessibility (keyboard navigation, screen readers)
  - Small bundle size
- **Alternatives considered**: Material-UI (too opinionated), shadcn (limited customization)

#### **Framer Motion**
- **Used for**: Smooth animations and page transitions
- **Why**: Lightweight, declarative animation library with excellent React integration

---

### **Database & ORM**

#### **PostgreSQL**
- **Why**:
  - ACID compliance for financial and deal data consistency
  - Complex relationships between Users, Startups, Investments, Ratings, etc.
  - Strong support for JSON fields (startup metadata)
  - Excellent for full-text search (startup discovery)
  - Production-proven for fintech applications
- **Benefits**: Reliability, scalability, rich query capabilities, PostGIS for potential future location features
- **Trade-offs**: More complex setup than NoSQL, requires schema planning

#### **Prisma ORM v6.19.1**
- **Why**:
  - Type-safe database access with auto-generated TypeScript types
  - Eliminates SQL injection vulnerabilities
  - Auto-generates database migrations
  - Prisma Studio for visual data inspection
  - Excellent relationship handling (users → startups → investments)
- **Benefits**: 
  - Seamless integration with TypeScript
  - Clear, readable query syntax
  - Built-in support for pagination and filtering
  - Easy relationship traversal
- **Trade-offs**: Slower raw queries than hand-crafted SQL (negligible for this scale)

---

### **Authentication & Authorization**

#### **Clerk v6.37.1**
- **Why**:
  - Pre-built OAuth integration (GitHub) - no custom auth logic needed
  - Manages user sessions securely out-of-the-box
  - Built-in multi-organization support for future B2B features
  - Webhooks for syncing user data to PostgreSQL
  - No password management complexity (OAuth-based)
  - Mobile-ready authentication
- **Benefits**:
  - Reduces security vulnerabilities
  - Faster time to market
  - Professional-grade session management
  - Audit logs for compliance
- **Trade-offs**: Monthly cost at scale, vendor lock-in

---

### **Content Management System (CMS)**

#### **Sanity v4**
- **Why**:
  - Headless CMS - decoupled from frontend (Next.js works independently)
  - Real-time collaborative editing for team content management
  - Portable Text (Rich Text) support for startup descriptions
  - Excellent TypeScript support with auto-generated types
  - "Sanity Live" for real-time content updates without page refresh
  - Image CDN with automatic optimization
  - GROQ query language - simpler than GraphQL for this use case
- **Benefits**:
  - Content creators don't need to deploy code
  - Can update startup information live
  - Webhook support for syncing to PostgreSQL
  - Scalable image hosting
- **Trade-offs**: Another service to manage, learning curve for GROQ

#### **next-sanity v11.6.12**
- **Why**: Official integration library ensuring compatibility between Next.js and Sanity
- **Features**: Image optimization, Live Preview, client utilities

---

### **AI & LLM Integration**

#### **Groq (Llama 3.1 8B)**
- **Why**:
  - **Speed**: Groq's LPUs provide 10x faster inference than GPU alternatives
  - **Cost**: Much cheaper than GPT-4 for high-volume queries
  - **Privacy**: Queries processed on Groq's infrastructure (not OpenAI)
  - **Model**: Llama 3.1 8B is open-source, capable for semantic understanding
  - Ideal for real-time chat (< 100ms latency)
- **Benefits**: 
  - Responsive user experience for AI chat
  - Budget-friendly at scale
  - Intent detection and question routing
- **Trade-offs**: Less capable than GPT-4, slightly lower accuracy

#### **OpenAI Embeddings**
- **Why**:
  - State-of-the-art text embeddings (1536 dimensions)
  - Enables semantic search: "How much money did they raise?" → finds relevant startup updates
  - Powers RAG (Retrieval Augmented Generation) for context-aware responses
  - Better than Groq embeddings for English language
- **Integration**: 
  - Embeddings stored in `AIDocument` table
  - Vector search finds relevant startup data
  - Fed to Groq for context-aware responses

#### **AI Document Storage**
- **Architecture**:
  - `AIDocument` model stores embeddings (1536-dim vectors)
  - `AIChatMemory` stores conversation history for multi-turn context
  - Enables the AI assistant to understand investor-specific data

---

### **Real-Time Communication**

#### **Socket.io v4.8.3**
- **Why**:
  - WebSocket + fallback (HTTP long polling) for instant chat
  - Handles connection drops gracefully
  - Room support for deal-room isolation
  - Built-in event broadcasting
- **Used for**: Deal room chat, real-time message delivery, read status updates
- **Benefits**: Reliable, production-tested, excellent developer experience

---

### **Monitoring & Error Tracking**

#### **Sentry v10.32.1**
- **Why**:
  - Real-time error monitoring and alerting
  - Tracks unhandled exceptions in production
  - Source map support for debugging minified code
  - Session replay for understanding user context when errors occur
  - Integration with CI/CD for release tracking
- **Features**:
  - `@sentry/nextjs` handles both client and server errors
  - `sentry.server.config.ts` for server-side monitoring
  - `sentry.edge.config.ts` for Edge Runtime monitoring
- **Benefits**: Proactive bug detection, faster issue resolution

---

### **Deployment & Hosting**

#### **Vercel**
- **Why**:
  - Built by the Next.js creators - optimized integration
  - Automatic builds and deployments from GitHub
  - Edge Functions support for low-latency APIs
  - Environment variable management
  - Free tier for prototyping
- **Alternative**: AWS, DigitalOcean, Railway (more complex setup)

#### **Custom Server (Node.js)**
- **Why**: `server.js` wrapper allows custom middleware (WebSocket integration, rate limiting)
- **Benefits**: More control than standard Vercel serverless

---

### **Utilities & Libraries**

#### **Date Handling**
- **date-fns v4.1.0**: Time zone aware date formatting, deal timeline calculations

#### **Markdown Editor**
- **@uiw/react-md-editor v4.0.11**: Rich text editing for founder update posts
- **easymde v2.20.0**: Alternative markdown editor

#### **Styling Utilities**
- **clsx v2.1.1**: Conditional className composition
- **tailwind-merge v3.4.0**: Prevents Tailwind CSS conflicts when merging classNames

#### **Other Key Libraries**
- **slugify v1.6.6**: URL-safe usernames and startup slugs
- **lucide-react**: Icon library for UI components
- **framer-motion v12.38.0**: Smooth animations and page transitions

---

### **Quality Assurance**

#### **ESLint**
- **Why**: Code quality and consistency checks
- **Config**: `eslint.config.mjs` with modern flat config format

---

## Tech Stack Summary Table

| Layer | Technology | Why Chosen |
|-------|------------|-----------|
| **Runtime** | Node.js 18+ | Industry standard, excellent ecosystem |
| **Framework** | Next.js 16 | Full-stack React, optimal performance, Vercel integration |
| **Language** | TypeScript | Type safety for complex deal logic |
| **Database** | PostgreSQL | ACID compliance, complex relationships |
| **ORM** | Prisma v6 | Type-safe, easy migrations, excellent DX |
| **Authentication** | Clerk | OAuth, session management, webhooks |
| **CMS** | Sanity v4 | Headless, real-time, GROQ queries |
| **UI Framework** | Tailwind + Radix | Utility-first, accessible, lightweight |
| **Animations** | Framer Motion | Smooth, performant user experience |
| **AI** | Groq (Llama 3.1) | Speed, cost-effective, real-time chat |
| **Embeddings** | OpenAI | SOTA embeddings, semantic search |
| **Real-time** | Socket.io | WebSocket, reliable, battle-tested |
| **Monitoring** | Sentry | Error tracking, performance monitoring |
| **Hosting** | Vercel + Node.js | Optimal Next.js deployment |
| **Icon Library** | Lucide React | Modern, performance-optimized icons |

## Database Schema

### Core Models
- **User** - Investors and founders with roles
- **Startup** - Startup profiles and data
- **FounderPost** - Posts from founders about startups
- **Like / Comment** - Social engagement with sentiment analysis
- **StartupRelationship** - Connection between investors and startups
- **Message** - Chat messages within relationships
- **Investment** - Investment records with terms
- **Rating** - Founder ratings by investors
- **PrivateNote** - Investor-private notes per startup
- **StartupUpdate** - Updates with visibility controls
- **AIDocument** - Vector embeddings for AI context (1536 dimensions)
- **AIChatMemory** - Chat history for AI context
- **Notification** - User notifications

### Deal Stages
- PRE_SEED → SEED → SERIES_A → SERIES_B → SERIES_C → LATE → IPO

### Investment Types
- SAFE, Convertible Note, Equity, Direct Investment

### Update Types
- REVENUE, FUNDRAISING, PRODUCT, HIRING, RISKS, GENERAL

### Visibility Levels
- PUBLIC, INVESTORS_ONLY

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── (root)/            # Main routes
│   ├── api/               # API routes
│   │   ├── ai/            # AI endpoints
│   │   ├── chat/          # Chat endpoints
│   │   └── sync-author/   # Sanity sync
│   ├── actions/           # Server actions
│   │   ├── ai/            # AI actions
│   │   ├── chat.ts
│   │   ├── dealRoom.ts
│   │   ├── portfolio.ts
│   │   ├── requests.ts
│   │   └── relationships.ts
│   ├── deal-room/         # Deal rooms
│   ├── founder/           # Founder pages
│   ├── investor/          # Investor pages
│   └── notifications/     # Notifications
├── components/            # React components
│   ├── chat/              # Chat components
│   ├── portfolio/         # Portfolio components
│   ├── requests/          # Request components
│   └── ui/                # UI primitives
├── lib/                   # Utilities
│   ├── ai/               # AI/LLM utilities
│   │   ├── embeddings.ts
│   │   └── groq.ts
│   └── types/            # TypeScript types
├── prisma/               # Database schema
├── sanity/               # CMS configuration
│   ├── lib/              # Sanity client
│   └── schemaTypes/      # Content schemas
├── hooks/                # Custom React hooks
└── public/               # Static assets
```

## Getting Started

### Prerequisites
- Node.js (version 18 or higher)
- PostgreSQL database
- Clerk account
- Sanity project
- Groq API key

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Start Sanity Studio (separate terminal)
pnpm run sanity
```

### Environment Variables

Create a `.env.local` file with:

```env
# Database
DATABASE_URL="postgresql://..."

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# Sanity CMS
NEXT_PUBLIC_SANITY_PROJECT_ID=...
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_WRITE_TOKEN=...

# AI/LLM
GROQ_API_KEY=...

# Sentry (Optional)
SENTRY_DSN=...

# NextAuth (Legacy)
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

## Key Pages

| Route | Description |
|-------|-------------|
| `/` | Startup directory/feed |
| `/startup/[id]` | Startup detail page |
| `/startup/[id]/feed` | Startup updates feed |
| `/startup/create` | Create new startup |
| `/user/me/portfolio` | Investor portfolio |
| `/user/me/requests` | Manage investment requests |
| `/founder/requests` | Founder request management |
| `/investor/requests` | Investor request management |
| `/deal-room/[relationshipId]` | Private deal room with chat |
| `/notifications` | User notifications |

## API & Server Actions

### Chat API
- `POST /api/chat/send` - Send message
- `GET /api/chat/messages` - Get messages
- `POST /api/chat/read` - Mark messages as read

### AI API
- `POST /api/ai/chat` - AI chat endpoint
- Intent detection for personalized responses
- Context retrieval with vector embeddings

### Portfolio Actions
- `getInvestorPortfolioStats()` - Get portfolio summary
- `getPrivateNotes()` - Get private notes
- `savePrivateNote()` / `deletePrivateNote()` - Manage notes
- `submitRating()` - Rate founders

### Deal Room Actions
- `acceptDeal()` - Accept investment deal
- `submitRating()` - Submit founder rating
- Chat management

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run sanity` | Start Sanity Studio |

## Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment
```bash
npm run build
npm run start
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

## Acknowledgments

- Built with [Next.js](https://nextjs.org)
- Authentication by [Clerk](https://clerk.com)
- CMS powered by [Sanity](https://sanity.io)
- AI/LLM powered by [Groq](https://groq.com)
- UI components from [Radix UI](https://www.radix-ui.com)
- Monitoring by [Sentry](https://sentry.io)

