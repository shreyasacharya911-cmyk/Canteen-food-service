# Member B Progress

- [x] B-1: Database Schema (`supabase/schema.sql`), Idempotent Seed (`supabase/seed.sql`), Demo Users Script (`scripts/seed-users.ts`), & Setup Guide (`docs/HUMAN_TODO.md`)
- [x] B-2: Order Engine (`lib/orders.ts`) & Customer Order Endpoints (`GET/POST /api/customer/orders`, `POST /api/customer/orders/[id]/cancel`)
- [x] B-3: Staff APIs (`GET /api/staff/orders`, `PATCH /api/staff/orders/[id]/status`, `GET /api/staff/menu`, `PATCH /api/staff/menu/[id]`) & Kitchen Screens (`/staff`, `/staff/menu`)
- [x] B-4: Manager APIs (`GET /api/manager/dashboard`, `PATCH /api/manager/settings`), Demo Clock, Live Webcam Preview & Dashboard (`/manager`)
- [x] Local Presentation Mode: Added offline/in-memory mock adapter (`lib/mock-db.ts`, `lib/mock-client.ts`) wired into `lib/supabase/*` when `NEXT_PUBLIC_SUPABASE_URL` is a placeholder or missing.
