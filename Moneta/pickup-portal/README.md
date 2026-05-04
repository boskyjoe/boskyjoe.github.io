# Pickup Portal Scaffold

This folder is the first standalone scaffold for the public `Pickup Requests` portal.

## Purpose
- keep the public portal files self-contained inside `Moneta/` while the feature is still being designed
- make it easy to test the public experience on static hosting such as GitHub Pages
- prepare a clean target for a future `Online Catalogue` publishing flow from Moneta Admin

## Current contents
- `index.html`
  - static portal shell for browsing published items and previewing a pickup request
- `css/pickup-portal.css`
  - self-contained styling for the public portal
- `js/pickup-portal.js`
  - client-side rendering, search/filtering, cart preview, and request-summary modal
- `data/catalogue.json`
  - placeholder published catalogue snapshot that the portal reads first
- `assets/`
  - reserved for future images or static media

## Important current behavior
- the portal tries to load `./data/catalogue.json`
- if that file is unavailable, it falls back to embedded sample data so the page still previews cleanly
- the request form is preview-only for now
- no data is posted to Firestore, Google Sheets, or any backend yet

## Intended next evolution
1. Add an `Online Catalogue` admin module in Moneta.
2. Let `admin` and `inventory_manager` curate which Sales Catalogue items are public.
3. Publish a generated JSON snapshot into `pickup-portal/data/catalogue.json`.
4. Later move or deploy this folder to the church website hosting target.

## Preview notes
- Best tested on static hosting because browser `fetch(...)` behavior is more predictable there.
- GitHub Pages or any simple static server is fine for this stage.
