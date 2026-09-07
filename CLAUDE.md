# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository.

## Project Overview

**Schools Up Pro** is a Multi-Tenant School Management Platform frontend application. It's a production-grade React 19 Single Page Application with hybrid authorization (RBAC + ReBAC + ABAC), multi-role persona switching, dynamic tenant isolation, and mobile-first responsive architecture.

## 🚀 Getting Started

### Development Commands

```bash
# Start development server with HMR
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint all code
npm run lint

# Type checking
npx tsc -b
```

### Prerequisites

- Node.js v20.11.0 or higher
- Package Manager: npm (v10+), pnpm (v9+), or bun
- Backend: FastAPI backend running at `http://localhost:8000`

### Installation

```bash
cd frontend
npm install
```

### Environment Configuration

Copy `.env.example` to `.env` and adjust variables:
```ini
VITE_API_BASE_URL=http://localhost:8000
VITE_API_VERSION=/api/v1
VITE_TENANT_HEADER_NAME=X-Tenant-ID
VITE_APP_NAME=Schools Up Pro
```

## 🏛 Architecture & Design Principles

### Layered Domain Alignment

The frontend mirrors the backend domain architecture (`identity`, `tenant`, `academic`, `attendance`, `finance`), creating unified mental models across repositories.

**Core Layer** (`src/api`, `src/auth`, `src/config`, `src/components/ui`):
- Cross-cutting concerns: Axios interceptors, JWT refresh queues, tenant headers, global permissions
- Shared utilities and shared UI primitives (shadcn/ui)

**Feature Layer** (`src/features/*`):
- Domain logic in 5-file slices: `pages/`, `components/`, `hooks/`, `api.ts`, `schema.ts`
- Each feature slice is self-contained following the Per-Feature 5-File Slice Standard

**State Layer** (`src/stores/`, `src/auth/`):
- Minimal Zustand stores for UI state (`tenantStore`, `personaStore`)
- TanStack Query owns server cache

### Per-Feature 5-File Slice Standard

Every feature under `src/features/` follows:
```
src/features/<domain>/
  pages/          # Route page components
  components/     # Feature-local UI components
  hooks/          # TanStack Query wrappers (useX, useCreateX)
  api.ts          # Strongly typed Axios fetch functions
  schema.ts       # Zod validation schemas & inferred TypeScript types
```

### Hybrid Authorization System (RBAC + ReBAC + ABAC)

**Tier 1: Tenant Boundary & Strict RBAC**
- Navigation gating & route guards via `usePermission()` hook
- Defined in `src/config/permissions.ts`

**Tier 2: Relationship-Based Access Control (ReBAC)**
- Teacher to Class/Section assignments
- Parent to Student links
- Frontend fetches scoped relation data from dedicated endpoints

**Tier 3: Attribute-Based Access Control (ABAC)**
- Client-side future date lock on attendance picker
- Graceful handling of backend 403 edit window rules

## 📱 Mobile-First Responsive Architecture

### Breakpoint Reference

| Breakpoint | Target Screen | UI Adaptation |
|------------|---------------|---------------|
| `< 640px` (`375px`) | Mobile Phone | 1-column fluid layouts, 44px+ touch targets, hamburger drawer, stacked cards |
| `640px` - `767px` | Large Mobile | 2-column KPI grids, compact header |
| `768px` - `1023px` (`768px`) | Tablet (iPad) | 2-column action cards, drawer navigation |
| `1024px` - `1279px` (`1024px`) | Small Laptop | Fixed left sidebar, 3/4-column metrics |
| `≥ 1280px` (`1440px`) | Desktop | Max-width layout constraint (`max-w-7xl mx-auto`) |

### Touch Target Compliance

All interactive elements enforce **44x44px minimum touch area** (WCAG 2.5.5).
Inputs enforce minimum `16px` font size to prevent iOS Safari auto-zoom.

## 🔌 API Client & Network Pipeline

### Response Envelope Unwrapping

All responses use standard envelope format:
```json
{
  "status": true,
  "message": "Operation successful",
  "data": { ... },
  "error": null
}
```

The response interceptor automatically unwraps `data` and returns it directly.

### Automatic Token Refresh Queue

1. HTTP 401 triggers refresh queue
2. Background refresh to `POST /api/v1/auth/refresh`
3. Update tokens and replay queued requests
4. Clear tokens and redirect to `/login` on failure

### Typed Error Handling

Errors throw strongly-typed `ApiError` containing:
- `code`: Error code
- `details`: Additional error information
- `requestId`: Request identifier
- `statusCode`: HTTP status

## 🧹 Client-Side Validation Rules (Zod)

Matches backend Pydantic validation:
- **Email**: Valid format, trimmed & lowercased
- **Password**: Min 8 chars with uppercase, lowercase, digit, special char
- **Phone**: 10-digit Nepali mobile regex `^(98|97)\d{8}$`
- **Attendance Date**: Cannot be future date
- **File Upload**: Max 5MB, 1000 rows for CSV/XLSX

