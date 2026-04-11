# MONETA Design + Development Context (Current State)

Last updated: 2026-04-11  
Scope: `Moneta/` only (active rebuild).  
Legacy reference: repository root `TrinityCart/` files are legacy and should be used only for behavior comparison.

## Purpose
This is the primary AI handoff file for Moneta.  
A fresh session should read this first to recover architecture, workflow conventions, module behavior, and current risk areas.

## Fresh-Start Checklist (For New AI Sessions)
1. Confirm target is `Moneta/`.
2. Read this file fully.
3. Read these files next:
`Moneta/index.html`
`Moneta/js/app/bootstrap.js`
`Moneta/js/app/router.js`
`Moneta/js/app/auth.js`
`Moneta/js/app/master-data.js`
`Moneta/js/config/nav-config.js`
`Moneta/js/config/collections.js`
`Moneta/firestoreRule/fireStoreRule.txt`
4. For module work, follow structure:
`view.js` -> `service.js` -> `repository.js` -> `grid.js`.
5. Preserve existing UX patterns:
progress toasts, summary modals, confirmation modals, disabled action tooltip reasons.

## Runtime + Stack
- Static web app (GitHub Pages compatible).
- Firebase v8 CDN (`firebase-app`, `firebase-auth`, `firebase-firestore`).
- AG Grid Community (`@32.3.3` via CDN ESM).
- Chart.js (`@4.4.3` via dynamic CDN import) for dashboard inventory charts.
- html2pdf bundle for retail invoice and credit-note output.
- ES module architecture by feature folder.

## App Shell Architecture
### Bootstrap flow
`Moneta/js/app/bootstrap.js`
- Initializes Firebase app.
- Initializes shell + all feature modules + router + auth + disabled-action tooltips.
- Binds global login/logout click handlers.
- Starts/tears down master-data listeners based on auth session state.

### Router + views
`Moneta/js/app/router.js`
- Hash-based routing.
- Unauthenticated users are always forced to `#/home`.
- Authenticated users default to `#/home`.
- Role access enforced using `nav-config.js`.
- Active routes:
`#/home`, `#/dashboard`, `#/leads`, `#/retail-store`, `#/simple-consignment`, `#/suppliers`, `#/products`, `#/sales-catalogues`, `#/admin-modules`, `#/purchases`, `#/user-management`.

### Global state
`Moneta/js/app/store.js`
- Root keys:
`currentUser`, `currentRoute`, `isMasterDataReady`, `masterData`.
- `masterData` keys:
`categories`, `seasons`, `products`, `suppliers`, `paymentModes`, `salesCatalogues`, `teams`.

### Master data listeners
`Moneta/js/app/master-data.js`
- Real-time listeners for:
categories, seasons, products, suppliers, payment modes, sales catalogues, teams.
- Product master data is filtered to active products before being put in state.
- Listeners detach on logout.

## Auth + Identity Model
`Moneta/js/app/auth.js`
- Google popup sign-in.
- Missing user profile auto-bootstraps as active `guest`.
- Inactive users are signed out immediately and blocked.
- Session user shape includes:
`uid`, `displayName`, `email`, `photoURL`, `role`, `teamId`.

## Navigation + Role Model
`Moneta/js/config/nav-config.js`
- Roles:
`admin`, `inventory_manager`, `sales_staff`, `finance`, `team_lead`, `guest`.
- Home + Dashboard visible to all authenticated roles.
- Admin-only routes:
`#/admin-modules`, `#/user-management`.
- Unauthenticated shell shows Home link only.

## Firestore Data Model
Base path:
`artifacts/TrinityCart-default-app-id`

### Top-level collections in active use
- `users`
- `suppliers`
- `productCatalogue`
- `purchaseInvoices`
- `supplierPaymentsLedger`
- `salesInvoices`
- `salesPaymentsLedger`
- `consignmentPaymentsLedger`
- `consignmentOrdersV2`
- `productCategories`
- `paymentModes`
- `salesSeasons`
- `salesCatalogues`
- `churchTeams`
- `leads`
- `donations`

### Subcollections in active use
- `salesCatalogues/{catalogueId}/items`
- `leads/{leadId}/workLog`
- `salesInvoices/{saleId}/expenses`
- `salesInvoices/{saleId}/returns`
- `consignmentOrdersV2/{orderId}/payments`

