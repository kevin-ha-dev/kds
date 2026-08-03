# BurgerBot KDS

KDS rebuild bootstrap using:

- Next.js + React + Tailwind
- Supabase

## Why this setup

This repo is configured for **Option A** integration:

- OrangePi runtime remains unchanged.
- Existing connector contract remains stable.
- KDS side is rebuilt on this stack and integrated through the existing event/contract boundary.

## Prerequisites

- Node.js 22+

## Environment

1. Copy `.env.example` to `.env.local`
2. Set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Run web app

```bash
npm install
npm run dev
```

## Notes

- If you need server-side APIs, run a separate backend/worker service (recommended for queue processing and idempotency).
