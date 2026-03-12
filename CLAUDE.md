# CLAUDE.md

## Project Overview

Zendesk-OS is a weekly report generator and macro management tool for SidelineSwap's Zendesk support operations. It's a React SPA deployed on Vercel with serverless API functions.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, React Router v7
- **Build**: Vite 7
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Google OAuth (restricted to @sidelineswap.com) with HMAC-SHA256 cookie sessions
- **AI**: Anthropic Claude API for macro analysis
- **APIs**: Zendesk API for tickets/macros

## Commands

- `npm run dev` — Start local dev server
- `npm run build` — Production build
- `npm run lint` — Run ESLint
- `npm run preview` — Preview production build locally

There is no test suite configured.

## Project Structure

```
src/
  components/
    ui/          — Reusable UI components (Card, Input, Button, Badge, Spinner)
    auth/        — LoginPage
    layout/      — AppShell, PageShell, Sidebar
    report/      — ZendeskReportGenerator
    macros/      — Macro management (pages/, components/, context/)
  lib/           — Utilities (auth, supabase client, API client, parsers, matching)
  hooks/         — Custom hooks (useMacros, useApiKey, useLocalStorage)
  types/         — TypeScript interfaces
api/             — Vercel serverless functions
  auth/          — OAuth login/callback/logout/me
  _auth.js       — Session verification helper
  zendesk-report.js — Zendesk API proxy
  analyze.js     — Claude API macro analysis
supabase/        — Database schema (schema.sql)
```

## Code Conventions

- Path alias: `@/*` maps to `./src/*`
- ESLint: unused vars error (uppercase/underscore-prefixed vars ignored)
- TypeScript strict mode is off
- Frontend files use `.tsx`/`.ts`; serverless functions use `.js`
- Environment variables prefixed with `VITE_` are exposed to the client; server-only secrets must not have this prefix

## Environment Variables

See `.env.example`. Required:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — Supabase client
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET` — Auth (server-only)
- `ZENDESK_API_EMAIL`, `ZENDESK_API_TOKEN` — Zendesk API (server-only)
- `ANTHROPIC_API_KEY` — Claude API (server-only)

## Deployment

Deployed to Vercel. Push to `main` triggers deployment. Serverless functions have a 60-second timeout configured in `vercel.json`.
