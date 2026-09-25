# 360° Analytics School Logo Visibility & Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve why the Super Admin cannot view school logos in 360° Analytics (`/tenants/$tenantId`), fix component state lockups, ensure robust URL resolution, and provide a dedicated full-scale School Logo Viewer (Lightbox) and upload workflow.

**Architecture:** 
1. Fix the permanent `imgError` state lockout in `TenantLogoAvatar` via prop-driven synchronization.
2. Enhance `getMediaUrl` to leverage same-origin `/uploads` Vite & Nginx reverse proxies, eliminating cross-origin/IPv6 preflight issues.
3. Implement a dedicated `TenantLogoViewerDialog` in 360° Analytics and separate "View Logo" from "Upload Logo" actions for clear UX.
4. Add graceful fallbacks and error handling in `TenantLogoDialog`.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, Radix UI Dialog, Tailwind CSS v4, Lucide Icons.

---

## 🔍 Root Cause Analysis (Why the logo cannot be viewed)

Our code inspection and database forensics revealed **5 specific reasons** contributing to this issue:

### 1. Permanent `imgError` State Lockout in `TenantLogoAvatar`
- When `imgError` is set to `true` (e.g. from an initial un-cached load, 404, or network glitch), it **never resets**.
- Even after a new logo is uploaded and `analytics` is refetched with a new URL, `imgError` remains `true` because there is no `useEffect` resetting it when `logoUrl` changes.

### 2. Schools with `null` or Non-Existent File References
- Database forensics reveal that most schools in the database currently have `logo_url: None` because the onboarding form does not have a logo upload field.
- Several test schools have dangling paths (e.g. `/uploads/logos/apex_logo_44eec8.png`) where the DB record exists but the physical file is not on disk in `E:\uploads\logos`, returning `404 Not Found`.

### 3. Cross-Origin / Dev Proxy Bypass in `getMediaUrl`
- `vite.config.ts` and production `nginx.conf` both define a reverse proxy for `/uploads`:
  ```ts
  proxy: { '/uploads': { target: 'http://localhost:8000' } }
  ```
- However, `getMediaUrl` in `src/lib/utils.ts` forcibly prepends `ENV.API_BASE_URL` (`http://127.0.0.1:8000`).
- Because Vite runs on `http://localhost:5173` (IPv6 `[::1]`) while the backend runs on IPv4 `127.0.0.1:8000`, the browser makes cross-origin requests directly to the backend. If the browser sends an `OPTIONS` preflight, FastAPI's `StaticFiles` returns `405 Method Not Allowed`, failing the image load.
- When accessed through the same-origin Vite proxy `/uploads/...`, the image returns `200 OK` instantly with zero CORS or preflight issues.

### 4. UX Gap: No "View Logo" Capability in 360° Analytics
- In 360° Analytics (`TenantAnalyticsPage.tsx`), clicking the school logo avatar or the header button opens `TenantLogoDialog`.
- `TenantLogoDialog` is strictly an **upload/file replacement** dialog titled *"Update Brand Logo"*.
- If the Super Admin wants to **view** the logo (inspect it at high resolution, check transparency, or download it), there is no viewer/lightbox modal.
- If no logo has been uploaded, clicking the avatar simply opens the file uploader without clarifying that no logo is currently set.

---

## 🛠️ Tasks

### Task 1: Fix `getMediaUrl` & `TenantLogoAvatar` State Reset

**Files:**
- Modify: `src/lib/utils.ts`
- Modify: `src/features/tenants/components/TenantLogoAvatar.tsx`

- [ ] **Step 1: Update `getMediaUrl` in `src/lib/utils.ts`**
  - Allow relative `/uploads/` paths in browser contexts when on same origin or using Vite/Nginx proxy.
- [ ] **Step 2: Add `useEffect` reset in `TenantLogoAvatar.tsx`**
  - Reset `imgError` to `false` whenever `resolvedUrl` changes.
  - Add optional `viewMode` and tooltip.

### Task 2: Create `TenantLogoViewerDialog` (High-Res Lightbox)

**Files:**
- Create: `src/features/tenants/components/TenantLogoViewerDialog.tsx`

- [ ] **Step 1: Implement `TenantLogoViewerDialog` component**
  - High-res preview container with checkered transparency backdrop.
  - School name, domain, format, and download button.
  - "Replace Logo" action button to trigger upload flow.

### Task 3: Integrate Viewer & Actions in `TenantAnalyticsPage`

**Files:**
- Modify: `src/features/tenants/pages/TenantAnalyticsPage.tsx`

- [ ] **Step 1: Add viewer dialog state and handlers**
  - Separate `viewerDialogOpen` and `logoDialogOpen`.
  - Connect avatar click to view modal when logo exists, or upload dialog when missing.
  - Add explicit "View Logo" action button in the header card when a logo exists.

### Task 4: Enhance `TenantLogoDialog` Error & Preview Handling

**Files:**
- Modify: `src/features/tenants/components/TenantLogoDialog.tsx`

- [ ] **Step 1: Add error fallback in `TenantLogoDialog`**
  - Fall back gracefully to icon/warning if the current logo file is missing on disk.

---

## 🧪 Verification Plan

### Automated Tests:
```bash
npm run lint
npx tsc -b
npm run build
```
