# BowlingAlleys.io

A comprehensive platform for discovering, rating, and reviewing bowling alleys across the United States. Connect bowlers with venues through interactive maps, detailed venue pages, user-generated reviews, and specialized directory pages.

## Overview

BowlingAlleys.io is designed to be the go-to resource for bowling enthusiasts, offering features such as:
- Interactive maps with venue locations
- Detailed venue pages with pricing, amenities, and reviews
- User-generated reviews and ratings
- Specialized directory pages (cosmic bowling, leagues, birthday parties, etc.)
- Advanced SEO optimization
- Visual color-coded pricing grid system
- Administrative tools for venue management and CRM tracking
- Content publishing system for blog posts and city guides

## System Architecture

### Frontend (Next.js)
The frontend is built with **Next.js 14** (App Router), React 18, and TypeScript. It uses:
- **Next.js App Router** for file-based routing and server-side rendering
- **TanStack Query** for server state management
- **React Context** for authentication state
- **Tailwind CSS** with **shadcn/ui** and **Radix UI** for accessible components
- **Firebase Authentication** for user accounts (client-side)
- **Leaflet** and **OpenStreetMap** for interactive maps

### Backend (Express.js API)
The backend is a standalone **Express.js** server in TypeScript that provides a REST API:
- Decoupled from the frontend (runs on separate port)
- CORS-enabled to accept requests from the Next.js frontend
- Firebase Admin SDK for server-side Firestore operations
- RESTful API endpoints for venues, reviews, users, and more

### Data Management
- **Firebase Firestore** serves as the real-time data persistence layer
- All frontend Firestore operations go through the Express API
- Server-side caching for public endpoints

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- Firebase project with Firestore enabled
- Firebase service account credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bowling-alley-web
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Set up environment variables**

   Create `server/.env`:
   ```env
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   FIREBASE_PROJECT_ID=your-project-id
   GOOGLE_APPLICATION_CREDENTIALS=server/config/firebase-service-account.json
   # OR use FIREBASE_SERVICE_ACCOUNT_KEY with JSON string
   ```

   Create `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   NEXT_PUBLIC_GA_MEASUREMENT_ID=your-ga-id
   ```

5. **Start the development servers**

   Terminal 1 - API Server:
   ```bash
   npm run dev
   ```

   Terminal 2 - Next.js Frontend:
   ```bash
   cd frontend
   npm run dev
   ```

   The API server will run on `http://localhost:5000` and the frontend on `http://localhost:3000`.

## Core Features

### Authentication & Authorization
- **Firebase Authentication** with Email Verification Code (passwordless via Resend) and Google OAuth
- **Role-based access control** with two admin tiers:
  - **Full Admins**: Complete access to all admin features including venue feature toggles and deletion
  - **Marketing Contributors**: Limited admin access for content updates and venue editing

### User Interaction Features
- **Review System**: Users can submit and edit 1-5 star reviews per venue
- **Venue Accuracy Reporting**: Users can vote on venue information accuracy
- **Venue Claiming System**: Venue owners can claim and update their listings
- **Owner Profile System**: Self-service system for owners to create public, SEO-optimized profiles
- **Saved Alleys System**: Authenticated users can save venues to a personal collection
- **Location Suggestion System**: Users can suggest new bowling alley locations

### Venue Management
- **My Venues Page**: Dedicated page for authenticated owners to manage claimed venues
- **Edit Venue Page**: Tab-based interface for detailed venue management
- **Pricing System**: Flexible pricing system supporting complex real-world pricing structures
- **Founding Partners Program**: Exclusive recognition program for early claimed alleys
- **Sponsor Venues**: Designated sponsor venues with special presentation

### Content & SEO
- **City Hub Pages**: Comprehensive guides for select cities with local SEO optimization
- **Blog System**: MDX-based blog posts for content publishing
- **Server-side meta tags**: Open Graph and Twitter Card support for crawlers
- **Sitemap Integration**: Full sitemap support for all routes

### Mapping & Location
- **Interactive Maps**: Leaflet-based maps with color-coded markers
- **Location Pages**: State and city-level location pages
- **Venue Expansion**: Automatic search expansion within 100-mile radius for sparse areas

## Project Structure

```
bowling-alley-web/
├── frontend/          # Next.js frontend application
│   ├── app/          # Next.js App Router pages
│   ├── components/   # React components
│   ├── lib/          # Utilities and API client
│   ├── content/      # MDX blog content
│   └── public/       # Static assets
├── server/           # Express.js API server
│   ├── routes.ts     # API route definitions
│   ├── auth.ts       # Firebase Admin setup
│   └── config/       # Service account credentials
├── shared/           # Shared TypeScript types
└── attached_assets/  # Static assets (logos, images)
```

## Development

### Scripts

**Root (API Server):**
- `npm run dev` - Start API server in development mode
- `npm run build` - Build API server for production
- `npm run start` - Start production API server

**Frontend:**
- `cd frontend && npm run dev` - Start Next.js dev server
- `cd frontend && npm run build` - Build Next.js for production
- `cd frontend && npm run start` - Start production Next.js server

## External Dependencies

### Core Technologies
- React 18
- Next.js 14
- TypeScript
- Express.js
- Firebase (Authentication & Firestore)

### UI & Styling
- Tailwind CSS
- shadcn/ui
- Radix UI
- Lucide React

### Map & Visualization
- Leaflet
- OpenStreetMap

### Data Fetching & State
- TanStack Query
- React Hook Form
- Zod

### Development & Build
- tsx (for running TypeScript directly)
- esbuild (for bundling the API server)

## Recent Changes

- **Migration to Next.js**: Migrated from Vite/React to Next.js App Router for improved SEO and server-side rendering
- **API Decoupling**: Separated Express API server from frontend for better scalability
- **Firestore Migration**: Replaced direct Firestore operations with REST API calls

## License

MIT

