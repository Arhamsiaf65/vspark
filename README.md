# Captionly: say it well, post it on time

AI social captions, scheduled and filed in your Google Drive, with email reminders.
Next.js 16 (App Router) · Supabase (Postgres, Auth) · Google Gemini · Google Drive API · SMTP email (nodemailer) · Vercel.

## How it works
1. **Sign in with Google** (Supabase Auth). The sign-in asks for the `drive.file` scope and an offline refresh token.
2. **Describe a post.** Gemini returns 3 captions with hashtags. It tries `GEMINI_MODEL`, then falls back to lite models if one is overloaded.
3. **Pick one, set a time.** The post is saved in Postgres and synced as a JSON file to an `AI Post Scheduler` folder in the user's own Drive.
4. **Manage posts.** Search, filter, sort, edit, delete (with undo), cursor pagination.
5. **Email reminders.** `/api/cron/reminders` emails each user before a post is due. Recipient, lead time, subject and whether to include the caption are customizable in the app.

## Environment variables
Copy `.env.example` to `.env.local`. Names only are committed, never values.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SITE_URL` | Your deployed URL (`http://localhost:3000` locally) |
| `GEMINI_API_KEY` | aistudio.google.com/apikey |
| `GEMINI_MODEL` | Preferred model, default `gemini-3.5-flash-lite` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth client (Web). Same client as the Supabase Google provider |
| `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASSWORD` | SMTP server. For Gmail: `smtp.gmail.com`, `587`, your address, and an **App Password** (not your login password) |
| `EMAIL_FROM` | Sender, e.g. `Captionly <you@gmail.com>` |
| `CRON_SECRET` | Random string, 16+ characters. Use letters and digits only (`openssl rand -hex 24`): characters such as `$` are expanded by Next.js and break the value |

`NEXT_PUBLIC_*` values are baked into the build, so set them in Vercel **before** deploying and redeploy after changing them.

## Setup
1. **Database.** In the Supabase SQL editor run `supabase/setup.sql` once (it combines `migrations/0001_init.sql` and `0002_soft_delete_search.sql`). Before running, change the cron secret on the last lines to match `CRON_SECRET`.
2. **Google Cloud.** Enable the **Google Drive API**. On the OAuth client add:
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Authorized JavaScript origins: your site URL and `http://localhost:3000`
   - OAuth consent screen: add the `.../auth/drive.file` scope, and your Google account under **Test users** while the app is in Testing mode.
3. **Supabase Auth.** Providers → Google: enable it and paste the client ID and secret. URL Configuration: set the Site URL and add `<site>/auth/callback` (and the localhost one) to Redirect URLs.
4. **Run.** `npm install`, then `npm run dev`.

## Scripts
| Command | What it does |
|---|---|
| `npm test` | Unit tests (Vitest, no network) |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint |
| `npm run check` | typecheck + lint + tests + build. Run before every push |

## Reminder schedule
`vercel.json` runs the cron once a day, which is the Vercel Hobby limit. For minute-level reminders use Vercel Pro, or an external scheduler (for example cron-job.org) calling `GET /api/cron/reminders` with the header `Authorization: Bearer <CRON_SECRET>`.

## Project layout
- `app/` routes and controllers (Server Actions in `actions.ts`, route handlers in `api/` and `auth/`)
- `components/` UI
- `lib/services/` the only code that touches Supabase or external APIs (Gemini, Drive, SMTP)
- `lib/validation/` Zod schemas shared by the server and the live form validation
- `supabase/` SQL: tables, RLS policies, reminder functions
- `docs/brand.md` logo, colour and voice guide

## Known limits
- Rate limiting is in memory, per server instance. Swap for a shared store before real traffic.
- The Google refresh token is stored in `google_connections`, protected by RLS. Supabase Vault would be stronger.
- While the Google app is in Testing mode, refresh tokens expire after 7 days and only listed test users can sign in.
