# CONTEXT.md - Converto Global Unified Platform

This document serves as the complete long-term memory for the Converto Global project, encompassing both the Customer Portal (`Converto_UserSide`) and the Admin ERP (`Converto_ServerSide`). 

---

## 1. Project Overview
- **Purpose**: A comprehensive fintech and service-fulfillment platform that allows users to request various financial and lifestyle services (Exchange, Flight Tickets, Medical Appointments, Buy For Me) and track their progress, while providing admins a powerful ERP to manage these requests via a dynamic pipeline.
- **Business Goal**: Streamline international payments, service brokerage, and customer support into a single, automated, transparent portal.
- **Problem Being Solved**: Traditional brokerage and concierge services are opaque and manually intensive. Converto automates workflows, ensures SLA compliance, and provides real-time customer transparency.
- **Target Users**: 
  - *End Users*: International customers needing concierge services, ticketing, and currency exchange.
  - *Admins/Staff*: Customer support, financial operators, and super admins managing the fulfillment pipeline.
- **Current Development Status**: Phase 4 of the Workflow Engine Migration is complete. Both customer tracking and admin kanban pipelines are fully operational.

---

## 2. Architecture
The architecture is split into two separate Next.js 15 App Router applications sharing a single Supabase backend.
- **Frontend (Converto_UserSide)**: Next.js 15 App router. Handles customer onboarding, wallet management, and service request tracking.
- **Backend/Admin (Converto_ServerSide)**: Next.js 15 App router. Acts as a secure ERP for internal staff to process requests. Server Actions are heavily utilized for mutations.
- **Database**: PostgreSQL hosted on Supabase.
- **Storage**: Supabase Storage (used for document uploads, identity verification).
- **Authentication**: Supabase Auth (Email/Password & OTP).
- **APIs**: Entirely serverless via Next.js Server Actions and Supabase RPCs/PostgREST.
- **Deployment & Hosting**: Deployed on Vercel (Edge network).
- **Data Flow**: User submits request -> Next.js Server Action writes to Supabase `service_requests` -> Workflow Engine (`lib/workflow-engine.ts`) evaluates rules/events -> Admin views via Kanban UI -> Admin updates status -> Workflow Engine evaluates rules (auto-generates tasks/SLAs) -> Customer sees updated status on UserSide.

---

## 3. Folder Structure
Both repositories follow a similar Next.js App Router structure:
- `app/`: Contains all route segments. 
  - `(admin)/` or `(auth)/`: Route groups to share layouts without affecting URL paths.
  - `api/`: REST endpoints (mostly webhooks, as internal logic uses Server Actions).
- `components/`: Reusable UI components.
  - `ui/`: Base generic components (buttons, inputs, skeletons) built with Tailwind.
  - `admin/` or `customer/`: Domain-specific components (e.g., Kanban boards, quote generators).
- `lib/`: Core utilities and business logic.
  - `supabase/`: Client and Server initialization for Supabase SSR.
  - `workflow-engine.ts`: The central automation evaluator.
  - `rbac.ts`: Role-based access control functions.
- `hooks/`: React custom hooks (e.g., `useServiceRequests`, `useWalletTransactions`) for client-side data fetching.
- `types/`: TypeScript definitions, notably `database.ts` (Supabase schema types).

---

## 4. Technologies
- **Next.js 15 (App Router)**: Framework for React. Used for SSR, Server Actions, and routing.
- **React 19**: UI library.
- **Tailwind CSS v3**: Utility-first styling. Used extensively for the Brutalist design system.
- **Supabase (PostgreSQL)**: BaaS for Database, Auth, Storage, and Realtime.
- **@supabase/ssr**: For secure cookie-based auth in Next.js Server Components.
- **Lucide React**: Iconography.
- **React Hot Toast**: Toast notifications.

---

## 5. Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: The URL of the Supabase project. Required for both client and server Supabase clients.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The anonymous API key for Supabase. Safe to expose to the browser.
- `SUPABASE_SERVICE_ROLE_KEY`: (ServerSide only) Used for bypassing RLS in background jobs, webhooks, or the workflow engine. Never exposed to the client.

---

