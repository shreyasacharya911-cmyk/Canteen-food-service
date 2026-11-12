# Human Setup Checklist (When Connecting Real Supabase)

## 1. Create Supabase Project & Configure Environment
1. Create a new project at [supabase.com](https://supabase.com/dashboard).
2. Copy the credentials into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `COLLEGE_EMAIL_DOMAIN=mite.ac.in`
   - `APP_TIMEZONE=Asia/Kolkata`
   - `DEMO_PASSWORD=<your-demo-password>`

## 2. Run SQL Schema and Seed
1. Open **SQL Editor** in the Supabase Dashboard.
2. Paste and run the contents of `supabase/schema.sql`.
3. Paste and run the contents of `supabase/seed.sql`.

## 3. Seed Demo Auth Users
Run the idempotent user seeding script from `Canteen-food-service/`:
```bash
npx tsx scripts/seed-users.ts
```

This creates/updates all 6 demo accounts (`student.demo@mite.ac.in`, `student2.demo@mite.ac.in`, `faculty.demo@mite.ac.in`, `staff.demo@mite.ac.in`, `manager.demo@mite.ac.in`, `outsider.demo@example.com`).

## 4. (Optional) Google OAuth Setup
1. Create a Web OAuth client in Google Cloud Console with redirect URI `https://<project>.supabase.co/auth/v1/callback`.
2. Add the Client ID and Secret in Supabase **Authentication > Providers > Google**.
3. Add `http://localhost:3000` (and your Vercel URL) to Supabase **Authentication > URL Configuration > Redirect URLs**.
