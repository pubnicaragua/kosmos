# Proforma product SKU Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show linked products' current SKU in the printed proforma `CODIGO` column.

**Architecture:** Quote detail API includes `sku` in the existing product relation selection. Detail page types that relation and prints its SKU, falling back to the existing `Item NN` label when no linked SKU exists.

**Tech Stack:** Next.js App Router, TypeScript, Prisma.

**Spec:** `docs/superpowers/specs/2026-10-27-proforma-product-sku-design.md`

## Global Constraints

- Use the current product SKU; do not add a SKU snapshot or database migration.
- Manual quote lines without a linked SKU retain the `Item NN` fallback.
- Preserve already-loaded product relations when applying the discount approval response.
- Keep long SKUs inside the `CODIGO` cell with `overflow-wrap: anywhere`.
- Keep the email-generated PDF format unchanged.

## Review Focus

- A quote item with a linked product displays that product's `sku` in `CODIGO`.
- A quote item without a linked product retains `Item NN`.
- Multiple manual items keep sequential, two-digit fallback labels.
- Existing quote detail API consumers still receive `product.name`.
- Quote description and other printed columns remain unchanged.
- Discount approval must preserve the product SKU already loaded on the quote.
- Long SKUs wrap inside `CODIGO`, without running into `DESCRIPCIÓN`.

---

### Task 1: Pass and display product SKU in printed proforma

**Files:**
- Modify: `src/app/api/quotes/[id]/route.ts` — add `sku: true` to the existing product selection.
- Modify: `src/app/(dashboard)/clientes/cotizacion/[id]/page.tsx` — type `items[].product.sku`, preserve item relations after approval, and render a wrapping SKU with the current `Item NN` fallback.

**Interfaces:**
- API response item relation: `product: { name: string; sku: string } | null`.
- Page item type: optional nullable `product` with `sku`.

- [x] Add `sku: true` while retaining `name: true` in the quote detail GET relation selection.
- [x] Add nullable optional product SKU to the page's `Quote.items` type.
- [x] Preserve the current `items` array when merging the discount approval response into quote state.
- [x] Replace the hardcoded code cell with `item.product?.sku || Item NN` fallback logic and set `overflowWrap: 'anywhere'`.
- [x] Review the diff for unchanged item ordering, description, and other printed columns.

**Validation:** Source and diff review only; no automated tests or builds included.
