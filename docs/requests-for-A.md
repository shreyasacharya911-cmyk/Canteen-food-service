# Requests / Notes for Member A

1. **Local Presentation / Mock Mode (`lib/supabase/*`):** Because the live presentation needed to run immediately without external Supabase keys, a local file-backed mock adapter (`lib/mock-db.ts` and `lib/mock-client.ts`) was wired into `lib/supabase/client.ts`, `lib/supabase/server.ts`, and `lib/supabase/admin.ts`. It activates automatically only when `NEXT_PUBLIC_SUPABASE_URL` is missing or contains `placeholder`. When real Supabase credentials are set in `.env.local`, it transparently uses `@supabase/ssr` and `@supabase/supabase-js` as before.
2. `app/api/customer/orders/[id]/route.ts` can now optionally import `fetchOrderById` from `@/lib/orders`.
