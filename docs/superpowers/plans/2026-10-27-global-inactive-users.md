# Global inactive users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let active SUPER_ADMINs search globally inactive accounts and permanently delete them from Settings.

**Architecture:** Add an admin-guarded `GET /api/users/inactive` search endpoint. Add a global inactive-account section to Settings that reuses the existing permanent delete endpoint and confirmation. Make the add-user API report inactive accounts before checking for name conflicts.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-10-27-global-inactive-users-design.md`

## Global Constraints

- Only an active SUPER_ADMIN may list global inactive accounts or delete accounts.
- Results include inactive accounts only; return `id`, `name`, `email`, and `deactivatedAt`.
- Search by case-insensitive name or email; cap result set at 100, newest deactivations first.
- Permanent deletion must continue through the existing transaction and explicit confirmation.
- No database access or migrations.
- Do not add or run tests unless requested.

## Review Focus

- Non-SUPER_ADMIN requests must receive 403, even if they can manage one company.
- Empty or whitespace search must list recent inactive accounts; search text must be trimmed.
- Search must match email and name without case sensitivity.
- A deleted account must disappear from results after the request succeeds.
- Existing active member deletion must continue using the same confirmation and API.

---

### Task 1: Inactive user search API and add-user guidance

**Files:**
- Create: `src/app/api/users/inactive/route.ts`
- Modify: `src/app/api/companies/[id]/users/route.ts:90-136`

**Interfaces:**
- `GET /api/users/inactive?q=<optional string>` returns `{ success: true, data: Array<{ id: string; name: string; email: string; deactivatedAt: string | null }> }`.
- Requires a valid token and an active `SUPER_ADMIN` membership; inactive-account data is global and not scoped to the selected company.

- [x] Implement token verification and active SUPER_ADMIN authorization in the new route; return 401 for missing/invalid token and 403 when the actor lacks global permission.
- [x] Query only `User.isActive === false`; trim `q`; when present, match `name` or `email` with case-insensitive `contains`; order by `deactivatedAt desc`; select only the four interface fields; cap at 100.
- [x] In company user creation, handle `targetUser.isActive === false` before requested-name mismatch and return clear guidance that account must be deleted before reusing its email.
- [x] Read the route and add-user flow together to confirm every search result is deletable through the existing endpoint and no active-user behavior changed.

### Task 2: Settings inactive-account list and deletion

**Files:**
- Modify: `src/app/(dashboard)/sistema/ajustes/page.tsx`

**Interfaces:**
- UI state stores search text, loading state, and results matching the Task 1 response.
- The existing global delete handler accepts `{ userId, user: { name, email } }` so both active member cards and inactive global results can use it.

- [x] Add a SUPER_ADMIN-only “Cuentas inactivas” section in the Roles/Users settings view, independent of the selected company; fetch recent inactive accounts on entry and search by name/email.
- [x] Show name, email, deactivation date, empty/loading/error states, and a delete control that calls the existing confirmation and `DELETE /api/users/[id]` flow.
- [x] After successful deletion, refresh active company members and inactive search results; keep existing active-member deletion behavior.
- [x] Review the final diff for authorization gates, stale list state, and unchanged active-member actions. Do not run tests or build unless requested.
