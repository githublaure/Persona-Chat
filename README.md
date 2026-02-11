# CharacterChat - AI-Powered Conversations

CharacterChat is a full-stack web application that lets you create custom AI characters and have real-time conversations with them. Each character has its own personality, backstory, and speaking style powered by OpenAI's language models. The interface is inspired by modern messaging apps like iMessage and WhatsApp.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack Overview](#tech-stack-overview)
3. [Project Structure](#project-structure)
4. [How It Works](#how-it-works)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Frontend Architecture](#frontend-architecture)
8. [AI Integration](#ai-integration)
9. [Real-Time Streaming (SSE)](#real-time-streaming-sse)
10. [Theming (Dark/Light Mode)](#theming-darklight-mode)
11. [Getting Started](#getting-started)
12. [Key Concepts for Beginners](#key-concepts-for-beginners)

---

## Features

- **Custom AI Characters** - Create characters with a name, description, personality instructions (system prompt), and greeting message
- **Real-Time Streaming** - AI responses appear word-by-word in real time, just like ChatGPT
- **6 Default Characters** - Includes Socrates, Ada Lovelace, Marcus Aurelius, Chef Julia, Dr. Nova, and Coach Posture Pro
- **Conversation History** - All chats are saved in a PostgreSQL database and persist across sessions
- **Dark/Light Mode** - Toggle between themes with localStorage persistence
- **Responsive Design** - Works on desktop, tablet, and mobile with a collapsible sidebar
- **Character Management** - Create new characters and delete existing ones

---

## Tech Stack Overview

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | React 18 + TypeScript | UI components with static typing |
| **Build Tool** | Vite 7 | Fast development server with Hot Module Replacement (HMR) |
| **Routing** | wouter | Lightweight client-side routing (alternative to React Router) |
| **State Management** | TanStack Query v5 | Server state management, caching, and data fetching |
| **UI Components** | Shadcn UI | Pre-built accessible components based on Radix UI primitives |
| **Styling** | Tailwind CSS 3 | Utility-first CSS framework |
| **Forms** | react-hook-form + zod | Form handling with schema-based validation |
| **Icons** | lucide-react | Modern icon library |
| **Backend** | Express.js 5 | HTTP server and API routes |
| **Database** | PostgreSQL (Neon) | Relational database for persistent storage |
| **ORM** | Drizzle ORM | Type-safe SQL query builder for TypeScript |
| **AI** | OpenAI SDK (gpt-5-mini) | Language model for generating character responses |
| **Streaming** | Server-Sent Events (SSE) | Real-time one-way data streaming from server to client |

---

## Project Structure

```
characterchat/
├── client/                        # Frontend (React + Vite)
│   ├── index.html                 # HTML entry point with SEO meta tags
│   └── src/
│       ├── main.tsx               # React entry point, mounts <App />
│       ├── App.tsx                 # Root component with routing
│       ├── index.css              # Global styles, CSS variables, Tailwind config
│       ├── pages/
│       │   ├── chat.tsx           # Main chat page (sidebar + chat view layout)
│       │   └── not-found.tsx      # 404 page
│       ├── components/
│       │   ├── chat-sidebar.tsx   # Sidebar: character list + conversation list
│       │   ├── chat-view.tsx      # Chat area: messages + input + streaming
│       │   ├── message-bubble.tsx # Individual message display (user vs AI)
│       │   ├── typing-indicator.tsx # Animated dots while AI is responding
│       │   ├── empty-state.tsx    # Shown when no conversation is selected
│       │   ├── new-character-dialog.tsx # Modal form to create a character
│       │   ├── character-avatar.tsx # Colored circle with character initials
│       │   ├── theme-toggle.tsx   # Dark/light mode switch button
│       │   └── ui/               # Shadcn UI base components (Button, Dialog, etc.)
│       ├── hooks/
│       │   ├── use-mobile.tsx     # Detects mobile viewport
│       │   └── use-toast.ts      # Toast notification hook
│       └── lib/
│           ├── queryClient.ts     # TanStack Query setup + API helper
│           ├── theme.tsx          # Theme context provider
│           └── utils.ts           # Utility: cn() for class merging
├── server/                        # Backend (Express.js)
│   ├── index.ts                   # Express app setup and startup
│   ├── routes.ts                  # All API route handlers
│   ├── storage.ts                 # Database access layer (IStorage interface)
│   ├── seed.ts                    # Seeds default characters on first run
│   ├── db.ts                      # PostgreSQL connection pool
│   ├── vite.ts                    # Vite dev server integration
│   └── static.ts                  # Static file serving for production
├── shared/                        # Code shared between frontend and backend
│   └── schema.ts                  # Drizzle schema + Zod validation + TypeScript types
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── tailwind.config.ts             # Tailwind CSS configuration
├── vite.config.ts                 # Vite build configuration
└── drizzle.config.ts              # Drizzle ORM migration configuration
```

---

## How It Works

Here is the step-by-step flow when a user sends a message:

```
1. User types a message and presses Send
         │
         ▼
2. Frontend sends POST /api/conversations/:id/messages
   with { content: "Hello Socrates" }
         │
         ▼
3. Server saves the user message to the database
         │
         ▼
4. Server builds a prompt array:
   [
     { role: "system", content: character's personality instructions },
     { role: "user", content: "previous message 1" },
     { role: "assistant", content: "previous response 1" },
     { role: "user", content: "Hello Socrates" }    ← new message
   ]
         │
         ▼
5. Server calls OpenAI with stream: true
         │
         ▼
6. OpenAI sends back tokens one by one
         │
         ▼
7. Server forwards each token to the frontend via SSE
   data: {"content": "Greet"}
   data: {"content": "ings"}
   data: {"content": ", my"}
   data: {"content": " friend"}
         │
         ▼
8. Frontend appends each token to the message bubble in real time
         │
         ▼
9. When streaming ends, server saves the full AI response to the database
   and sends: data: {"done": true}
         │
         ▼
10. Frontend refreshes the conversation data from the server
```

---

## Database Schema

The application uses three tables defined in `shared/schema.ts` using Drizzle ORM:

### Characters Table
Stores the AI personalities that users can chat with.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial (auto-increment) | Primary key |
| `name` | text | Character's display name |
| `description` | text | Short description shown in the sidebar |
| `system_prompt` | text | Instructions sent to OpenAI defining the character's personality |
| `avatar_color` | varchar(7) | Hex color code for the avatar circle |
| `greeting` | text | First message the character sends when starting a new chat |
| `created_at` | timestamp | When the character was created |

### Conversations Table
Represents a chat session between the user and a character.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `character_id` | integer (FK) | References the character this conversation is with |
| `title` | text | Display title (auto-generated from the first AI response) |
| `last_message_at` | timestamp | Used to sort conversations by recency |
| `created_at` | timestamp | When the conversation was created |

### Messages Table
Stores individual messages within a conversation.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `conversation_id` | integer (FK) | References the parent conversation |
| `role` | text | Either `"user"` or `"assistant"` |
| `content` | text | The message text |
| `created_at` | timestamp | When the message was sent |

### Relationships
- A **Character** can have many **Conversations** (one-to-many)
- A **Conversation** can have many **Messages** (one-to-many)
- Deleting a character cascades to delete all its conversations
- Deleting a conversation cascades to delete all its messages

### Validation with Zod
Each table has a corresponding Zod schema generated by `drizzle-zod`:

```typescript
// Auto-generated insert schema (excludes auto-generated fields)
export const insertCharacterSchema = createInsertSchema(characters).omit({
  id: true,
  createdAt: true,
});

// TypeScript type inferred from the schema
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;

// TypeScript type for reading from DB
export type Character = typeof characters.$inferSelect;
```

This means the same schema is used for:
- Backend request validation (in route handlers)
- Frontend form validation (in the character creation dialog)
- TypeScript type checking (everywhere)

---

## API Endpoints

All endpoints are defined in `server/routes.ts`.

### Characters

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/characters` | List all characters |
| `GET` | `/api/characters/:id` | Get a single character |
| `POST` | `/api/characters` | Create a new character |
| `DELETE` | `/api/characters/:id` | Delete a character and all its conversations |

### Conversations

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/conversations` | List all conversations (with character info) |
| `GET` | `/api/conversations/:id` | Get a conversation with its character and messages |
| `POST` | `/api/conversations` | Start a new conversation with a character |
| `DELETE` | `/api/conversations/:id` | Delete a conversation and all its messages |

### Messaging (with AI streaming)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/conversations/:id/messages` | Send a message and receive a streamed AI response |

The messaging endpoint is special: it returns a **Server-Sent Events (SSE)** stream instead of a regular JSON response. See the [SSE section](#real-time-streaming-sse) for details.

---

## Frontend Architecture

### Component Hierarchy

```
App (routing, providers)
└── ChatPage
    └── SidebarProvider
        └── ChatContent
            ├── ChatSidebar
            │   ├── Search input
            │   ├── Character list (SidebarMenu)
            │   │   └── Character items (clickable to start new chat)
            │   ├── Conversation list (SidebarMenu)
            │   │   └── Conversation items (clickable to open chat)
            │   └── NewCharacterDialog (modal form)
            └── Main content area
                ├── ChatView (when a conversation is active)
                │   ├── Header (character name + avatar)
                │   ├── Message list (scrollable)
                │   │   ├── MessageBubble (user messages: right-aligned)
                │   │   ├── MessageBubble (AI messages: left-aligned)
                │   │   └── TypingIndicator (animated dots during streaming)
                │   └── Input area (textarea + send button)
                └── EmptyState (when no conversation is selected)
```

### Data Fetching with TanStack Query

TanStack Query (formerly React Query) handles all server communication:

```typescript
// Fetching data (automatic caching + refetching)
const { data, isLoading } = useQuery<Character[]>({
  queryKey: ["/api/characters"],
});

// Mutating data (POST/DELETE + cache invalidation)
const createMutation = useMutation({
  mutationFn: async (values) => {
    const res = await apiRequest("POST", "/api/characters", values);
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
  },
});
```

**Key concepts for beginners:**
- `queryKey` is a unique identifier for cached data. When you invalidate a key, TanStack Query refetches it automatically.
- `useQuery` fetches data on component mount and caches it. The `isLoading` flag lets you show a skeleton while loading.
- `useMutation` is for write operations (POST, PUT, DELETE). After a mutation succeeds, you invalidate related queries to refresh the UI.

### Form Handling

The character creation form uses `react-hook-form` with `zod` validation:

```typescript
const formSchema = insertCharacterSchema.extend({
  name: z.string().min(1, "Name is required").max(50),
  description: z.string().min(1, "Description is required").max(200),
});

const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: { name: "", description: "", ... },
});
```

This setup:
1. Reuses the same Zod schema from the database layer
2. Extends it with additional client-side rules (min/max length)
3. Automatically validates on submit and shows error messages
4. Prevents submission if validation fails

---

## AI Integration

### OpenAI Setup

The app uses OpenAI through Replit's AI Integrations, which handles API key management automatically:

```typescript
// server/routes.ts
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});
```

No manual API key configuration is needed. Replit provides the credentials through environment variables.

### How System Prompts Work

Each character has a `systemPrompt` field that tells the AI how to behave. When sending messages to OpenAI, the system prompt is always the first message:

```typescript
const chatMessages = [
  {
    role: "system",
    content: "You are Socrates, the ancient Greek philosopher..."
  },
  { role: "user", content: "What is justice?" },
  { role: "assistant", content: "A fine question indeed..." },
  { role: "user", content: "Can you explain further?" }  // latest message
];
```

The AI reads the full conversation history each time, so it can maintain context across multiple messages. The system prompt is invisible to the user but shapes the AI's entire personality and behavior.

### Model Configuration

```typescript
const stream = await openai.chat.completions.create({
  model: "gpt-5-mini",               // Fast, cost-effective model
  messages: chatMessages,             // Full conversation history
  stream: true,                       // Enable token-by-token streaming
  max_completion_tokens: 2048,        // Maximum response length
});
```

---

## Real-Time Streaming (SSE)

### What is SSE?

**Server-Sent Events (SSE)** is a web standard that allows a server to push data to the browser over a single HTTP connection. Unlike WebSockets (which are bidirectional), SSE is one-way: server to client. It is perfect for streaming AI responses.

### How It Works in This App

**Server side** (Express.js):
```typescript
// Set SSE headers
res.setHeader("Content-Type", "text/event-stream");
res.setHeader("Cache-Control", "no-cache");
res.setHeader("Connection", "keep-alive");

// Stream each token as it arrives from OpenAI
for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content || "";
  if (delta) {
    res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
  }
}

// Signal completion
res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
res.end();
```

**Client side** (React):
```typescript
const response = await fetch(`/api/conversations/${id}/messages`, {
  method: "POST",
  body: JSON.stringify({ content: userMessage }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  // Parse SSE lines: "data: {\"content\": \"Hello\"}\n\n"
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = JSON.parse(line.slice(6));
      if (data.done) { /* streaming finished */ }
      else { appendToMessage(data.content); }
    }
  }
}
```

### Why SSE Instead of WebSockets?

- SSE uses standard HTTP (no special protocol upgrade needed)
- Simpler to implement than WebSockets
- Works through proxies and load balancers without configuration
- Perfect for this use case where data only flows one way (server to client)
- Automatic reconnection built into the browser's EventSource API

---

## Theming (Dark/Light Mode)

### How It Works

1. **CSS Variables** define all colors in `client/src/index.css`:
   ```css
   :root {
     --background: 0 0% 100%;        /* white in light mode */
     --foreground: 0 0% 9%;          /* near-black text */
   }
   .dark {
     --background: 240 10% 4%;       /* near-black in dark mode */
     --foreground: 0 0% 95%;         /* near-white text */
   }
   ```

2. **ThemeProvider** (`client/src/lib/theme.tsx`) manages the theme state:
   - Stores the current theme in React context
   - Toggles the `dark` CSS class on `<html>` element
   - Persists the choice in `localStorage` so it survives page refreshes

3. **Tailwind** classes reference these variables:
   ```tsx
   <div className="bg-background text-foreground">
     {/* Automatically adapts to light/dark mode */}
   </div>
   ```

4. **ThemeToggle** button switches between modes:
   ```tsx
   <Button onClick={toggleTheme}>
     {theme === "dark" ? <Sun /> : <Moon />}
   </Button>
   ```

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database (provided automatically on Replit)

### Running Locally on Replit
1. The app starts automatically via the "Start application" workflow
2. It runs `npm run dev` which starts both the Express backend and Vite frontend on port 5000
3. The database is seeded with 6 default characters on first run

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start development server (backend + frontend) |
| `build` | `npm run build` | Build for production |
| `start` | `npm start` | Run production build |
| `check` | `npm run check` | TypeScript type checking |
| `db:push` | `npm run db:push` | Push Drizzle schema changes to the database |

---

## Key Concepts for Beginners

### What is an ORM?
An **ORM** (Object-Relational Mapping) lets you interact with a database using your programming language instead of writing raw SQL. Drizzle ORM translates TypeScript code into SQL queries:

```typescript
// Instead of: SELECT * FROM characters WHERE id = 5
const character = await db.select().from(characters).where(eq(characters.id, 5));
```

### What is Zod?
**Zod** is a schema validation library. You define the shape of your data, and Zod checks that incoming data matches:

```typescript
const schema = z.object({
  name: z.string().min(1),     // must be a non-empty string
  age: z.number().positive(),  // must be a positive number
});

schema.parse({ name: "Alice", age: 30 });  // OK
schema.parse({ name: "", age: -1 });        // Throws validation error
```

### What is TanStack Query?
**TanStack Query** manages data fetching, caching, and synchronization. Without it, you would need to manually track loading states, cache API responses, and refetch data when it becomes stale. TanStack Query handles all of this automatically.

### What is a System Prompt?
In AI chat applications, a **system prompt** is a hidden instruction sent to the AI before the conversation begins. It tells the AI how to behave, what personality to adopt, and what rules to follow. Users never see the system prompt, but it shapes every AI response.

### What is SSE (Server-Sent Events)?
**SSE** is a technology that lets a server send updates to a web page in real time. The browser opens a connection, and the server sends data whenever it has something new. In this app, it is used to stream AI-generated text word by word, creating the "typing" effect.

### What is Tailwind CSS?
**Tailwind CSS** is a utility-first CSS framework. Instead of writing custom CSS classes, you apply small utility classes directly in your HTML/JSX:

```tsx
// Traditional CSS: .card { padding: 16px; border-radius: 8px; background: white; }
// Tailwind equivalent:
<div className="p-4 rounded-md bg-white">
```
