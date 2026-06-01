# Family Shopping List MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GitHub Pages-ready family shopping list app from the handoff, with local storage working now and a Supabase Realtime adapter path ready for later credentials.

**Architecture:** The app is static HTML/CSS/JS so it can deploy directly to GitHub Pages without a build step. Core list behavior lives in small tested modules, while the UI layer renders from store state and calls the store API. Supabase configuration is documented and isolated so the backend can be connected without rewriting the UI.

**Tech Stack:** Static HTML, CSS, vanilla ES modules, Node built-in test runner, optional Supabase JS CDN later.

---

### Task 1: Core Data Model

**Files:**
- Create: `src/core.js`
- Test: `tests/core.test.js`

- [x] Write tests for category guessing, item normalization, grouping, and summary totals.
- [x] Implement `src/core.js`.
- [x] Run `npm test`.

### Task 2: Local Store

**Files:**
- Create: `src/local-store.js`
- Test: `tests/storage.test.js`

- [x] Write tests for local persistence and subscriptions.
- [x] Implement `src/local-store.js`.
- [x] Run `npm test`.

### Task 3: Static App Shell

**Files:**
- Create: `index.html`
- Create: `src/app.js`
- Create: `src/styles.css`

- [x] Render the handoff-inspired list UI.
- [x] Add item creation/edit/check/delete flows.
- [x] Keep mobile layout usable on small screens.

### Task 4: Supabase Handoff

**Files:**
- Create: `supabase/schema.sql`
- Create: `.env.example`
- Create: `README.md`

- [x] Add SQL schema and setup steps.
- [x] Document how to paste Supabase URL and anon key later.
- [x] Explain current local mode limitation clearly.

### Task 5: Verify and Ship Prep

**Files:**
- Modify: `package.json`
- Create: `.gitignore`

- [x] Run tests and syntax checks.
- [x] Initialize git.
- [x] Commit working app.
- [x] Prepare GitHub Pages deployment instructions.