## 6. Database
Key Tables:
- `profiles`: Extends Supabase auth.users. Columns: `id`, `email`, `full_name`, `role` (Customer, Admin, Super Admin).
- `wallets`: User balances. Columns: `id`, `profile_id`, `balance`, `currency`.
- `wallet_transactions`: Ledger of credits/debits.
- `services`: Defines available services (Flight, Exchange, etc).
- `pipeline_stages`: High-level stages of fulfillment (e.g., Intake, Processing, Completed).
- `pipeline_statuses`: Granular statuses under a stage (e.g., "Awaiting Payment", "Quote Sent"). Has `customer_visible` and `requires_customer_action` flags.
- `service_requests`: The central entity. Columns: `id`, `profile_id`, `service_id`, `pipeline_stage_id`, `pipeline_status_id`, `metadata` (JSONB), `sla_deadline`.
- `workflow_rules`: Defines conditions and actions (e.g., `move_status`, `create_tasks`) evaluated by the engine.
- `workflow_events`: Webhooks/Notifications triggered by status changes.
- `workflow_templates` & `workflow_template_tasks`: Standardized checklists auto-generated for specific services.
- `request_tasks`, `request_flags`, `request_workflow_history`: Sub-entities linked to a `service_request` for tracking checklists, priority flags, and immutable audit logs.

---

## 7. Authentication Flow
- **Provider**: Supabase Auth.
- **Session Management**: Cookie-based via `@supabase/ssr` middleware (`middleware.ts`).
- **Middleware**: Intercepts requests. If a user is not logged in, redirects to `/login`. If an admin tries to access a super-admin route, denies access.
- **Authorization**: `lib/rbac.ts` provides `requireStaffRole(['Admin', 'Super Admin'])` which verifies the user's `role` from the `profiles` table before executing Server Actions or rendering Server Components.

---

## 8. API Documentation
Most data fetching and mutation is done via **Server Actions** rather than traditional REST APIs.
- **`updateRequestStatus(id, new_status_id)`**: Server Action in Admin portal. Updates `service_requests`, logs to `request_workflow_history`, and invokes `evaluateWorkflowRules()` and `evaluateWorkflowEvents()`.
- **`submitServiceRequest(payload)`**: Server Action in User portal. Creates a new row in `service_requests` and sets initial pipeline status.

---

## 9. Components
- **`Pipeline Board (kanban-board.tsx)`**: Renders horizontal stage filters and vertical request cards. Draggable/clickable interface for admins.
- **`OrderTimeline`**: Renders the visual progression of a request.
- **`RequestTasks`**: A checklist component for admins to tick off auto-generated template tasks.
- **`WorkflowsTab`**: Admin settings UI to configure Pipeline Stages and Statuses.

---

## 10. Pages
- **UserSide `/track`**: Displays the active status of user requests. Masks non-customer-visible statuses as "Processing".
- **UserSide `/history`**: Merges `wallet_transactions` and `service_requests` into a unified activity feed.
- **ServerSide `/requests`**: The Kanban dashboard for admins.
- **ServerSide `/requests/[id]`**: Deep-dive into a request. Contains metadata forms, task lists, flags, and the pipeline progression action panel.
- **ServerSide `/settings`**: Super Admin configuration (General, Security, AI, Workflows).

---

## 11. State Management
- **Global State**: Supabase Database serves as the single source of truth.
- **Local State**: React `useState` and `useMemo` for filtering/sorting (e.g., search bars, Kanban filtering).
- **Caching**: Next.js App Router Data Cache is used. Revalidation is triggered via `revalidatePath('/requests')` inside Server Actions after mutations.

---

## 12. Business Logic
- **Status Masking**: If a pipeline status is marked `customer_visible: false`, the customer portal MUST render it as "Processing" (or just the Stage Name) to hide internal operations.
- **Automation Engine**: When a request status changes, the system checks `workflow_rules`. If a rule matches the new status, it executes the action (e.g., updating SLA deadlines, auto-transitioning, or copying `workflow_template_tasks` into `request_tasks`).
- **Brutalist Design**: UI must adhere to thick borders (`border-2 border-black`), sharp corners (`rounded-none`), heavy typography (`font-black uppercase`), and high contrast colors.

---

