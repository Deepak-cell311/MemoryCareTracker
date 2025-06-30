# CalmPathAI - Memory Care Monitor

## Overview

CalmPathAI is a comprehensive AI-powered monitoring system designed specifically for memory care facilities. The application provides therapeutic support through conversational AI, real-time emotional well-being tracking, and comprehensive patient management tools. Built as a full-stack web application with a React frontend and Express.js backend, it integrates OpenAI's GPT models for therapeutic conversations and uses PostgreSQL for data persistence.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for healthcare-specific color schemes
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js 20
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL store
- **File Upload**: Multer for therapeutic photo uploads
- **API Design**: RESTful endpoints with JSON responses

### Database Design
- **Database**: PostgreSQL 16
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Migration**: Drizzle Kit for schema migrations
- **Connection**: Neon serverless PostgreSQL with connection pooling

## Key Components

### Authentication System
- **Provider**: Replit Auth using OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions with 7-day TTL
- **User Management**: Role-based access (staff, admin)
- **Security**: HTTP-only cookies with secure flags

### Therapeutic AI Assistant
- **Provider**: OpenAI GPT-4o for conversational therapy
- **Features**: 
  - Voice interaction with Speech Recognition and Speech Synthesis APIs
  - Contextual conversations based on patient history and mood
  - Automatic sentiment analysis and mood tracking
  - Staff attention alerts for concerning interactions
- **Safety**: Specialized prompts for memory care patients with gentle redirection techniques

### Patient Management
- **Core Features**:
  - Real-time status tracking (anxious, ok, good)
  - Color-coded visual indicators for quick assessment
  - Last interaction timestamps
  - Room and admission information
- **Staff Tools**:
  - Note-taking system with staff attribution
  - Mood logging with historical trends
  - Photo therapy with categorized image uploads

### Real-time Monitoring
- **Status Updates**: Automatic refresh every 30 seconds for patient status
- **Alert System**: Real-time notifications for mood changes and staff attention needs
- **Analytics**: Status distribution charts and trend analysis

## Data Flow

### Authentication Flow
1. User accesses application
2. Replit Auth redirects to OpenID Connect provider
3. Successful authentication creates/updates user record
4. Session stored in PostgreSQL with encrypted session data
5. Subsequent requests validated against session store

### Therapeutic Conversation Flow
1. Patient interaction triggers AI assistant
2. Voice input converted to text via Speech Recognition API
3. Context gathered (patient history, recent notes, mood)
4. OpenAI GPT-4o generates therapeutic response
5. Response analyzed for sentiment and mood indicators
6. Conversation logged to database
7. Staff alerts generated if intervention needed
8. Text-to-speech conversion for voice output

### File Upload Flow
1. Therapeutic photos uploaded via multipart form data
2. Multer processes files with size and type validation
3. Files stored in local uploads directory
4. Database records created with file metadata and therapeutic categories

## External Dependencies

### Core Services
- **OpenAI API**: GPT-4o model for therapeutic conversations
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit Auth**: OpenID Connect authentication provider

### Browser APIs
- **Speech Recognition API**: Voice input processing
- **Speech Synthesis API**: Text-to-speech output
- **File API**: Photo upload handling

### Third-party Libraries
- **UI Components**: Radix UI primitives for accessibility
- **Validation**: Zod schemas with Drizzle integration
- **Date Handling**: date-fns for timestamp formatting
- **Styling**: Tailwind CSS with class-variance-authority

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20 with TypeScript compilation via tsx
- **Hot Reload**: Vite dev server with React Fast Refresh
- **Database**: Development PostgreSQL instance with auto-migrations

### Production Build
- **Frontend**: Vite production build with asset optimization
- **Backend**: ESBuild compilation to ESM format
- **Static Assets**: Served from dist/public directory
- **Database**: Production PostgreSQL with connection pooling

### Replit Configuration
- **Modules**: nodejs-20, web, postgresql-16
- **Deployment**: Autoscale deployment target
- **Port**: External port 80 mapped to internal port 5000
- **Build Command**: npm run build
- **Start Command**: npm run start

## Changelog

```
Changelog:
- June 26, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```