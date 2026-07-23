# CONTEXT.md - Converto ServerSide (Admin Portal)

# 1. Project Overview
- **Purpose**: To provide a comprehensive backend and administrative interface for the Converto platform.
- **Business goal**: Manage users, transactions, service requests, and live customer support securely and efficiently.
- **Problem being solved**: Centralizing operations for a global financial, payment, shopping, and booking platform, allowing staff to manage operations via a unified dashboard.
- **Target users**: Converto internal staff, administrators, and support agents.
- **Current development status**: Active development. PWA support enabled via `@ducanh2912/next-pwa`. Real-time support chat, soft-delete, ticket deep-linking, notifications, and core routing are fully functional. Deployed on Vercel.

# 2. Architecture
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS.
- **Backend**: Next.js Server Actions, API Routes.
- **Database**: Supabase PostgreSQL with custom atomic RPC procedures.
- **Storage**: Supabase Storage (Buckets for attachments/avatars).
- **Authentication**: Supabase Auth with SSR cookies.
- **PWA**: Powered by `@ducanh2912/next-pwa` with automatic service worker registration and `manifest.json` asset configurations.
- **Deployment & Hosting**: Vercel.
- **Data Flow**: Admin performs an action (e.g., sends a message or deletes a chat) -> Next.js Server Action is invoked -> Action executes Supabase RPC or update -> Supabase triggers generate role-targeted notifications -> Realtime WebSockets broadcast updates to connected clients -> UI optimistically updates.

# 3. Folder Structure
- `/app`: Next.js App Router root. Contains all pages, layouts, and API routes.
- `/app/(admin)`: Protected group for admin routes. Groups routing logically without adding `(admin)` to the URL path.
- `/components`: Reusable UI components (buttons, inputs, layouts, modals). Extracted to ensure DRY principles.
- `/lib`: Utility functions, Supabase clients (`server.ts`, `client.ts`, `middleware.ts`), and animation configurations.
- `/hooks`: Custom React hooks for state and lifecycle management (e.g., `useNotifications`).
- `/public`: Static assets like images and PWA manifest files.

# 4. Technologies
- **Next.js (15.x)**: Full-stack React framework for SSR and Server Actions.
- **React (19.x)**: UI library.
- **TypeScript**: Static typing for reliability.
- **Tailwind CSS**: Utility-first CSS framework for rapid styling.
- **@ducanh2912/next-pwa**: PWA generator & service worker wrapper for Next.js 15.
- **Supabase JS / SSR**: Database, Auth, and Realtime WebSocket subscriptions.
- **Framer Motion / Motion/React**: For fluid animations.
- **Sonner / React-hot-toast**: For toast notifications.
- **Lucide React**: Iconography.

# 5. Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: URL to the Supabase instance. Used client and server-side.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anonymous public key for Supabase. Used client and server-side.
- `SUPABASE_SERVICE_ROLE_KEY`: Admin key that bypasses RLS. Used STRICTLY server-side for sensitive operations (e.g., soft deleting conversations, bypassing read restrictions for system updates).

# 6. Database
- **profiles**: Stores user metadata (avatar, full name, role). RLS enabled.
- **communication_conversations**: Chat threads. Columns: `id`, `subject`, `status`, `channel`, `priority`, `is_deleted`, `deleted_by`, `deleted_at`, `last_message_at`.
- **communication_messages**: Individual chat messages. Columns: `id`, `conversation_id`, `sender_id`, `sender_type`, `text`, `visibility`, `is_deleted`.
- **communication_participants**: Links users to conversations (`conversation_id`, `user_id`, `user_type`).
- **notifications**: System and chat notifications (`profile_id`, `target_role`, `title`, `message`, `category`, `action_url`). Triggered by database functions.
- **service_requests & transactions**: Core operational tables for booking/finance tracking.
- **Policies/RLS**: Strict RLS policies restrict row visibility based on participant membership or staff status.
- **RPCs/Triggers**: `fn_customer_send_chat_message` and `fn_staff_send_chat_message` handle atomic creation and notification broadcasting with `?id=` deep links.

# 7. Authentication Flow
- **Session**: Managed via Supabase SSR cookies.
- **Middleware**: Intercepts all requests. Validates the session. If no session exists, redirects to `/login`. Admin routes verify the user's role/permissions.
- **Protected Routes**: Everything under `/app/(admin)` is protected by middleware and server-side session checks.

# 8. API Documentation
- **Server Actions**: Primarily used instead of traditional REST APIs.
  - `sendSupportMessage(convId, text, visibility)`: Sends a staff message in a conversation.
  - `deleteConversation(convId)`: Soft-deletes a conversation (`is_deleted = true`).
  - `updateConversationStatus(convId, status)`: Updates ticket state (`open`, `waiting_on_customer`, `resolved`, `closed`).
  - `updateConversationPriority(convId, priority)`: Updates priority (`low`, `normal`, `high`, `urgent`).
  - `fetchUserAvatars(ids)`: Retrieves profile pictures to attach to messages.

# 9. Components
- **SupportInbox**: Manages the list of active conversations, URL deep-linking (`useSearchParams`), and 3-pane layout.
  - *Dependencies*: Supabase client, Realtime, Next.js Navigation (`useSearchParams`, `useRouter`).
  - *State*: List of conversations, active conversation ID synced to URL `?id=...`.
