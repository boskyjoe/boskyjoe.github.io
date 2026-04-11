# MONETA Detailed Design and Development Context

Last updated: 2026-04-10
Scope: `Moneta/` (the active rebuild project).  
Legacy reference app: root `TrinityCart/` files are legacy and should be used only for behavior comparison.

## Purpose
This document is a full AI handoff context file for continuity.  
If a new session starts, load this file first to recover architecture, workflow, and implementation conventions before making changes.

## Quick Start For New AI Sessions
1. Confirm work target is `Moneta/` and not the legacy root app.
2. Read this file fully.
3. Read these files next:
`Moneta/index.html`
`Moneta/js/app/bootstrap.js`
`Moneta/js/app/router.js`
`Moneta/js/config/nav-config.js`
`Moneta/js/config/collections.js`
`Moneta/firestoreRule/fireStoreRule.txt`
4. For feature work, follow pattern:
`view.js` -> `service.js` -> `repository.js` -> `grid.js`.

## Technology and Runtime
- Static web app (GitHub Pages compatible).
- Firebase v8 (auth + firestore) loaded from CDN in `Moneta/index.html`.
- AG Grid Community for worksheet and history grids.
- Modular ES modules by feature.
- HTML-to-PDF generation through `html2pdf` bundle for invoice/credit-note outputs.

## Repository Boundaries
- Active app root: `Moneta/`.
- Legacy app root (for reference only): `/Users/bjoe/Desktop/Bosky/Benju/TrinityCart/` top-level `js/`, `css/`, `index.html`.
- Shared database between legacy TrinityCart and Moneta rebuild.

## Application Shell Architecture
### Bootstrap flow
`Moneta/js/app/bootstrap.js`
- Initializes Firebase.
- Initializes shell, all feature modules, router, auth, tooltips.
- Binds login/logout global click handlers.
- Starts master-data subscriptions after login.

### Router and views
`Moneta/js/app/router.js`
- Hash-based routing.
- Default authenticated route: `#/home`.
- Role-based access enforced using `nav-config.js` roles.
- Route-to-view map:
`#/home`, `#/dashboard`, `#/leads`, `#/retail-store`, `#/simple-consignment`, `#/suppliers`, `#/products`, `#/sales-catalogues`, `#/admin-modules`, `#/purchases`, `#/user-management`.

### State store
`Moneta/js/app/store.js`
- Global state keys:
`currentUser`, `currentRoute`, `isMasterDataReady`, `masterData`.
- Master data keys:
`categories`, `seasons`, `products`, `suppliers`, `paymentModes`, `salesCatalogues`, `teams`.

### Auth and user bootstrap
`Moneta/js/app/auth.js`
- Google sign-in popup.
- New authenticated users auto-create as `guest` in users collection.
- Inactive users are signed out and blocked.
- On successful auth, route navigates to `#/home`.

### Master data listeners
`Moneta/js/app/master-data.js`
- Real-time `onSnapshot` listeners for master collections.
- Products are filtered to active rows before entering state.
- Subscriptions detach on logout.

## Navigation and Role Model
`Moneta/js/config/nav-config.js`
- Roles used:
`admin`, `inventory_manager`, `sales_staff`, `finance`, `team_lead`, `guest`.
- Unauthenticated shell behavior: only Home link visible.
- Admin-only area:
`#/admin-modules`, `#/user-management`.

## Firestore Data Model (Collection Paths)
Defined in `Moneta/js/config/collections.js` under base:
`artifacts/TrinityCart-default-app-id`

Collections actively used by Moneta:
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

## Security Rules Baseline
`Moneta/firestoreRule/fireStoreRule.txt`
- Designed for compatibility-first behavior so TrinityCart legacy does not break.
- Active authenticated users generally have broad read/write on operational collections.
- Admin-only writes on core admin master collections.
- Users collection protections:
self-read, admin list/manage, guest self-bootstrap create.

## Shared UX Infrastructure
### Modal framework
`Moneta/js/shared/modal.js`
- `showModal`, `showSummaryModal`, `showConfirmationModal`.
- Tone-based headers and confirm button variants (`primary`, `danger`, `secondary`).
- Used consistently for confirmations, summaries, and irreversible actions.

### Toast and progress flow
`Moneta/js/shared/toast.js`
- `runProgressToastFlow()` standardizes step-based progress messages.
- Supports UI action locking during writes (`ui-action-lock` overlay).
- Recent hardening ensures toast root stays above lock overlay.

### Disabled action tooltip helper
`Moneta/js/shared/disabled-actions.js`
- Auto-annotates disabled `.button` controls with reason tooltips.
- MutationObserver keeps tooltips updated for dynamic content.

### Focus helpers
`Moneta/js/shared/focus.js`
- Used to shift focus/scroll to forms when grid actions enter edit/view modes.

## Feature Modules and Current Behavior
## 1) Home
`Moneta/js/features/home/`
- Default landing view.
- Marketing-style overview and module cards.
- Used as pre-login and post-login landing.

## 2) Dashboard
`Moneta/js/features/dashboard/`
- Placeholder/summary dashboard section.
- Reporting depth still pending compared to target end state.

## 3) Suppliers
`Moneta/js/features/suppliers/`
- CRUD supplier master records.
- AG Grid history with status/actions conventions.

## 4) Product Catalogue
`Moneta/js/features/products/`
- CRUD products with category/season integration.
- AG Grid patterns include wrapping text and numeric alignment.

## 5) Sales Catalogue
`Moneta/js/features/sales-catalogues/`
- Catalogue header + worksheet lines linked to product catalogue.
- Workspace mode supports controlled line selection/quantity and pricing context.
- Known risk noted during audit: `handleCatalogueItemRemoval` references `featureState.liveItems`; verify against current state keys before touching removal flow.