## ⚙️ Technology Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Framework | React | ^19.2.0 | UI Component Library |
| Language | TypeScript | ~5.8.0 | Strict static typing |
| Bundler | Vite | ^8.2.0 | Fast dev server & optimized builds |
| Styling | Tailwind CSS v4 | ^4.3.3 | CSS-first utility styling |
| Routing | TanStack Router | ^1.160.0 | Type-safe client-side routing |
| Server State | TanStack Query | ^5.69.0 | Caching, background refetching |
| HTTP Client | Axios | ^1.8.0 | Interceptors for JWT & tenant headers |
| State Mgmt | Zustand | ^5.0.0 | Minimal persisted stores |
| Validation | Zod | ^4.5.4 | Type-safe form validation |

## 🔧 Development Tools

### Linting & Code Quality

```bash
npm run lint
```
Uses **Oxlint** (Rust-based high-speed TypeScript linter) with React, TypeScript, and Oxc plugins.

### TypeScript Configuration

- `tsconfig.json`: Project references to `tsconfig.app.json` and `tsconfig.node.json`
- `tsconfig.app.json`: Compiler options optimized for Vite bundling
- Path alias: `@/*` maps to `./src/*`

### Environment Configuration

All frontend configuration is managed via environment variables loaded and validated at startup by `src/config/env.ts`.

## 🛡️ Configuration Files

- `.env.example`: Committed environment variables template
- `.env`: Local environment configuration (gitignored)
- `.oxlintrc.json`: Oxlint configuration with React and TypeScript rules
- `package.json`: Dependencies and npm scripts
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`: TypeScript configuration
- `vite.config.ts`: Vite bundler with Tailwind v4 and path aliases

## 📁 Key Files to Understand

### Core Files

1. **`src/main.tsx`**: App bootstrap - minimal entry point
2. **`src/App.tsx`**: Root component with providers and router
3. **`src/api/client.ts`**: Complete Axios setup with interceptors and refresh logic
4. **`src/config/env.ts`**: Environment validation and configuration
5. **`src/auth/AuthContext.tsx`**: Complete auth state management with tenant/persona switching
6. **`src/app/router.tsx`**: Type-safe route tree with TanStack Router
7. **`src/config/permissions.ts`**: Single source of truth for RBAC
8. **`src/stores/tenantStore.ts`**: Tenant isolation management

### Feature Slice Pattern

Each feature follows the same pattern:
- **API Layer**: Type-safe HTTP methods in `api.ts`
- **Validation**: Zod schemas in `schema.ts`
- **Hooks**: TanStack Query wrappers in `hooks.ts`
- **Components**: UI logic in `components/`
- **Pages**: Route components in `pages/`

### Component System

- **Shared UI**: `src/components/ui/` - accessible shadcn primitives
- **Layout**: `src/components/layout/` - responsive AppShell
- **Common**: `src/components/common/` - responsive tables, placeholders

## 🔍 Common Search Patterns

When exploring the codebase, use these patterns:

**Feature Exploration:**
- `src/features/*/api.ts` - List all domains (academic, members, tenants, dashboard, auth)
- `src/features/*/hooks.ts` - Query patterns for each domain
- `src/features/*/pages/` - Route components

**Component Usage:**
- `src/components/ui/*.tsx` - Available primitives
- `src/components/common/ResponsiveDataTable.tsx` - Mobile-responsive table pattern
- `src/components/layout/AppShell.tsx` - Layout structure

**State Management:**
- `src/stores/tenantStore.ts` - Tenant isolation logic
- `src/stores/personaStore.ts` - Persona switching
- `src/auth/AuthContext.tsx` - Complete auth flow

## 📝 Development Workflow

1. **Authentication**: Use `useAuth()` hook for user state, `usePermission()` for RBAC
2. **API Calls**: Use feature-specific `api.ts` functions - they handle token refresh
3. **Forms**: Validate with Zod schemas from feature `schema.ts`
4. **Queries**: Wrap TanStack Query with feature `hooks.ts`
5. **Mobile**: Components auto-adapt based on breakpoints (`md` threshold)
6. **State**: Use Zustand stores for UI state (tenant, persona)
7. **Routing**: TanStack Router handles route guards and navigation
8. **Linting**: Run `npm run lint` regularly for code quality
9. **Build**: Run `npm run build` for production

## 🔄 Multi-Tenant Flow

1. **Login**: `/api/v1/auth/login` → store tokens
2. **Profile Load**: `/api/v1/auth/me` → get user memberships
3. **Tenant Select**: `switchTenant()` updates store and injects `X-Tenant-ID` header
4. **Persona Switch**: `switchPersona()` changes active role without URL change
5. **Request Header**: Axios interceptor auto-adds tenant header to all requests
6. **Token Refresh**: Background refresh when access token expires

This codebase emphasizes **domain alignment**, **type safety**, **mobile-first design**, and **separation of concerns**. Each feature slice is independent yet follows consistent patterns, making it easy to add new domains or understand existing functionality.
