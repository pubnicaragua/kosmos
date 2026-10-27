# Proforma product SKU Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show current product SKUs in the printed proforma `CODIGO` column, including legacy lines that uniquely match a catalog product by exact name.

**Architecture:** Quote detail API includes `sku` in the existing product relation selection and resolves unlinked quote lines by exact, case-insensitive, company-scoped product name only when the match is unique. Detail page prints the SKU and wraps it in the cell; unresolved lines retain the existing `Item NN` label.

**Tech Stack:** Next.js App Router, TypeScript, Prisma.

**Spec:** `docs/superpowers/specs/2026-10-27-proforma-product-sku-design.md`

## Global Constraints

- Use the current product SKU; do not add a SKU snapshot or database migration.
- Resolve unlinked lines by exact product name, ignoring case, inside the quote's company; use SKU only for a unique match.
- Preserve name whitespace during lookup; do not map a padded name to a different unpadded product.
- Lines without a unique match retain the `Item NN` fallback.
- Preserve already-loaded product relations when applying the discount approval response.
- Keep long SKUs inside the `CODIGO` cell with `overflow-wrap: anywhere`.
- Keep the email-generated PDF format unchanged.

## Review Focus

- A quote item with a linked product displays that product's `sku` in `CODIGO`.
- An unlinked quote item with no unique exact-name match in the same company retains `Item NN`.
- An unlinked item with one exact same-company product match displays that product's SKU.
- An unlinked item with no match or multiple same-name products retains `Item NN`.
- Names differing only by leading/trailing spaces must not map to each other.
- Multiple manual items keep sequential, two-digit fallback labels.
- Existing quote detail API consumers still receive `product.name`.
- Quote description and other printed columns remain unchanged.
- Discount approval must preserve the product SKU already loaded on the quote.
- Long SKUs wrap inside `CODIGO`, without running into `DESCRIPCIÓN`.

---

### Task 1: Pass and display product SKU in printed proforma

**Files:**
- Modify: `src/app/api/quotes/[id]/route.ts` — add `sku: true` to the existing product selection and resolve unlinked items through unique exact same-company name matches.
- Modify: `src/app/(dashboard)/clientes/cotizacion/[id]/page.tsx` — type `items[].product.sku`, preserve item relations after approval, and render a wrapping SKU with the current `Item NN` fallback.

**Interfaces:**
- API response item relation: `product: { name: string; sku: string } | null`.
- Page item type: optional nullable `product` with `sku`.

- [x] Add `sku: true` while retaining `name: true` in the quote detail GET relation selection.
- [x] For unlinked quote items, query by exact name ignoring case and company; set response relation only for unique matches.
- [x] Add nullable optional product SKU to the page's `Quote.items` type.
- [x] Preserve the current `items` array when merging the discount approval response into quote state.
- [x] Replace the hardcoded code cell with `item.product?.sku || Item NN` fallback logic and set `overflowWrap: 'anywhere'`.
- [x] Review the diff for unchanged item ordering, description, and other printed columns.

**Validation:** Source and diff review only; no automated tests or builds included.