## Security Rules Snapshot
`Moneta/firestoreRule/fireStoreRule.txt`
- `users` has stronger controls (self-read, admin list/manage, guest bootstrap create).
- Admin master collections (`productCategories`, `paymentModes`, `salesSeasons`, `saleTypes`, `salesEvents`) are read for active users but write-restricted to admin.
- Operational collections are currently broad read/write for any active authenticated user (compatibility-first with legacy TrinityCart).

## Shared UX Infrastructure
### Modals
`Moneta/js/shared/modal.js`
- Escaped content rendering.
- `showModal`, `showSummaryModal`, `showConfirmationModal`.
- Tone-based visuals with confirm variants (`primary`, `danger`, `secondary`).

### Toasts + progress orchestration
`Moneta/js/shared/toast.js`
- `showToast` for quick stack toasts.
- `ProgressToast` + `runProgressToastFlow` for step workflows.
- UI action lock overlay with z-index protection so toasts remain visible over lock layer.

### Disabled action reason tooltips
`Moneta/js/shared/disabled-actions.js`
- Auto-applies tooltip reasons to disabled `.button` elements.
- MutationObserver keeps dynamic content annotated.

### Focus helper
`Moneta/js/shared/focus.js`
- Form focus/scroll utility for edit flows and modal workflows.

## Feature Status (Implemented Behavior)
## 1) Home
`Moneta/js/features/home/`
- Fully rebuilt marketing-style landing.
- Logged-out CTA routes to Google login.
- Logged-in CTA routes to dashboard.

## 2) Dashboard
`Moneta/js/features/dashboard/view.js`
- Implemented (not placeholder).
- Role-aware metric cards and sections.
- Time windows: `today`, `7d`, `30d`, `custom`.
- Session cache per user + range (`10 min` TTL).
- Aggregates:
retail, consignment, purchases, leads, cash flow, low-stock watch, inventory health.
- Inventory health includes:
status chips, status doughnut chart, low-stock-by-category bar chart, searchable AG Grid.

## 3) Suppliers
`Moneta/js/features/suppliers/`
- Supplier CRUD with active/inactive lifecycle.
- AG Grid history + search + status actions.
- Uses standard confirmation/summary/progress UX.

## 4) Product Catalogue
`Moneta/js/features/products/`
- Product CRUD with pricing and category binding.
- Active/inactive control via field status toggle.
- AG Grid history + search + status actions.

## 5) Sales Catalogue
`Moneta/js/features/sales-catalogues/`
- Catalogue header create/edit/activate.
- Item workspace bound to selected catalogue.
- Product add/remove and inline price override update.
- `salesCatalogues/{id}/items` subscription drives workspace.

## 6) Stock Purchase
`Moneta/js/features/purchases/`
- Purchase invoice create/edit/view.
- Inventory increments on create; delta adjustments on edit.
- Payment recording with strict overpayment guard.
- Payment void creates reversal ledger entries.
- Invoice void:
voids active linked payments, writes reversal payments, reverses inventory.

## 7) Leads / Enquiries
`Moneta/js/features/leads/`
- Lead CRUD with structured customer/context/request fields.
- Requested products worksheet from sales catalogue items.
- Lead work log modal with subcollection history + entry form.
- Lead delete guardrails:
converted leads or leads linked to sales cannot be deleted.
- Lead-to-retail conversion implemented:
builds validated conversion package, stores in session storage, routes to retail.

## 8) Retail Store
`Moneta/js/features/retail-store/`
- Direct-sales lifecycle implemented:
create, view, edit (full/limited), payment, expense, return, void.
- Lead conversion intake implemented (session package consumed on route entry).
- Inventory and financial writes are transactional.
- Return flow:
partial/full return with inventory restoration and return history.
- Void flow:
void sale + void/reverse payments and expenses + donation reversals + inventory restoration.
- PDF outputs:
invoice and return credit-note generation.

## 9) Simple Consignment
`Moneta/js/features/simple-consignment/`
- Checkout order creation from sales catalogue.
- Settlement updates with item-level sold/returned/damaged/gifted accounting.
- Supports controlled addition of new products during settlement.
- Payment/expense transaction posting and void reversals.
- Cancel guardrails:
allowed only if no product/financial/transaction activity.
- Close guardrails:
requires all quantities accounted and balance due = 0.

