# CONTEXT.md - Converto ServerSide (Admin Portal)

# 1. Project Overview
- **Purpose**: To provide a comprehensive backend and administrative interface for the Converto platform.
- **Business goal**: Manage users, transactions, service requests, and live customer support securely and efficiently.
- **Problem being solved**: Centralizing operations for a global financial, payment, shopping, and booking platform, allowing staff to manage operations via a unified dashboard.
- **Target users**: Converto internal staff, administrators, and support agents.
- **Current development status**: Active development. Key features like real-time support chat, notifications, and core routing are functional. Deployed on Vercel.

# 2. Architecture
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS.
- **Backend**: Next.js Server Actions, API Routes.
- **Database**: Supabase PostgreSQL.
- **Storage**: Supabase Storage (Buckets for attachments/avatars).
- **Authentication**: Supabase Auth with SSR cookies.
- **Deployment & Hosting**: Vercel.
- **Data Flow**: Admin performs an action (e.g., sends a message) -> Next.js Server Action is invoked -> Action executes Supabase RPC or direct insert -> Supabase triggers (or RPCs) generate notifications -> Realtime WebSockets broadcast updates to connected clients (Admin and User sides) -> UI optimistically updates.

# 3. Folder Structure
- `/app`: Next.js App Router root. Contains all pages, layouts, and API routes.
- `/app/(admin)`: Protected group for admin routes. Groups routing logically without adding `(admin)` to the URL path.
- `/components`: Reusable UI components (buttons, inputs, layouts, modals). Extracted to ensure DRY principles.
- `/lib`: Utility functions, Supabase clients (`server.ts`, `client.ts`, `middleware.ts`), and animation configurations.
- `/hooks`: Custom React hooks for state and lifecycle management (e.g., `useNotifications`).
- `/public`: Static assets like images and manifest files.

# 4. Technologies
- **Next.js (15.x)**: Full-stack React framework for SSR and Server Actions.
- **React (19.x)**: UI library.
- **TypeScript**: Static typing for reliability.
- **Tailwind CSS**: Utility-first CSS framework for rapid styling.
- **Supabase JS / SSR**: Database, Auth, and Realtime WebSocket subscriptions.
- **Framer Motion / Motion/React**: For fluid animations.
- **Sonner / React-hot-toast**: For toast notifications.
- **Lucide React**: Iconography.

# 5. Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: URL to the Supabase instance. Used client and server-side.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anonymous public key for Supabase. Used client and server-side.
- `SUPABASE_SERVICE_ROLE_KEY`: Admin key that bypasses RLS. Used STRICTLY server-side for sensitive operations (e.g., creating conversations, bypassing read restrictions for system updates).

# 6. Database
- **profiles**: Stores user metadata (avatar, full name, role). RLS enabled.
- **communication_conversations**: Chat threads. Columns: `id`, `subject`, `status`, `channel`, `last_message_at`.
- **communication_messages**: Individual chat messages. Columns: `id`, `conversation_id`, `sender_id`, `text`, `visibility`.
- **communication_participants**: Links users to conversations.
- **notifications**: System and chat notifications. Triggered by database functions.
- **service_requests & transactions**: Core operational tables for booking/finance tracking.
- **Policies/RLS**: Strict RLS policies restrict row visibility. `service_role` key is used to bypass RLS when necessary (e.g., creating a conversation).
- **RPCs/Triggers**: Functions like `fn_staff_send_chat_message` handle atomic inserts of messages and notifications.

# 7. Authentication Flow
- **Session**: Managed via Supabase SSR cookies.
- **Middleware**: Intercepts all requests. Validates the session. If no session exists, redirects to `/login`. Admin routes verify the user's role/permissions.
- **Protected Routes**: Everything under `/app/(admin)` is protected by middleware and server-side session checks.

# 8. API Documentation
- **Server Actions**: Primarily used instead of traditional REST APIs.
  - `sendSupportMessage(convId, text, visibility)`: Sends a message via RPC or direct insert.
  - `getInboxData()`: Fetches all open conversations for the admin dashboard.
  - `fetchUserAvatars(ids)`: Retrieves profile pictures to attach to messages.

# 9. Components
- **SupportInbox**: Manages the list of active conversations.
  - *Dependencies*: Supabase client, Realtime.
  - *State*: List of conversations, active conversation ID.
- **ChatWindow**: The actual messaging interface.
  - *State*: Local messages, optimistic UI updates.
  - *Lifecycle*: Subscribes to `postgres_changes` on mount, cleans up on unmount.

# 10. Pages
- `/support`: The main helpdesk page. Renders `SupportInbox` and `ChatWindow`.
- `/dashboard`: High-level metrics, active service requests, and transaction volumes.
- `/users`: User management interface.

