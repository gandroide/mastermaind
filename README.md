# Brivex Mastermind

The **BRIVEX MASTERMIND** application — an Executive PWA Command Center.

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with Safari on iPad Pro for
the optimal experience.

## Stack

- **Next.js** (App Router) + TypeScript
- **Tailwind CSS v4** — Dark-mode design system with Glassmorphism
- **Framer Motion** — Premium UI transitions
- **Zustand** — Global state (Master Switch business unit context)
- **Supabase** — Postgres DB, Auth, Storage

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database

Run `supabase/schema.sql` in your Supabase SQL editor to set up tables.