## 13. Important Algorithms
- **Workflow Evaluator (`lib/workflow-engine.ts`)**:
  - *Input*: `requestId`, `newStatusId`
  - *Logic*: Queries `workflow_rules` where `current_status_id = newStatusId`. Iterates rules. If condition passes, executes `action_type`. If `action_type === 'create_tasks'`, fetches `workflow_templates` for the service and inserts `request_tasks`.
  - *Edge Cases*: Prevents infinite loops by breaking after a `move_status` auto-transition.

---

## 14. Design System & Thematic Guidelines (STRICTLY ENFORCED)
**Crucial Context for AI Assistants**: The Converto platform uses a **Brutalist UI Design System**. You MUST NOT attempt to "modernize", "soften", or change this theme to standard SaaS designs (like Tailwind's default rounded styles, soft shadows, or generic corporate aesthetics). 
- **Borders**: Elements MUST have thick, hard borders (e.g., `border-2 border-black` or `border-4 border-black`).
- **Shadows**: Use hard, unblurred drop shadows to create a retro/brutalist 3D effect (e.g., `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`). Do NOT use standard `shadow-md` or `shadow-lg` which blur the shadow.
- **Corners**: Everything MUST have sharp edges. Use `rounded-none`. Do NOT use `rounded-md` or `rounded-lg`.
- **Typography**: Heavily utilize bold, uppercase fonts for headers and important text (`font-black uppercase tracking-widest`).
- **Colors**: Use high-contrast colors (stark blacks, stark whites, and vibrant pop colors like bright pink/magenta `#FF90E8`, bright yellow). Avoid soft pastels.
- **Micro-interactions**: Buttons should depress mechanically on click (e.g., `active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`).
If you add new UI components, you MUST conform exactly to this brutalist design language.

---

## 15. Configuration Files
- `tailwind.config.ts`: Defines the Brutalist theme (colors, fonts).
- `next.config.mjs`: Next.js config.
- `middleware.ts`: Secures routes via Supabase SSR.
- `components.json`: Shadcn UI config (used as a base, but heavily modified for Brutalism).

---

## 15. Build Process
- Standard Next.js build: `npm run build` runs `next build`.
- Outputs optimized static HTML and Serverless Functions for dynamic routes.
- Deployed seamlessly to Vercel via Git integration.

---

## 16. Third-party Services
- **Supabase**: Core backend infrastructure.
- **Vercel**: Edge hosting and CI/CD.
- *(Planned)*: Stripe/Crypto gateways for Wallet funding.
- *(Planned)*: WhatsApp Business API / SendGrid for `workflow_events`.

---

## 17. Error Handling
- **Frontend**: React Error Boundaries (`error.tsx` in Next.js).
- **Server Actions**: Try/Catch blocks returning `{ error: string }` which are surfaced to the user via `react-hot-toast`.
- **Database**: Supabase RLS policies block unauthorized reads/writes at the Postgres level.

---

## 18. Security
- **RLS (Row Level Security)**: Postgres policies ensure users can only `SELECT` their own `service_requests`, `wallets`, and `request_tasks`.
- **RBAC**: `requireStaffRole` ensures only designated admins can access `/requests` or `/settings`.
- **Validation**: Server Actions validate payloads before inserting into the DB.

---

## 19. Performance
- **Server Components**: Used by default to reduce JS bundle size.
- **Next.js Caching**: Pages are cached and only invalidated via `revalidatePath` when a mutation occurs.
- **Image Optimization**: Next.js `<Image>` component used for avatars and document previews.

---

## 20. Reusable Utilities
- `lib/utils.ts`: Contains `cn()` (clsx + tailwind-merge) for dynamic class names.
- `hooks/useServiceRequests.ts`: Custom hook to fetch and subscribe to user requests.

---

## 21. Constants
- Predefined Service Slugs: `exchange`, `buy_for_me`, `ticket`, `education`, `global_payments`, `medical`. Used for conditional rendering of specific quote/metadata UI components.

---

## 22. Types
- `ServiceRequest`: The core interface representing a user's request.
- `ExtendedRequest`: Used in the customer portal to properly type the joined `status_obj` and `stage` relations.
- `PipelineStage` / `PipelineStatus`: Types defining the state machine.

---

## 23. Development Workflow
- `npm run dev` starts the local Next.js server.
- Database changes are managed via Supabase SQL Editor or local migrations.
- **Debugging**: Server Action logs appear in the terminal, client logs in the browser console.

---

## 24. Known Issues & TODOs
- **Workflow Evaluator Conditions**: Currently, `condition_expression` parsing is simplistic. Needs a robust parser (like JSONata or Jexl) for complex logical evaluations.
- **Webhooks**: `evaluateWorkflowEvents` currently just logs history. Needs actual integration with Email/SMS providers.
- **Drag-and-Drop**: The Pipeline Admin UI is currently click-based; react-beautiful-dnd or dnd-kit should be fully wired up for dragging request cards between columns.

---

## 25. Future Roadmap
- Implementation of external API integrations for automated flight bookings and FX rates.
- Deep AI integration for "Smart Categorization" and "Automated Smart Quotes" (flags exist in settings).
- Advanced Analytics dashboard tracking SLA breaches and agent performance.

---

## 26. Developer Decisions
- **Why Server Actions over API Routes?** Reduces boilerplate, provides end-to-end type safety, and integrates perfectly with Next.js App Router caching (`revalidatePath`).
- **Why a Dynamic Pipeline instead of Hardcoded Statuses?** Converto handles wildly different services (Medical Tourism vs. Flight Tickets). A hardcoded status enum would break. The `pipeline_stages` architecture allows service-specific workflows.
- **Why Brutalist UI?** To stand out in the fintech space. It conveys robustness, transparency, and raw utility.

---

## 27. Coding Conventions
- **Naming**: `camelCase` for variables/functions, `kebab-case` for file names (e.g., `kanban-board.tsx`), `PascalCase` for React components.
- **Imports**: Absolute imports using `@/` alias.
- **Styling**: Tailwind utility classes directly in the `className` prop, utilizing `cn()` for dynamic merging.
- **Architecture**: Keep data fetching as close to the component as possible (Server Components preferred).

---

## 28. Dependencies Between Modules
- The Customer Portal (`Converto_UserSide`) relies strictly on the database schema defined and managed by the Admin ERP (`Converto_ServerSide`). 
- Changing `pipeline_statuses` in the Admin settings instantly updates the tracked statuses in the User portal.

---

## 29. Critical Files
- `lib/workflow-engine.ts`: The brain of the automation system. Do not modify without thorough testing.
- `app/(admin)/requests/[id]/page.tsx`: The heart of request processing for admins.
- `middleware.ts`: Secures both applications.
- `scratch/workflow_engine_migration.sql`: Contains the foundational schema for the state machine.

---

## 30. AI Continuation Notes
**Instructions for Future AI Assistants:**
- **Current Architecture**: We are using Next.js 15 App Router with Supabase. You are operating in a monorepo-like environment with two distinct folders: `Converto_UserSide` and `Converto_ServerSide`.
- **Important Invariants**: 
  1. NEVER expose `customer_visible = false` statuses to the user. Always fall back to "Processing" or the Stage name.
  2. **CRITICAL: STRICT DESIGN THEME MAINTENANCE**: Maintain the Brutalist design language AT ALL TIMES (`border-2 border-black font-black uppercase rounded-none`). Avoid generic rounded, soft UI elements. Never implement Tailwind defaults like `rounded-md`, `shadow-md`. The purpose of this `CONTEXT.md` is to ensure you remember not to break the core brutalist aesthetics and the established architecture when fulfilling future feature requests.
- **Expected Coding Style**: Prioritize Server Components. Use Server Actions for mutations. Use `revalidatePath` to update UI post-mutation.
- **How to Refactor**: Ensure Supabase database types (`types/database.ts`) remain in sync if you alter schemas. 
- **Hidden Relationships**: The `metadata` JSONB column in `service_requests` is highly polymorphic. Its shape depends entirely on the `service_id`/`service_slug`. Always check the slug before accessing metadata properties.
- **Next Steps**: When resuming, you will likely be expanding `lib/workflow-engine.ts` to execute real HTTP webhooks, or building out the AI smart quoting features toggled in the settings page.
