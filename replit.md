# CondoOS — Gestão Condominial

Multi-tenant SaaS for Brazilian condominium management. Frontend in pt-BR.

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 19 + Vite, TanStack Query, wouter routing, shadcn/ui, Recharts, sonner toasts, react-hook-form + zod
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (Neon serverless)
- **Auth**: JWT (jsonwebtoken) signed with `SESSION_SECRET`, stored in `localStorage` as `condo_token`. Bearer auth via custom-fetch interceptor.
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle for api-server)

## Architecture

### Multi-tenancy
Every entity carries a `condominiumId` FK. JWT claims include `userId`, `condominiumId`, `email`. The `requireAuth` middleware (in `artifacts/api-server/src/lib/auth.ts`) parses the bearer token and exposes `req.auth`. Every route filters by `req.auth.condominiumId` so tenants can never see each other's data.

### Modules (13)
Residents, Units, Charges (with Payments), Notices, Issues, Deliveries, Vehicles, Reservations, Documents, Service Orders, Suppliers, Contracts, Events. Plus Users, Roles (RBAC with permission keys), Activity Log, Settings, Dashboard.

### Dashboard (Premium)
- **Period filter**: Mês / 3 meses / Ano — drives chart windowing.
- **KPI cards** with icons, contextual colors, deltas vs previous month, Info tooltips, drill-down via wouter `Link`. Computed cards include occupation% (from residents/units) and expiring contracts (next 60 days).
- **Charts** (Recharts): Cashflow area, Income vs Expense bars, Financial Pressure line (deficit %), Forecast line (linear regression for next 3 months).
- **Smart widgets**: Health score with progress bar + status (🟢🟡🔴), Top 5 inadimplência with bar visualization, automatic Insights panel (`insights.ts` derives critical/warning/info/positive items from cashflow + delinquency + issues + contracts).
- **Operational widgets**: Notices, Open Issues, Pending Deliveries, Upcoming Reservations, Recent Activity feed.
- **Smart alerts**: severity-coded (crítico/atenção/info), auto-sorted by priority, click to drill down to relevant page.
- **Layout customization**: drag-and-drop reorder via `@dnd-kit`, show/hide via dropdown menu, persisted in `localStorage` under `condo_dashboard_layout_v1`.
- **Auto-refresh**: TanStack Query `refetchInterval: 60s`, manual refresh button, "última atualização" tooltip showing relative time.
- **Performance**: heavy widgets are `React.lazy` + `Suspense`, queries share staleTime, KPI cards memoized.
- **Code structure**: `src/components/dashboard/{types,format,insights,period-filter,customize-menu,sortable-widget}.tsx` + `src/components/dashboard/widgets/*.tsx` for each card/chart. Layout state in `src/hooks/use-dashboard-layout.ts`.

### Sidebar (Collapsible)
- Mini-variant: `w-64` ↔ `w-16` toggle persisted in `localStorage` (`condo_sidebar_collapsed_v1`).
- When collapsed: only icons; tooltips on hover via Radix Tooltip; user avatar and Sair button collapse to icons.
- Mobile: drawer (sheet-like) with overlay.
- Active item gets background + small dot indicator; smooth `transition-all duration-300`.
- Code: `src/components/layout/app-shell.tsx` + `src/components/layout/sidebar-item.tsx` + `src/hooks/use-sidebar-collapsed.ts`.

### Charges & Payments
- Charges marked `overdue` dynamically in list endpoints when `status=pending && dueDate < now`.
- Pay endpoint creates a Payment record and sets the charge to `paid` with `paidAt`.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

### Seeding
The seed script populates two condominiums with units, residents, charges, payments, vehicles, suppliers, contracts, deliveries, reservations, documents, service orders, notices, issues and events.

```bash
cd artifacts/api-server
npx esbuild src/seed.ts --bundle --platform=node --format=esm --outfile=dist/seed.mjs --external:pg-native --external:bcrypt --banner:js="import { createRequire as __cr } from 'node:module'; import __p from 'node:path'; import __u from 'node:url'; globalThis.require = __cr(import.meta.url); globalThis.__filename = __u.fileURLToPath(import.meta.url); globalThis.__dirname = __p.dirname(globalThis.__filename);"
node --enable-source-maps dist/seed.mjs
```

The seed is idempotent — it skips if the admin email already exists.

### Demo accounts (seeded)
- **admin@vistaverde.com.br** / `condoos2026` — Residencial Vista Verde (24 units, full sample data)
- **admin@aurora.com.br** / `condoos2026` — Edifício Aurora (24 units, full sample data)

## Project Structure

- `artifacts/condo-saas` — React frontend (port 20078, mounted at `/`)
- `artifacts/api-server` — Express API (port 8080, mounted at `/api`)
- `lib/db` — Drizzle schema (one file per entity in `src/schema/`) and DB client
- `lib/api-spec` — OpenAPI spec source of truth (`openapi.yaml`)
- `lib/api-client-react` — generated TanStack Query hooks + custom-fetch wrapper
- `lib/api-zod` — generated Zod request schemas (used both client and server)

## Stack-specific notes

- The `custom-fetch` wrapper at `lib/api-client-react/src/custom-fetch.ts` reads the bearer token from `localStorage["condo_token"]` automatically and attaches it to every request. `setBaseUrl()` and `setAuthTokenGetter()` are exposed for Expo/React Native bundles.
- The frontend AuthContext (`artifacts/condo-saas/src/contexts/auth-context.tsx`) auto-redirects to `/login` on auth errors and stores `{ user, condominium, permissions }` in TanStack Query cache.
- Currency stored in PG as `numeric(14,2)` strings; converted to numbers via the `n()` helper in `artifacts/api-server/src/lib/serialize.ts`.
- All Express 5 async handlers explicitly return `Promise<void>` because Express 5 enforces stricter typing.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
