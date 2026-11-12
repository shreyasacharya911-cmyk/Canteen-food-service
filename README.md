# CanteenNow (`Canteen-food-service`)

**Arrive, sit, eat — food timed to be ready at your break slot, with a table held for you.**

CanteenNow is a full-stack college canteen pre-ordering and table-booking web application built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase** (with an automatic **Local Mock Mode** so the entire app runs out of the box without external credentials).

---

## Key Features

### Customer Portal (`/menu`, `/orders`, `/orders/[id]`)
- **Live Menu Browsing:** Browse items across *Meals*, *Snacks*, *Beverages*, and *Desserts* with real-time stock, prep times, and sold-out states.
- **Unified Food + Table Booking:** Reserve food and a canteen table (`T1`–`T4` 2-seaters, `T5`–`T8` 4-seaters, `T9`–`T10` 6-seaters) for the same 30-minute break slot (`09:00`–`16:00` IST).
- **Capacity-Aware Slots:** Enforces kitchen throughput (`20` items per slot), table availability, `start_by` cutoff (`now < slot_start - max_prep_minutes`), and one active order per user per slot.
- **Arrival-Synchronized Timing & Refunds:**
  - Displays ready-by time and exact free-cancellation cutoff (`slot_start - max(10 min, longest prep time)`).
  - Early cancellation issues a full mock refund; late cancellation (before `Preparing`) cancels without refund; cancellation is locked once `Preparing` or after slot start.
- **Auto-Polling Order Status:** Tracks order progression (`confirmed` → `preparing` → `ready` → `completed`).

### Staff Kitchen Portal (`/staff`, `/staff/menu`)
- **Priority Kitchen Queue:** Orders sorted by `start_by` (`slot_start - max_prep_minutes`) so cooks know what to start first.
- **One-Tap Status Progression:** Advance orders through `Start Preparing`, `Mark Ready`, and `Complete`.
- **Menu Availability Controls:** Toggle item availability and adjust stock from `/staff/menu`.

### Manager Dashboard (`/manager`)
- **Live Operations Overview:** View active orders, slot demand, revenue/order summaries, and table occupancy.
- **Demo Clock & Settings:** Shift the demo clock offset (`demo_clock_offset_minutes`) and adjust operational settings (`PATCH /api/manager/settings`) for testing slot cutoffs and cancellation windows.
- **Live Canteen Floor Camera:** Browser-only laptop webcam feed (`CameraPanel`) for live floor visibility (no video is recorded or uploaded).

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling & UI | Tailwind CSS, `lucide-react`, `sonner` |
| Data & Validation | SWR polling, Zod schemas |
| Database & Auth | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| Offline Demo Mode | Built-in JSON-backed mock adapter (`.canteen-mock-db.json`) |

---

## Quick Start (Local Mock Mode — No Setup Required)

When `NEXT_PUBLIC_SUPABASE_URL` is unset or set to a placeholder, CanteenNow automatically runs in **Local Mock Mode** using an in-memory + file-persisted store (`.canteen-mock-db.json`).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You will be redirected to `/login`.

> In Local Mock Mode, enter any non-empty password with one of the demo emails below.

---

## Demo Accounts

| Role | Email | Landing Route |
| --- | --- | --- |
| Student 1 | `student.demo@mite.ac.in` | `/menu` |
| Student 2 | `student2.demo@mite.ac.in` | `/menu` |
| Faculty | `faculty.demo@mite.ac.in` | `/menu` |
| Staff | `staff.demo@mite.ac.in` | `/staff` |
| Manager | `manager.demo@mite.ac.in` | `/manager` |
| Outsider *(rejected test)* | `outsider.demo@example.com` | Blocked (non-college domain) |

---

## Full Supabase Setup (Production / Real Database)

1. **Configure environment variables:** Copy `.env.example` to `.env.local` and fill in your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   COLLEGE_EMAIL_DOMAIN=mite.ac.in
   APP_TIMEZONE=Asia/Kolkata
   DEMO_PASSWORD=<your-demo-password>
   ```
2. **Initialize database:** Open the Supabase **SQL Editor** and run:
   - `supabase/schema.sql`
   - `supabase/seed.sql`
3. **Seed demo auth users:**
   ```bash
   npx tsx scripts/seed-users.ts
   ```
4. **Start the app:**
   ```bash
   npm run dev
   ```

See [docs/HUMAN_TODO.md](docs/HUMAN_TODO.md) for optional Google OAuth configuration steps.

---

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking (`tsc --noEmit`) |

---

## Project Structure

```text
├── app/
│   ├── (customer)/        # Customer pages: /menu, /orders, /orders/[id]
│   ├── (staff)/           # Staff pages: /staff, /staff/menu
│   ├── (manager)/         # Manager dashboard: /manager
│   ├── api/               # REST route handlers (auth, customer, staff, manager, health)
│   └── login/             # Login page with demo account helpers
├── components/
│   ├── customer/          # Checkout flow, shells, order status badges
│   ├── staff/             # Staff kitchen shell
│   ├── manager/           # Camera panel, demo clock panel, manager shell
│   └── ui/                # Reusable UI primitives (Button, Card, Modal, Badge, etc.)
├── lib/
│   ├── supabase/          # Supabase browser, server, and admin clients (mock-aware)
│   ├── mock-db.ts         # Local mock database state & persistence
│   ├── mock-client.ts     # Supabase-compatible query builder for mock mode
│   ├── orders.ts          # Order engine, slot & cancellation business rules
│   ├── auth.ts            # Session & domain-gated profile bootstrap
│   └── schemas.ts         # Zod validation schemas
├── scripts/
│   └── seed-users.ts      # Idempotent Supabase demo user seeder
├── supabase/
│   ├── schema.sql         # Database tables, constraints, and policies
│   └── seed.sql           # Initial menu items, tables, settings, and allowlist
└── docs/
    ├── SPEC.md            # Product and technical specification
    └── HUMAN_TODO.md      # Supabase & OAuth setup checklist
```
