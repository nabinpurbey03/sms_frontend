# 🎓 Schools Up Pro — Multi-Tenant School Management Platform (Frontend)

[![React 19](https://img.shields.io/badge/React-19.2%2B-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8%2B-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.2%2B-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0%2B-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TanStack Router](https://img.shields.io/badge/TanStack_Router-v1.0%2B-FF4154?logo=react-query&logoColor=white)](https://tanstack.com/router)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-v5.0%2B-FF4154?logo=react-query&logoColor=white)](https://tanstack.com/query)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Radix_UI-000000?logo=shadcnui&logoColor=white)](https://ui.shadcn.com)
[![Zod](https://img.shields.io/badge/Zod-3.24%2B-3E67B1?logo=zod&logoColor=white)](https://zod.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A production-grade, domain-aligned **React 19 Single Page Application (SPA)** for the **PBAC** Multi-Tenant School Management Platform. Designed with a **hybrid authorization UX engine (Strict RBAC + ReBAC + ABAC)**, multi-role active persona support, dynamic tenant isolation, mobile-first responsive architecture with stacked data cards, centralized Axios interceptors for automatic JWT refresh rotation, and a comprehensive **Super Admin Governance & Audit Trail** suite.

---

## 📑 Table of Contents

- [✨ Recent Updates](#-recent-updates)
- [✨ Features](#-features)
- [🏛 Architecture & Design Principles](#-architecture--design-principles)
  - [Layered Domain Alignment](#layered-domain-alignment)
  - [Per-Feature 5-File Slice Standard](#per-feature-5-file-slice-standard)
  - [Hybrid Authorization System (RBAC + ReBAC + ABAC)](#hybrid-authorization-system-rbac--rebac--abac)
  - ["View As" Support Sessions & Client-Side Guardrails](#view-as-support-sessions--client-side-guardrails)
  - [Multi-Role Active Persona Switching](#multi-role-active-persona-switching)
  - [Multi-Tenant Header & Path Resolution](#multi-tenant-header--path-resolution)
- [🛠 Tech Stack](#-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Running the Development Server](#running-the-development-server)
  - [Production Build & Verification](#production-build--verification)
  - [Linting & Code Quality](#linting--code-quality)
- [🛡️ Permission Matrix & Route Guards](#️-permission-matrix--route-guards)
- [📱 Mobile-First Responsive Architecture](#-mobile-first-responsive-architecture)
  - [Breakpoint Reference](#breakpoint-reference)
  - [Automatic Stacked Data Tables](#automatic-stacked-data-tables)
  - [Touch Target Compliance (WCAG 2.5.5)](#touch-target-compliance-wcag-255)
- [🔌 API Client & Network Pipeline](#-api-client--network-pipeline)
  - [Response Envelope Unwrapping](#response-envelope-unwrapping)
  - [Automatic Token Refresh Queue](#automatic-token-refresh-queue)
  - [Defense-in-Depth "View As" Interceptor Block](#defense-in-depth-view-as-interceptor-block)
  - [Typed Error Handling](#typed-error-handling)
- [🧹 Client-Side Validation Rules (Zod)](#-client-side-validation-rules-zod)
- [⚙️ Environment Configuration Reference](#️-environment-configuration-reference)
- [📄 License](#-license)

---

## ✨ Recent Updates

- **Audit Logs Governance Slice (`src/features/audit-log/`)**:
  - Full 5-file feature slice adhering strictly to project conventions (`pages/`, `components/`, `hooks.ts`, `api.ts`, `schema.ts`).
  - High-performance audit trail table using `ResponsiveDataTable` with debounced action filtering, date-from/date-to pickers, and responsive slide-out detail drawer (`AuditLogDetailDrawer`).
  - Integrated "View Audit Trail" quick-action workflow card on the Super Admin dashboard.
- **Tenant Management Lifecycle**:
  - Added suspend/reactivate toggles with confirmation dialogs across Table and Grid views.
  - Interactive 3-step School Onboarding Wizard (`TenantOnboardDialog`) provisioning new schools, primary admins, and instant invitation link generators.
- **Platform Users & Memberships**:
  - Slide-out Memberships Drawer displaying user tenant affiliations, active roles, and school assignments.
  - "View As" support session activation with explicit confirmation modals.
- **"View As" Support Sessions (Client-Side Defense in Depth)**:
  - Global Zustand session store (`viewAsStore`) managing short-lived 15-minute support tokens.
  - Top-level sticky warning banner (`ViewAsBanner`) displaying real-time countdown timer and one-click session termination.
  - Client-side write prevention: `apiClient` interceptor rejects all mutating HTTP requests (`POST`, `PUT`, `PATCH`, `DELETE` excluding `/logout`), while `usePermission` locks UI action buttons for non-read capabilities.

---

## ✨ Features

| Category | Capabilities |
|---|---|
| **Multi-Tenancy** | Automatic `X-Tenant-ID` header injection across all API requests; persistent active school selection; instant tenant switcher for users holding memberships across multiple schools. |
| **Audit Logs** | Centralized global audit stream with debounced action filtering, date range constraints, pagination, and structured forensic detail drawers. |
| **Tenant Lifecycle** | Suspend, reactivate, and edit school tenants; automated 3-step school onboarding wizard (`/tenants?action=onboard`). |
| **View As Support Sessions** | 15-minute time-boxed impersonation sessions with client-side write blocking, permission lockdown, and a persistent countdown banner. |
| **Hybrid Authorization** | **RBAC** route guards (`beforeLoad` & `usePermission`), **ReBAC** relation scoping (Teacher assignments & linked parent children), and **ABAC** UX safeguards (future attendance date lock, 7-day edit window). |
| **Multi-Role Personas** | Decoupled user identity supporting simultaneous roles within a school (e.g. Teacher who is also a Parent) with dynamic persona switching in global UI state without URL disruption. |
| **Authentication & Session** | Email/Password login with Zod validation, password show/hide toggle, "Remember Me" local storage, in-memory access token storage, and background refresh rotation via `/api/v1/auth/refresh`. |
| **Mobile-First UX** | 100% responsive across phone (`375px`), tablet (`768px`), laptop (`1024px`), and desktop (`1440px`); touch targets ≥ 44x44px; hamburger drawer navigation below `lg`. |
| **Stacked Data Tables** | Automatic dual-mode rendering: wide data tables on desktop (`md+`) gracefully collapse into rich, stacked cards on mobile (`< md`). |
| **Academic Management** | Class catalog with auto-provisioned Section A; 20-student eligibility check before sequential section expansion; single & bulk student enrollment (CSV/XLSX template download); subjects management. |
| **Attendance Tracking** | Daily section attendance checklist with batch toggle actions (Mark All Present/Absent); Class Teacher verification; date range section reports; linked child reports for parents; multi-level dashboard summary. |
| **Modern Component System** | Accessible **shadcn/ui** design tokens built on Tailwind CSS v4, Radix UI primitives, Lucide icons, and Sonner toast notifications. |

---

## 🏛 Architecture & Design Principles

The frontend directly mirrors the backend domain architecture (`identity`, `tenant`, `academic`, `attendance`, `examination`), creating a unified mental model across both repositories.

```
┌──────────────────────────────────────────────────────────────┐
│                      React Application                        │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────────┐ │
│  │ QueryClient  │  │ AuthProvider  │  │  TenantStore /     │ │
│  │  Provider    │  │  (Context)    │  │  ViewAsStore       │ │
│  │ (TanStack Q) │  │               │  │  (Zustand)         │ │
│  └──────────────┘  └───────────────┘  └────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│              Routing Layer (TanStack Router)                  │
│   ProtectedLayout → usePermission() guard → Redirect / 403   │
├──────────────────────────────────────────────────────────────┤
│                Feature Layer (Domain Slices)                  │
│  ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │  auth  │ │tenant/ │ │ academic │ │attendance│ │ audit  │ │
│  │        │ │settings│ │          │ │          │ │  -log  │ │
│  │ pages/ components/ hooks/ api.ts schema.ts  (same shape) │ │
│  └───┬────┘ └───┬────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ │
├──────┼───────────┼───────────┼────────────┼────────────┼─────┤
│      ▼           ▼           ▼            ▼            ▼     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │   Core Layer: api/ (Axios instance + Interceptors),      │ │
│  │   auth/ (AuthContext, usePermission), config/ (env,     │ │
│  │   permissions), components/ui/ (shadcn primitives)      │ │
│  └───────────────────────────┬─────────────────────────────┘ │
│                              ▼                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │   TanStack Query cache  →  Axios  →  FastAPI Backend v1   │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Layered Domain Alignment

- **Core Layer (`src/api`, `src/auth`, `src/config`, `src/components/ui`)**: Encapsulates cross-cutting concerns: Axios interceptors, JWT refresh queues, tenant headers, global permissions, and design tokens.
- **Feature Layer (`src/features/*`)**: Feature slices containing domain logic, components, data fetching, and forms.
- **State Layer (`src/stores/*`, `src/auth/*`)**: Minimal Zustand stores for UI state (`tenantStore`, `viewAsStore`, `themeStore`), while TanStack Query owns server cache.

### Per-Feature 5-File Slice Standard

Every feature slice under `src/features/` follows this standard structure:

```
src/features/<domain>/
  pages/          # Route page components (e.g. AuditLogsPage, TenantSettingsPage)
  components/     # Feature-local UI (e.g. AuditLogDetailDrawer, TenantOnboardDialog)
  hooks.ts        # TanStack Query wrappers (e.g. useAuditLogs, useTenant)
  api.ts          # Strongly typed Axios fetch functions for this domain
  schema.ts       # Zod validation schemas & inferred TypeScript types
```

---

### Hybrid Authorization System (RBAC + ReBAC + ABAC)

PBAC coordinates 3 tiers of authorization driving both UI visibility and server enforcement:

```
┌──────────────────────────────────────────────────────────┐
│  Tier 1: Tenant Boundary & Strict RBAC                   │
│  Navigation gating & route guards via permission matrix   │
└────────────────────────────┬─────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│  Tier 2: Relationship-Based Access Control (ReBAC)       │
│  - Teacher to Class/Section assignments (Class Teacher)  │
│  - Parent to Student links (My Children view)            │
└────────────────────────────┬─────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│  Tier 3: Attribute-Based Access Control (ABAC)           │
│  - Client-side future date lock on attendance picker     │
│  - Graceful handling of backend 403 edit window rules    │
│  - "View As" read-only session client-side lockdown      │
└──────────────────────────────────────────────────────────┘
```

1. **RBAC**: Evaluated client-side using `src/config/permissions.ts` and the `usePermission()` hook.
2. **ReBAC**: The frontend fetches scoped relation data from dedicated endpoints (`/academic/tenants/{id}/teachers/my-assignments` and `/academic/tenants/{id}/parents/my-children`). The UI dynamically displays Class Teacher badges or child cards based on this relation data.
3. **ABAC**: Enforced via client validation (disabling future dates in date pickers) and centralized Axios interceptors for `403 FORBIDDEN` responses.

---

### "View As" Support Sessions & Client-Side Guardrails

For troubleshooting and support, Super Admins can initiate a **15-minute read-only support session** to view the platform through the lens of a specific user:
- **Client-Side Request Interceptor**: While `viewAsStore.activeToken` is present, the Axios interceptor immediately rejects all mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`) with a 403 `ApiError`, bypassing only the logout endpoint.
- **Permission Guard**: `usePermission().can()` intercepts calls during a view session and returns `false` for any non-read action (`!permission.startsWith('VIEW_') && !permission.startsWith('READ_')`).
- **Global Countdown Banner**: `ViewAsBanner.tsx` displays remaining time with automated client-side expiry and a prominent "End Session" action.

---

### Multi-Role Active Persona Switching

Users with multiple responsibilities in a school (such as a Teacher who also has a child enrolled as a Parent) do not need separate accounts:
- Global state tracks `activeRole` (`SUPER_ADMIN`, `ADMIN`, `OFFICE_ADMIN`, `TEACHER`, `PARENT`).
- The top header provides an instant **Persona Switcher** allowing users to switch contexts seamlessly.
- Navigation links and action capabilities instantly update based on the selected persona.

---

### Multi-Tenant Header & Path Resolution

To support multi-tenancy seamlessly across all backend modules:
- The Axios client attaches the active school ID via the `X-Tenant-ID: <uuid>` header on all requests.
- Endpoints requiring tenant path parameters (e.g. `/academic/tenants/{tenant_id}/...`) interpolate `activeTenantId` directly from `useTenantStore`.

---

## 🛠 Tech Stack

| Component | Technology | Version | Purpose |
|---|---|---|---|
| **Framework** | [React](https://react.dev) | `^19.2.0` | UI Component Library |
| **Language** | [TypeScript](https://typescriptlang.org) | `~5.8.0` | Strict static typing |
| **Bundler** | [Vite](https://vitejs.dev) | `^6.2.0` | Fast dev server & optimized rollup production builds |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) | `^4.0.0` | Next-gen CSS-first utility styling |
| **Component Primitives** | [Radix UI](https://radix-ui.com) | Latest | Accessible unstyled primitives (Dialog, Dropdown, Checkbox, Label, Avatar) |
| **Routing** | [TanStack Router](https://tanstack.com/router) | `^1.160.0` | Type-safe client-side routing & route guards |
| **Server State** | [TanStack Query](https://tanstack.com/query) | `^5.69.0` | Caching, background refetching & mutation invalidation |
| **Form Validation** | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) | `^7.55.0` / `^3.24.0` | Type-safe form validation mirroring backend Pydantic schemas |
| **Data Tables** | [TanStack Table](https://tanstack.com/table) + Custom Responsive Table | `^8.21.0` | Mobile stacked card view + desktop data grid |
| **HTTP Client** | [Axios](https://axios-http.com) | `^1.8.0` | Interceptors for JWT attach, tenant header, refresh queue & View As lockdown |
| **Client State** | [Zustand](https://zustand-demo.pmnd.rs) | `^5.0.0` | Lightweight stores (`tenantStore`, `viewAsStore`, `themeStore`) |
| **Icons** | [Lucide React](https://lucide.dev) | `^0.479.0` | Clean, modern vector icons |
| **Notifications** | [Sonner](https://sonner.emilkowal.ski) | `^2.0.0` | Accessible rich toast alerts |
| **Linter** | [Oxlint](https://oxc.rs) | `^1.79.0` | High-speed Rust-based JavaScript/TypeScript linter |

---

## 📁 Project Structure

```
frontend/
├── .env                              # Local environment configuration (gitignored)
├── .env.example                      # Committed environment variables template
├── .gitignore                        # Git ignore patterns
├── .oxlintrc.json                    # Oxlint configuration
├── BACKEND_ARCHITECTURE.md           # Backend API & domain specification
├── PLAN.md                           # Master architectural build plan
├── README.md                         # Project documentation
├── index.html                        # Single-page application entrypoint
├── package.json                      # Project dependencies and npm scripts
├── tsconfig.json                     # TypeScript reference config
├── tsconfig.app.json                 # TypeScript compiler options and '@/*' alias
├── vite.config.ts                    # Vite bundler, Tailwind v4 and path aliases
└── src/
    ├── main.tsx                      # App bootstrap & DOM mount
    ├── App.tsx                       # RouterProvider and AppProviders root
    ├── index.css                     # Tailwind CSS v4 design tokens and theme variables
    ├── vite-env.d.ts                 # Ambient TypeScript declarations for Vite env
    │
    ├── api/                          # Core HTTP Client Layer
    │   ├── client.ts                 # Axios instance, Bearer attach, X-Tenant-ID & View As lockdown
    │   ├── errors.ts                 # Typed ApiError hierarchy
    │   └── types.ts                  # Universal ApiResponse<T>, TokenResponse, UserProfileDTO
    │
    ├── app/                          # Routing & Providers
    │   ├── router.tsx                # TanStack Router route tree definition
    │   ├── ProtectedLayout.tsx       # Auth route guard and session verification
    │   └── providers.tsx             # QueryClientProvider + AuthProvider wrapper
    │
    ├── auth/                         # Authentication & Permissions
    │   ├── AuthContext.tsx           # User profile, login/logout, tenant/persona switching
    │   ├── useAuth.ts                # AuthContext consumer hook
    │   └── usePermission.ts          # RBAC capability check hook (can, isRole, isAnyRole)
    │
    ├── config/                       # Configuration Modules
    │   ├── env.ts                    # Zod-validated, frozen runtime environment singleton
    │   └── permissions.ts            # Permission matrix single source of truth
    │
    ├── stores/                       # Lightweight Zustand Stores
    │   ├── tenantStore.ts            # Active tenant ID & name state
    │   ├── viewAsStore.ts            # 15-minute "View As" session store
    │   └── themeStore.ts             # Theme mode (light, dark, system) state
    │
    ├── components/                   # Shared UI Primitives & Layouts
    │   ├── layout/
    │   │   ├── AppShell.tsx          # Responsive mobile drawer + desktop sidebar layout
    │   │   ├── ViewAsBanner.tsx      # Sticky warning banner with countdown timer
    │   │   └── SchoolHeaderBadge.tsx # Tenant indicator and switcher badge
    │   ├── common/
    │   │   ├── ResponsiveDataTable.tsx # Auto dual-mode: stacked cards (<md) & table (md+)
    │   │   └── PlaceholderPage.tsx   # Scaffold placeholder for upcoming feature routes
    │   └── ui/                       # Accessible shadcn primitives
    │       ├── avatar.tsx
    │       ├── badge.tsx
    │       ├── button.tsx            # 44px mobile touch target button
    │       ├── card.tsx
    │       ├── checkbox.tsx          # 44px touch row checkbox
    │       ├── dialog.tsx            # Full-screen (<sm) and centered modal (sm+)
    │       ├── dropdown-menu.tsx
    │       ├── input.tsx             # Mobile 16px/14px anti-zoom input
    │       ├── label.tsx
    │       ├── sheet.tsx             # Drawer primitive for detail views
    │       ├── sonner.tsx            # Rich toast notifications
    │       └── table.tsx
    │
    ├── features/                     # Domain Feature Slices (5-file standard)
    │   ├── auth/                     # Authentication & Login
    │   ├── dashboard/                # Unified and Super Admin KPI Hubs
    │   ├── audit-log/                # System audit trail & detail drawers
    │   ├── tenants/                  # Tenant management & onboarding wizard
    │   ├── platform-users/           # Platform user directory & memberships
    │   ├── academic/                 # Classes, sections, subjects & teacher assignments
    │   ├── academic-year/            # Academic year management & selector
    │   ├── attendance/               # Daily attendance & reporting
    │   ├── examination/              # Exams, grading & report cards
    │   └── members/                  # School member directory & parent-student links
    │
    └── lib/
        └── utils.ts                  # cn() class merging utility (clsx + twMerge)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.11.0` or higher
- **Package Manager**: `npm` (v10+), `pnpm` (v9+), or `bun`
- **Backend**: FastAPI backend running at `http://localhost:8000` (see [BACKEND_ARCHITECTURE.md](file:///E:/PBAC/frontend/BACKEND_ARCHITECTURE.md))

### Installation

```bash
# Clone repository and enter frontend directory
cd frontend

# Install dependencies
npm install
```

### Environment Configuration

Create a local `.env` file from `.env.example`:

```bash
# Copy template
cp .env.example .env
```

Review and adjust `.env` if your backend runs on a different port or host:
```ini
VITE_API_BASE_URL=http://localhost:8000
VITE_API_VERSION=/api/v1
VITE_TENANT_HEADER_NAME=X-Tenant-ID
VITE_APP_NAME=Schools Up Pro
```

### Running the Development Server

```bash
```bash
npm run dev
```

The app will start at `http://localhost:5173` with instant Hot Module Replacement (HMR).

### Production Build & Verification

To compile the TypeScript project and bundle for production:

```bash
npm run build
```

The optimized bundle is output to the `dist/` directory.

To preview the production build locally:
```bash
npm run preview
```

### Linting & Code Quality

```bash
npm run lint
```

---

## 🛡️ Permission Matrix & Route Guards

Defined in [`src/config/permissions.ts`](file:///E:/PBAC/frontend/src/config/permissions.ts) as the single source of truth:

| Feature / Resource | `SUPER_ADMIN` | `ADMIN` (Principal) | `OFFICE_ADMIN` (Vice Principal) | `TEACHER` (Faculty) | `PARENT` (Guardian) |
|---|:---:|:---:|:---:|:---:|:---:|
| **Onboard / Create Tenant** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Suspend / Reactivate Tenant** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **View Audit Logs** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Start "View As" Session** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage Platform Users** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage School Settings / Logo** | ✅ | ✅ | 👁️ (View Only) | ❌ | ❌ |
| **Create Office Admin** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Create Teacher / Parent User** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Assign / Revoke Member Roles** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Create / Edit Classes & Subjects** | ✅ | ✅ | ✅ | 👁️ (View Only) | ❌ |
| **Create / Manage Sections & Students** | ✅ | ✅ | ✅ | 👁️ (View Only) | ❌ |
| **Assign Teachers to Classes/Sections** | ✅ | ✅ | ✅ | 👁️ (My Assignments) | ❌ |
| **Link Parents to Students** | ✅ | ✅ | ✅ | ❌ | 👁️ (My Children) |
| **Mark Section Attendance** | ✅ | ✅ | ✅ | 🔑 (Assigned Class Teacher Only) | ❌ |
| **View Section Attendance Report** | ✅ | ✅ | ✅ | 🔑 (Assigned Teacher Only) | ❌ |
| **View Individual Child Attendance** | ✅ | ✅ | ✅ | 🔑 (Student's Teacher) | 🔑 (Own Linked Child Only) |
| **Hard Delete Any Record** | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 📱 Mobile-First Responsive Architecture

### Breakpoint Reference

| Breakpoint | Target Screen | UI Adaptation |
|---|---|---|
| **`< 640px`** (`375px`) | Mobile Phone (iPhone, Android) | 1-column fluid layouts, 44px+ touch targets, hamburger drawer navigation, stacked data cards, full-screen/bottom modals. |
| **`640px` - `767px`** | Large Mobile / Phablet | 2-column KPI grids, compact header. |
| **`768px` - `1023px`** (`768px`) | Tablet (iPad Portrait) | 2-column action cards, drawer navigation, compact dropdowns. |
| **`1024px` - `1279px`** (`1024px`) | Small Laptop (iPad Landscape) | Fixed left sidebar (`w-64`), 3/4-column metrics, full desktop data tables, centered dialogs. |
| **`≥ 1280px`** (`1440px`) | Desktop / Large Monitor | Max-width layout constraint (`max-w-7xl mx-auto`), fluid whitespace, high information density. |

### Automatic Stacked Data Tables

Using [`ResponsiveDataTable`](file:///E:/PBAC/frontend/src/components/common/ResponsiveDataTable.tsx):
- **On `< 768px` (`< md`)**: Automatically renders each record as an individual stacked card with identifiers, names, status tags, and action buttons. Supports interactive row clicking with accessible chevron prompts.
- **On `≥ 768px` (`md+`)**: Automatically switches to the full desktop data table with sticky headers.

### Touch Target Compliance (WCAG 2.5.5)

- All buttons, navigation items, checkboxes, password show/hide toggles, pagination controls, and dropdown triggers enforce a minimum **44x44px touch area** on touch devices.
- Inputs enforce a minimum `16px` (`text-base`) font size on mobile devices to prevent automatic iOS Safari zooming.

---

## 🔌 API Client & Network Pipeline

Located in [`src/api/client.ts`](file:///E:/PBAC/frontend/src/api/client.ts):

### Response Envelope Unwrapping

All backend responses arrive in the standard envelope:
```json
{
  "status": true,
  "message": "Operation successful",
  "data": { ... },
  "error": null
}
```
The response interceptor automatically unwraps `data` and returns it directly to callers. If top-level pagination `meta` is present, the envelope is preserved to allow seamless paging.

### Automatic Token Refresh Queue

1. On encountering an `HTTP 401 Unauthorized` response on an active request, Axios pauses subsequent requests and places them into an in-memory queue.
2. An automatic refresh request is dispatched to `POST /api/v1/auth/refresh` using the stored refresh token.
3. Upon receiving new tokens, in-memory access tokens are updated, the authorization header is refreshed, and queued requests are replayed seamlessly.
4. If token refresh fails, tokens are cleared and the user is redirected to `/login`.

### Defense-in-Depth "View As" Interceptor Block

During active support impersonation sessions:
- Client-side Axios interceptors immediately reject any mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) with a 403 `ApiError` before network dispatch.
- Authentication endpoints like `/auth/logout` are explicitly bypassed to ensure administrators never become trapped in a support session.

### Typed Error Handling

When the backend returns an error envelope:
```json
{
  "status": false,
  "message": "Input validation failed",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [...],
    "request_id": "req-123"
  }
}
```
The client throws a strongly-typed [`ApiError`](file:///E:/PBAC/frontend/src/api/errors.ts) containing `code`, `details`, `requestId`, and `statusCode`.

---

## 🧹 Client-Side Validation Rules (Zod)

Client validation rules match the backend Pydantic sanitization layer:

| Field | Zod Validation Rule | Sanitization |
|---|---|---|
| **Email** | Valid email format required | Trimmed & lowercased |
| **Password** | Min 8 chars (registration), requires uppercase, lowercase, digit, and special char | Whitespace preserved |
| **Phone** | 10-digit Nepali mobile: `^(98\|97)\d{8}$` | Trimmed & spaces removed |
| **Domain Name** | Alphanumeric & hyphens: `^[a-z0-9-]+$` | Lowercased & trimmed |
| **Names** | Required 1-50 chars | Leading/trailing whitespace stripped |
| **Subject Codes** | Max 50 chars | Trimmed & converted to uppercase |
| **Attendance Date** | Cannot be a future date | ISO `YYYY-MM-DD` |
| **Bulk File Upload** | Must be `.csv` or `.xlsx` | Max file size ≤ 5 MB, max 1,000 rows |
| **Logo Upload** | Valid image format | Max file size ≤ 2 MB |

---

## ⚙️ Environment Configuration Reference

All frontend configuration is managed through environment variables loaded and validated at startup via [`src/config/env.ts`](file:///E:/PBAC/frontend/src/config/env.ts).

| Variable | Type | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | `string` (URL) | `http://localhost:8000` | Base URL of the backend API server |
| `VITE_API_VERSION` | `string` (Path) | `/api/v1` | API version route prefix |
| `VITE_TENANT_HEADER_NAME` | `string` | `X-Tenant-ID` | Header name attached to requests for active tenant scoping |
| `VITE_APP_NAME` | `string` | `Schools Up Pro` | Application display name |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ for <b>Schools Up Pro</b> — Multi-Tenant School Management Platform
</p>