- **ConversationList**: Renders conversation cards with channel badges, priority dots, status labels, and a 1-click delete button.
- **ChatPanel**: The actual messaging timeline interface with internal note toggle.
- **ConversationSidebar**: Customer profile summary, SLA timers, status controls, priority controls, and a dedicated **"Delete Chat"** button.

# 10. Pages
- `/support`: The main helpdesk page. Renders `SupportInbox`, `ConversationList`, `ChatPanel`, and `ConversationSidebar`. Supports `?id=...` deep-linking from notifications.
- `/dashboard`: High-level metrics, active service requests, and transaction volumes.
- `/users`: User management interface.

# 11. State Management
- **Local State**: `useState` for UI toggles and filter states.
- **URL State**: Active conversation ID is synced to URL search parameters (`/support?id=...`).
- **Realtime State**: Subscriptions to Supabase `postgres_changes` sync remote database updates (new messages, status changes) directly to React state.
- **Caching**: Next.js App Router caching (`revalidatePath`).

# 12. Business Logic
- **Deep Link Navigation**: Clicking "View" on staff notification toasts navigates directly to `/support?id=CONVERSATION_ID`, which opens the specific customer's chat thread automatically. If no ID is in the URL, `SupportInbox` defaults to selecting the top active conversation.
- **Role-based visibility**: Messages have a `visibility` column. Internal notes are invisible to customers.
- **Targeted Notification Filtering**: Notifications carry a `target_role` (`customer`, `staff`, `all`). `useNotifications` filters out customer notifications from the admin inbox.

# 13. Important Algorithms
- **Message Deduplication**: When receiving a WebSocket payload, `if (prev.some(m => m.id === msg.id)) return prev;` prevents rendering duplicate items.
- **Toast Deduplication**: `sonner` is passed unique notification IDs to prevent duplicate toasts.

# 14. Configuration Files
- `next.config.ts`: Configured with `@ducanh2912/next-pwa` wrapper.
- `public/manifest.json`: PWA manifest with `192x192` and `512x512` maskable icons.
- `tailwind.config.ts`: Defines design tokens (colors, fonts).
- `.eslintrc.json`: Enforces code quality.

# 15. Build Process
- Executed via `npm run build` / `next build`.
- Compiles TypeScript, runs ESLint, generates PWA service workers into `public/`, and outputs to `.next`.
- Deployed on Vercel.

# 16. Third-party Services
- **Supabase**: Auth, PostgreSQL, Realtime WebSockets, Storage.
- **Vercel**: Edge network deployment and CI/CD.

# 17. Error Handling
- **Server Actions**: Wrapped in `try/catch`. Return `{ error: string }` instead of throwing.
- **UI**: Toast notifications display errors to staff.

# 18. Security
- **RLS**: Row Level Security ensures users can only access authorized data.
- **Server-side validation**: Re-verifies user identity via `supabase.auth.getUser()`.
- **Secrets**: API keys stored in Vercel environment variables.

# 19. Performance
- **PWA Caching**: Static assets and offline capabilities powered by service worker caching.
- **Non-blocking Realtime**: Realtime listeners push text payloads to the UI instantly and fetch avatars asynchronously in the background.

# 20. Reusable Utilities
- `cn()`: Utility for conditionally merging Tailwind classes.
- `supabase/server`: Helper to initialize SSR Supabase client with cookies.

# 21. Constants
- Pre-defined channel labels, emojis, statuses (`open`, `waiting_on_customer`, `resolved`, `closed`), and priorities (`low`, `normal`, `high`, `urgent`).

# 22. Types
- `ConversationData`, `MessageData`, `Notification`.

# 23. Development Workflow
- Start: `npm run dev`
- Build: `npm run build`

# 24. Known Issues
- None currently active. Realtime message syncing, deep-linking, PWA installability, and soft-delete features are verified clean.

# 25. Future Roadmap
- AI auto-summarization of tickets.
- Analytics dashboard for support agent response times.

# 26. Developer Decisions
- **Deep Link Navigation**: Using URL query parameters (`?id=...`) for conversation selection allows external links (notifications, bookmarks) to open specific chat threads immediately.
- **Soft Deletion**: Soft deleting conversations (`is_deleted = true`) preserves historical audit logs while removing deleted tickets from all active UI views.

# 27. Coding Conventions
- **Naming**: camelCase for variables, PascalCase for components, kebab-case for files.
- **Imports**: Absolute imports with `@/` alias.
- **Style**: Strict TypeScript (no `any`).

# 28. Dependencies Between Modules
- `SupportInbox` depends on `ConversationList`, `ChatPanel`, and `ConversationSidebar`. All communicate via `actions.ts`.

# 29. Critical Files
- `app/(admin)/support/actions.ts`: Core Server Actions for support hub.
- `app/(admin)/support/components/support-inbox.tsx`: Main inbox container and URL parameter sync.
- `next.config.ts`: PWA configuration.

# 30. AI Continuation Notes
- **No `any` Types**: ESLint will fail builds if `any` is used. Use specific interfaces or `unknown`.
- **URL Parameter Sync**: When creating new view triggers, prefer query parameters (`?id=...`) so navigation and notifications integrate naturally.
