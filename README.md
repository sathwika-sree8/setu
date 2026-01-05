# Setu

A modern platform for pitching startups, connecting with entrepreneurs, submitting innovative ideas, and voting on pitches. Built with Next.js, Sanity CMS, and NextAuth for seamless user experience.

**Deployed using vercel** : https://setu-five.vercel.app/ 

## Features

- **Pitch Startups**: Submit your startup ideas with detailed descriptions and pitches
- **Browse & Search**: Discover startups by category or search functionality
- **User Authentication**: Secure login via GitHub OAuth
- **CMS Integration**: Powered by Sanity for content management
- **Real-time Updates**: Live data fetching with Sanity Live
- **Responsive Design**: Mobile-first design using Tailwind CSS
- **Markdown Support**: Rich text editing for pitches and descriptions
- **User Profiles**: View author profiles and their startups
- **Voting System**: Engage with community by voting on pitches

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **CMS**: Sanity v4
- **Authentication**: NextAuth.js with GitHub provider
- **Database**: Sanity's hosted database
- **Deployment**: Vercel-ready
- **Monitoring**: Sentry integration
- **Fonts**: Custom Work Sans font family

## Prerequisites

Before running this project, make sure you have the following installed:

- Node.js (version 18 or higher)
- npm or yarn package manager
- A Sanity account and project
- A GitHub OAuth app for authentication

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd yc_directory
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory and add the following variables:

   ```env
   # Sanity Configuration
   NEXT_PUBLIC_SANITY_PROJECT_ID=your_sanity_project_id
   NEXT_PUBLIC_SANITY_DATASET=production
   NEXT_PUBLIC_SANITY_API_VERSION=2025-12-31
   SANITY_WRITE_TOKEN=your_sanity_write_token

   # NextAuth Configuration
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000

   # GitHub OAuth
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   ```

4. **Set up Sanity**

   - Create a new Sanity project at [sanity.io](https://sanity.io)
   - Configure your dataset and get your project ID
   - Generate a write token with appropriate permissions

5. **Set up GitHub OAuth**

   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Create a new OAuth app
   - Set Authorization callback URL to `http://localhost:3000/api/auth/callback/github`

## Running the Application

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Open Sanity Studio** (in a separate terminal)
   ```bash
   npm run sanity
   ```

3. **Access the application**
   - Main app: [http://localhost:3000](http://localhost:3000)
   - Sanity Studio: [http://localhost:3000/studio](http://localhost:3000/studio)

## Project Structure

```
yc_directory/
├── app/                    # Next.js app directory
│   ├── (root)/            # Main application routes
│   ├── api/               # API routes
│   └── studio/            # Sanity Studio route
├── components/            # Reusable React components
├── lib/                   # Utility functions and configurations
├── sanity/                # Sanity CMS configuration
│   ├── lib/              # Sanity client and queries
│   └── schemaTypes/      # Content schemas
├── public/                # Static assets
└── hooks/                 # Custom React hooks
```

## Key Components

- **StartupCard**: Displays individual startup information
- **StartupForm**: Form for creating/editing startups
- **SearchForm**: Search functionality across startups
- **Navbar**: Main navigation component
- **UserStartups**: Displays user's submitted startups

## Sanity Schemas

The project uses the following Sanity document types:

- **Startup**: Main content type for startup pitches
- **Author**: User profiles linked to GitHub accounts
- **Playlist**: (Future feature for organizing startups)

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run sanity` - Start Sanity Studio

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start
   ```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Your Sanity project ID | Yes |
| `NEXT_PUBLIC_SANITY_DATASET` | Sanity dataset name | Yes |
| `SANITY_WRITE_TOKEN` | Sanity write token | Yes |
| `NEXTAUTH_SECRET` | NextAuth secret key | Yes |
| `NEXTAUTH_URL` | Base URL for NextAuth | Yes |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | Yes |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | Yes |



## Acknowledgments

- Built with [Next.js](https://nextjs.org)
- CMS powered by [Sanity](https://sanity.io)
- Authentication by [NextAuth.js](https://next-auth.js.org)
- UI components from [Radix UI](https://www.radix-ui.com)