## 10) Admin Modules
`Moneta/js/features/admin-modules/`
- Manages Product Categories, Payment Modes, Sales Seasons.
- Edit restrictions enforce downstream usage protection.
- In-use records can still be activated/deactivated.

## 11) User Management
`Moneta/js/features/user-management/`
- Admin-only user access management.
- Safety rules:
cannot edit self from this screen,
cannot remove last active admin.

## Known Gaps (Current)
- No dedicated reports/export route is wired in router/nav yet.
- No automated test suite is present in `Moneta/`; regression confidence is currently manual QA-based.
- Final responsive QA sweep is still recommended, especially on dense dashboard and modal-heavy flows.

## Cross-Module Integrity Rules
- Use server timestamps for audit fields.
- Void and reversal flows are modeled as immutable financial history (not hard delete).
- Inventory-affecting operations are transaction-based in purchase/retail/consignment repositories.
- Historical records are preserved via status semantics (`Voided`, `Reversal`, `Cancelled`, `Settled`, etc.).

## Current Architecture Notes
- Most modules follow intended layer split:
`view` orchestration, `service` validation/business logic, `repository` Firebase IO, `grid` AG Grid setup.
- Dashboard currently mixes UI + data access + aggregation in a single `view.js` file (intentional for speed, but now large).

## Code Review Findings (2026-04-11)
These are current risk items from code + architecture review.

### High
1. Stored XSS risk from unsanitized HTML interpolation in multiple views/toasts.
   - Example refs:
   `Moneta/js/shared/toast.js` (toast message/title interpolated into `innerHTML`)
   `Moneta/js/features/home/view.js` (user `displayName` injected into `innerHTML`)
   `Moneta/js/features/products/view.js` (editable DB fields inserted into input `value` attributes)
2. Authorization model is role-light at Firestore rule layer for operational collections.
   - Any active authenticated user can read/write many business collections directly.
   - This is currently compatibility-first, but still a production risk if strict role isolation is required.

### Medium
1. Dashboard module size/complexity now warrants extraction into `service/repository` style slices for maintainability.

### Resolved In This Cycle (2026-04-11)
1. Transaction race windows in selected destructive flows were removed by moving linked-record lookups into the transaction body.
   - Updated:
   `purchases/repository.js` invoice void,
   `retail-store/repository.js` sale void,
   `simple-consignment/repository.js` cancel order.
2. Dashboard scoped-user query logic was corrected to apply `createdBy` + date constraints in-query first, with safer scoped fallback behavior.
3. Master-data readiness now flips to true only after first snapshot has arrived for all configured master collections.

## Recommended Next Hardening Pass
1. Add reusable HTML escaping utilities for all `innerHTML` template insertions (or migrate to DOM APIs for user data).
2. Split dashboard into:
`dashboard-data.repository.js`, `dashboard-metrics.service.js`, `dashboard-view.js`.
3. Refine Firestore rules for role-aware write scopes once legacy compatibility window allows it.

## QA Regression Checklist (Minimum)
1. Login/logout and role route gating.
2. Master-data listener attach/detach on auth transitions.
3. CRUD/edit lifecycles across all major modules.
4. Destructive flows:
purchase payment void, purchase invoice void, retail void, retail returns, consignment cancel/close/void transaction.
5. Inventory consistency after purchase/sale/return/consignment operations.
6. Payment/donation/expense ledger propagation and reversal entries.
7. Dashboard refresh and cache behavior across window switches.
8. Mobile/tablet responsive checks for dashboard and Home.
9. PDF generation for retail invoice and credit note.

## Implementation Protocol For Future AI Work
1. Keep feature boundaries strict:
`view` UI state + events, `service` validation + policy, `repository` data IO/transactions, `grid` definitions.
2. Reuse shared modal/toast/disabled-actions helpers; avoid ad-hoc alerts.
3. For destructive operations:
guard checks -> explicit confirmation -> transactional write -> summary modal.
4. Preserve compatibility with existing Firestore schema fields used by legacy TrinityCart.
5. Update this file after each major feature or architecture change.
