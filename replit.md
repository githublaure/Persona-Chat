# CharacterChat - AI-Powered Conversations

## Overview
An AI-powered chat application that lets users create and chat with custom AI characters. Each character has its own personality, description, system prompt, and greeting. The app features a modern messaging UI inspired by iMessage/WhatsApp, responsive design for all devices, and dark/light mode support.

## Recent Changes
- 2026-02-10: Initial MVP built with character creation, AI streaming chat, sidebar navigation, seed data with 5 preset characters

## Architecture
- **Frontend**: React + TypeScript with Vite, TanStack Query, wouter routing, Shadcn UI components, Tailwind CSS
- **Backend**: Express.js with SSE streaming for AI responses
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI via Replit AI Integrations (gpt-5-mini for chat responses)
- **Theme**: Light/dark mode with localStorage persistence

## Project Structure
- `shared/schema.ts` - Drizzle schema: characters, conversations, messages tables
- `server/db.ts` - Database connection pool
- `server/storage.ts` - IStorage interface and DatabaseStorage implementation
- `server/routes.ts` - API routes (characters CRUD, conversations CRUD, streaming chat)
- `server/seed.ts` - Seeds 5 default characters on first run
- `client/src/pages/chat.tsx` - Main chat page with sidebar layout
- `client/src/components/` - Chat UI components (sidebar, chat view, message bubbles, character dialog, etc.)
- `client/src/lib/theme.tsx` - Theme provider with dark/light toggle

## Key Patterns
- SSE streaming for AI chat responses
- Optimistic updates for message sending
- Sidebar-based navigation using Shadcn sidebar primitives
- Form validation with react-hook-form + zod
- Characters have system prompts that define their personality for OpenAI