# 11. State Management
- **Local State**: `useState` for UI toggles (modals, active tabs).
- **Realtime State**: Subscriptions to Supabase `postgres_changes` sync remote database state to local React state via `setMessages(prev => [...prev, newMsg])`.
- **Caching**: Next.js App Router caching (`revalidatePath`).

# 12. Business Logic
- **Optimistic UI**: Chat messages appear instantly for the sender. The server request happens in the background. If it fails, the UI handles the error.
- **Role-based visibility**: Messages have a `visibility` column. Internal notes are invisible to customers.
- **Notification Routing**: Database triggers evaluate `target_role`. Notifications destined for 'customer' only trigger on the UserSide.

# 13. Important Algorithms
- **Message Deduplication**: When receiving a WebSocket payload, the system checks `if (prev.some(m => m.id === msg.id)) return prev;` to prevent rendering the same message twice.
- **Toast Deduplication**: `sonner` is passed the notification `id` to prevent Strict Mode double-mounting from spawning multiple toasts.

# 14. Configuration Files
- `next.config.ts`: Next.js configuration.
- `tailwind.config.ts`: Defines design tokens (colors, fonts).
- `.eslintrc.json`: Enforces code quality (strict no-explicit-any).
- `package.json`: Dependency management.

# 15. Build Process
- Executed via `npm run build` / `next build`.
- Compiles TypeScript, runs ESLint (which is strict and will fail on `any` types), builds server and client components, and outputs to `.next`.
- Deployed on Vercel.

# 16. Third-party Services
- **Supabase**: Auth, PostgreSQL, Realtime WebSockets, Storage.
- **Vercel**: Edge network deployment and CI/CD.

# 17. Error Handling
- **Server Actions**: Wrapped in `try/catch`. Return `{ error: string }` instead of throwing, allowing the client to render the error gracefully.
- **UI**: Toast notifications display errors to the staff.

# 18. Security
- **RLS**: Row Level Security ensures users can only access their own data.
- **Server-side validation**: Never trust the client. Server actions re-verify user identity via `supabase.auth.getUser()`.
- **Secrets**: API keys are securely stored in Vercel environment variables.

# 19. Performance
- **Image Optimization**: Use of Next.js `<Image />` where possible.
- **Non-blocking Realtime**: Realtime listeners push text payloads to the UI instantly, and fetch avatars asynchronously in the background so the UI doesn't stutter.

# 20. Reusable Utilities
- `cn()`: Utility for conditionally merging Tailwind classes (`clsx` + `tailwind-merge`).
- `supabase/server`: Helper to initialize SSR Supabase client with cookies.

# 21. Constants
- Pre-defined categories and statuses for conversations (`open`, `resolved`, etc.).

# 22. Types
- `ChatMessage`: `id`, `sender_id`, `text`, `visibility`, `created_at`.
- `Notification`: `id`, `profile_id`, `message`, `action_url`.

# 23. Development Workflow
- Start: `npm run dev`
- Build: `npm run build`
- Commits pushed to `main` auto-deploy to Vercel.

# 24. Known Issues
- Realtime channels can occasionally duplicate in dev mode due to React Strict Mode (resolved globally via toast IDs).
- RPC fallbacks are currently in use because `fn_staff_send_chat_message` hardcodes `/support` instead of `/support?chat=open`.

# 25. Future Roadmap
- AI auto-summarization of tickets.
- Analytics dashboard for support agent response times.

# 26. Developer Decisions
- **Bypassing RLS for Conversation Creation**: Used `SUPABASE_SERVICE_ROLE_KEY` to securely create conversations because the chicken-and-egg problem of RLS prevents users from selecting a conversation before they are added as a participant.
- **Asynchronous Avatars**: Dropped `await` from avatar fetching in websocket callbacks to ensure 0ms latency on incoming messages.

# 27. Coding Conventions
- **Naming**: camelCase for variables, PascalCase for components, kebab-case for files.
- **Imports**: Absolute imports with `@/` alias.
- **Style**: Strict TypeScript (no `any`).

# 28. Dependencies Between Modules
- `SupportInbox` relies on `ChatWindow` for rendering the active conversation. Both rely heavily on `actions.ts`.

# 29. Critical Files
- `app/(admin)/support/actions.ts`: Contains the core logic for the helpdesk.
- `lib/supabase/middleware.ts`: Secures the entire application.

# 30. AI Continuation Notes
- **DO NOT USE `any` IN TYPESCRIPT**. ESLint will fail the Vercel build. Use `unknown` or define specific types/Records.
- Always use `createAdminClient` ONLY in secure Server Actions when you explicitly need to bypass RLS (e.g., creating relational records before permissions apply).
- Never block a realtime WebSocket listener with synchronous `await` calls for supplementary data (like avatars); do it asynchronously.
- Ensure toast notifications are passed a unique `id` to prevent Strict Mode dev duplicates.
