# Assumptions

- [A] .env.example - Included APP_TIMEZONE=Asia/Kolkata alongside COLLEGE_EMAIL_DOMAIN=mite.ac.in per docs/SPEC.md.
- [A] app/api/health/route.ts - Returns 200 { data: { ok: true } } without requiring database connectivity so health checks pass standalone.

- [A] app/layout.tsx - Configured 'Inter', system-ui, sans-serif in tailwind.config.ts instead of build-time next/font/google fetch so builds pass cleanly offline.
