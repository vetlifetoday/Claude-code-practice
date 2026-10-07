# VETLIFE CRM

Contact management for VETLIFE, a veteran-focused 501(c)(3).
Built with Next.js (App Router, TypeScript), Tailwind CSS, and Supabase (Postgres, Auth, Storage). Deploys to Vercel.

> Setting this up for real? Follow the step-by-step, no-coding guide in **[docs/SETUP.md](docs/SETUP.md)**.

## How it's organized

| Area | Where |
| --- | --- |
| Database schema, security rules, default categories | `supabase/migrations/` |
| Sample contacts (optional) | `supabase/seed.sql` |
| Email templates (invite, password reset) | `supabase/templates/` |
| Pages | `src/app/` — `(auth)` sign-in pages, `(app)` signed-in pages |
| Supabase clients | `src/lib/supabase/` (`admin.ts` is server-only) |
| Security smoke test | `scripts/test-security.mjs` |

## Data model

- **contacts** — every person *or* organization (`kind`). Optional email/phone. `veteran_id` links a Military Family member to a veteran; `organization_id` links a person to a Business / Organization contact.
- **categories / subcategories** — editable lookup tables (Admin › Categories). Nothing is hard-coded except a stable `system_key` on the built-in categories.
- **contact_categories** — tags. A contact can have any number (e.g. Veteran · Army + Donor · Monthly + Volunteer).
- **interactions** — dated notes timeline. **contact_documents** — uploaded files (private bucket `contact-files`).
- **profiles** — one per login, with role `admin` / `staff` / `viewer`.
- **audit_log** — written by database triggers (create, update, archive, restore, tag changes) and by the app (exports, imports, invites). Admin-read-only.

There are **no health, medical, or diagnosis fields**, by design.

## Security

- No public signup; admins invite users. The very first account created becomes the admin.
- Row Level Security on every table; nothing can be hard-deleted from the app. Archive (soft delete) is admin-only for contacts; restore is admin-only for everything.
- Optional TOTP two-step verification (MFA). Once a user turns it on, the database refuses their requests until they enter a code.
- Deactivating a user blocks sign-in and cuts off data access immediately.
- Files live in a **private** bucket and open only through short-lived signed URLs.
- Secrets live in environment variables (`.env.local`, never committed). See `.env.example`.

## Local development

Requires Node 20+, Docker.

```bash
npm install
npm run db:start          # starts local Supabase in Docker
npm run db:reset          # applies migrations + sample data
cp .env.example .env.local  # then paste the local URL/keys printed by `npx supabase status`
npm run dev               # http://localhost:3000
```

Create your first (admin) user in local Supabase Studio (http://127.0.0.1:54323 › Authentication › Add user),
or invite yourself after that. Local emails (invites, resets) appear in Mailpit at http://127.0.0.1:54324.

Checks: `npm run lint`, `npm run typecheck`, `npm run test:security` (needs the local stack running).
