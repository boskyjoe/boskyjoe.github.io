# Pickup Portal Scaffold

This folder is the first standalone scaffold for the public `Pickup Requests` portal.

## Purpose
- keep the public portal files self-contained inside `Moneta/` while the feature is still being designed
- make it easy to test the public experience on static hosting such as GitHub Pages
- prepare a clean target for a future `Online Catalogue` publishing flow from Moneta Admin

## Current contents
- `index.html`
  - storefront-style static portal shell for browsing published items and previewing a pickup request
- `css/pickup-portal.css`
  - self-contained storefront styling for the public portal
- `js/pickup-portal.js`
  - client-side rendering, category browsing, storefront search/sort, cart preview, item-detail modal, and request-summary modal
- `data/catalogue.json`
  - placeholder published catalogue snapshot that the portal reads first
- `assets/`
  - reserved for future images or static media

## Important current behavior
- the portal tries to load `./data/catalogue.json`
- if that file is unavailable, it falls back to embedded sample data so the page still previews cleanly
- the current UI now behaves more like a compact e-commerce storefront:
  - large catalogue search in the header
  - category rail
  - featured pickup picks
  - product-detail modal
  - sticky request cart
- the request form is preview-only for now
- no data is posted to Firestore, Google Sheets, or any backend yet

## Intended next evolution
1. Use `Admin Modules -> Online Catalogue` in Moneta to curate which Sales Catalogue items are public.
2. Generate and download the JSON snapshot from Moneta.
3. Replace `pickup-portal/data/catalogue.json` with that generated file for phase 1 manual publish.
4. Later replace the manual publish step with a controlled hosting/publish target.

## Preview notes
- Best tested on static hosting because browser `fetch(...)` behavior is more predictable there.
- GitHub Pages or any simple static server is fine for this stage.
