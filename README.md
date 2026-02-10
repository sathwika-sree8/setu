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
- Real-time chat between investors and founders
- Chat bubbles with read status
- Floating chat widget for easy access
- Message history per relationship

### 6. **Startup Updates Feed**
- Founders post updates (Revenue, Fundraising, Product, Hiring, Risks, General)
- Visibility controls (Public / Investors Only)
- Like and comment system with sentiment analysis
- Founder posts and global posts

### 7. **AI-Powered Assistant**
- **Intent Detection**: Identifies query types (investments, revenue, updates, startup info)
- **Context-Aware Responses**: Uses embeddings for semantic search
- **Groq LLM Integration**: Llama 3.1 8B for fast responses
- **Floating AI Bot**: Always accessible chat assistant
- **Freshness Detection**: Warns about stale data

### 8. **User Roles & Authentication**
- **Clerk Authentication**: GitHub OAuth
- **Role System**: INVESTOR / FOUNDER
- **User Profiles**: With startup associations

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **Authentication** | Clerk |
| **CMS** | Sanity v4 |
| **AI/LLM** | Groq (Llama 3.1) + OpenAI Embeddings |
| **Styling** | Tailwind CSS + Radix UI |
| **Monitoring** | Sentry |
| **Deployment** | Vercel-ready |

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
npm install

# Start development server
npm run dev

# Start Sanity Studio (separate terminal)
npm run sanity
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

