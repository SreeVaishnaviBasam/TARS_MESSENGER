# TARS Messenger 🚀

TARS Messenger is a modern, premium chat application built with Next.js, Convex, and Clerk. It features AI integration, group messaging, real-time status, and a sleek "Midnight" design.

## Features

- **Real-time Messaging**: Powered by Convex.
- **Authentication**: Secure login via Clerk (Email, Google, etc.).
- **AI Companion**: Integrated TARS AI (OpenAI) for assistance and image generation.
- **Group Chats**: Create and manage group transmissions.
- **Media Support**: Upload images, videos, and files.
- **Notes**: Share short status notes that disappear in 24 hours.
- **Presence**: Real-time online/offline status and typing indicators.

## Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Database & Backend**: Convex
- **Auth**: Clerk
- **AI**: OpenAI API
- **Styling**: Tailwind CSS 4.0
- **Icons**: Lucide React

## Getting Started

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Set up Environment Variables**:
   Create a `.env.local` file based on `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
4. **Start Convex**:
   ```bash
   npx convex dev
   ```
5. **Start Next.js**:
   ```bash
   npm run dev
   ```

## Deployment

### 1. Convex (Backend)
- Run `npx convex deploy` to deploy your backend functions and schema to production.
- Configure your production environment variables in the [Convex Dashboard](https://dashboard.convex.dev):
  - `OPENAI_API_KEY`

### 2. Clerk (Auth)
- Go to the [Clerk Dashboard](https://dashboard.clerk.com) and create a production instance.
- Get your `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.

### 3. Vercel (Frontend)
- Connect your GitHub repository to Vercel.
- Add the environment variables from `.env.example` to the Vercel project settings.
- Ensure `NEXT_PUBLIC_CONVEX_URL` points to your production Convex deployment.

## Production Build

To verify the build locally:
```bash
npm run build
```
This runs linting and TypeScript checks before generating the optimized bundle.