## 6) Stock Purchase
`Moneta/js/features/purchases/`
- Purchase invoice create/edit/view/void flows.
- AG Grid product list (line items) from active catalogue.
- Invoice-level adjustments and totals.
- Payment recording/voiding, payment history in module workflow.
- Invoice void logic includes inventory/payment reversals with audit entries.

## 7) Leads / Enquiries
`Moneta/js/features/leads/`
- Enquiry CRUD with structured form sections (customer/context/requirements).
- Requested products worksheet from selected sales catalogue.
- Product inquiry summary cards:
`Total Products` (unique included lines), `Total Value`.
- Work Log module implemented as modal with AG Grid history + add entry form.
- Lead delete restrictions enforce safety for converted/linked leads.
- Lead-to-sales conversion is still pending as a dedicated workflow.

## 8) Retail Store
`Moneta/js/features/retail-store/`
- Most complex direct-sales module.
- Supports create, view (read-only form mode), edit (full/limited), return, void.
- Linked functions:
payments, expenses, returns, return history, PDF invoice, credit-note PDF.
- Edit scope policy:
full edits allowed only before downstream financial/return activities; otherwise limited-safe edits.
- Sales void logic:
marks sale voided, creates reversal entries, restores inventory, and enforces guardrails.
- Grid action UX uses split action patterns and more-actions modal for action density control.

## 9) Simple Consignment
`Moneta/js/features/simple-consignment/`
- Checkout order creation from active products.
- Settlement worksheet tracks sold/returned/damaged/gifted quantities.
- Save Progress updates header + line changes together.
- Separate order payments/expenses tracking with void transaction support.
- Close order strictness:
requires no on-hand qty and no outstanding balance.
- Cancel order constraints:
allowed only when no activity; inventory restored; order marked cancelled.
- Settlement supports staged addition of new products and undo/revert line edits.

## 10) Admin Modules
`Moneta/js/features/admin-modules/`
- Manages Product Categories, Sales Seasons, Payment Modes.
- Critical rule: editing blocked when entity is already used downstream.
- In-use entities can still be activated/deactivated.
- Usage checks query relevant dependent collections to enforce safe governance.

## 11) User Management
`Moneta/js/features/user-management/`
- Admin-only user role and active/inactive management.
- Safety rules:
cannot edit own access from this screen,
cannot remove last active admin.

## Core UI/UX Standards Implemented
- AG Grid headers and data text wrapping enabled.
- Numeric columns right-aligned.
- Cell content vertically centered.
- Pinned total rows used for financial/quantity-heavy grids.
- Action/status renderers avoid showing action controls on pinned total rows.
- Professional confirmation pattern:
summary modal after CRUD success,
double-confirmation modal for destructive operations.
- Sidebar remains fixed while content scrolls.

## Data Integrity and Multi-User Considerations
- Prefer transactional repository operations for inventory and financial side effects.
- Use server timestamps for audit fields.
- Preserve immutable historical records; use `isActive`, `status`, `voided` semantics instead of hard deletes where needed.
- Maintain compatibility with legacy TrinityCart collection conventions.

## Firebase Free Plan Optimization Notes
- Reuse master-data listeners across modules.
- Restrict expensive scans with targeted equality queries and `limit(1)` existence checks when possible.
- Perform usage checks only at edit-time decision points.
- Avoid unnecessary duplicate writes on untouched fields.

## Known Completed Enhancements from Current Build Cycle
- Home-first routing and menu behavior cleanup.
- Shared progress toasts with step sequencing and UI lock.
- Improved modal visual language and confirmation summaries.
- Payment/expense modal close behavior stabilized by using explicit close actions.
- Retail PDF and return-credit-note generation.
- Consignment save summary and settlement workflow refinements.

## Known Gaps / Next Logical Build Areas
- Leads: lead-to-sales conversion flow.
- Dashboard: full KPI and reporting implementation.
- Reports module and export suite (if not yet built separately).
- Final mobile/tablet QA pass and fit-and-finish sweep across all modules.

## Development Conventions
- Keep feature boundaries strict (`view/service/repository/grid`).
- Put business validation in `service.js`.
- Put Firebase reads/writes and transaction mechanics in `repository.js`.
- Keep UI state and event orchestration in `view.js`.
- Keep AG Grid column definitions and renderers in `grid.js`.
- Reuse shared modal/toast helpers; avoid ad-hoc alerts.

## QA Regression Checklist (Minimum)
1. Login/logout and role route gating.
2. Create/edit/view flows for each major module.
3. Destructive flows with confirmations: void, cancel, inactivate, delete.
4. Inventory movement consistency after purchase/sale/return/consignment operations.
5. Payment and expense ledger propagation.
6. Grid pinned total rows, numeric alignment, wrapped headers/data.
7. Toast visibility with UI lock active.
8. PDF generation for sale invoice and credit note.

## Handoff Instructions For Future Incremental Enhancements
1. Read this file.
2. Identify target feature folder and open `view.js`, `service.js`, `repository.js`, `grid.js`.
3. Preserve existing UX patterns:
progress toast sequence, confirmation modals, disabled action tooltips.
4. For destructive operations, enforce rule checks first, then confirm, then execute transactionally.
5. Update this document after major workflow or architecture changes.

## Recommended Update Protocol For This File
After each major feature addition:
- Add/change module behavior summary.
- Add new collection fields or new collections.
- Add new constraints and irreversible-action rules.
- Add migration or compatibility notes if TrinityCart behavior is impacted.

