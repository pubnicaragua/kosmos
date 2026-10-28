# Global inactive users in Settings

## Intent

Let an active SUPER_ADMIN find globally deactivated accounts and permanently delete one when its email must be released. The current company-members list excludes these accounts after offboarding.

## Goals

- Add a global inactive-account list in Settings, independent of the selected company.
- Limit both API access and UI visibility to active SUPER_ADMINs.
- Search inactive accounts by name or email; show name, email, and deactivation date.
- Delete through the existing `DELETE /api/users/[id]` transaction and its irreversible confirmation.
- When the add-user form detects an email matching an inactive account, let a SUPER_ADMIN delete that account directly from the form.
- Return a clear add-user error for an inactive account instead of the misleading name-conflict guidance.

## Non-goals

- Reactivate accounts.
- Change the deletion transaction, historical attribution, or database schema.
- Allow company ADMINs to browse or delete global inactive accounts.

## Approaches

- **Chosen: global list with search.** Add a SUPER_ADMIN-only API and a Settings section. It works even when the account has no active membership in the selected company and gives admins a repeatable cleanup path.
- **Email-only lookup.** Smaller interface, but requires knowing each exact address and does not provide a visible inactive-account list.

## Design

Add `GET /api/users/inactive` with a `q` search parameter over name and email. Return inactive users only, ordered by most recent deactivation, with a bounded initial result set. Settings displays the results and calls the existing global deletion handler after explicit confirmation. After success, remove the account from the inactive list and refresh the active company members. The add-user endpoint checks inactive status before comparing the requested name and returns actionable wording.

When adding a user fails, a SUPER_ADMIN also searches the submitted email through the guarded inactive-user endpoint. If an exact case-insensitive email match exists, the form displays the matching account and reuses the same permanent-delete confirmation and endpoint. Active duplicate accounts do not get a delete action.

## Files

- `src/app/api/users/inactive/route.ts` (new)
- `src/app/(dashboard)/sistema/ajustes/page.tsx`
- `src/app/api/companies/[id]/users/route.ts`

No migration is required; permanent deletion already uses `ArchivedUser` and existing lifecycle code.
