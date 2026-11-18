# Captionly: AI captions, scheduled to Google Drive

Next.js 16 + Supabase + Gemini + Google Drive + Resend.

## Flow
1. Sign in with Google (Supabase Auth; requests the `drive.file` scope and an offline refresh token).
2. Describe a post, and Gemini returns 3 captions with hashtags.
3. Pick one, set a publish time and reminder lead time. The post is saved to Postgres and synced as JSON to `AI Post Scheduler/` in the user's Drive.
4. The `/api/cron/reminders` route emails each user before a scheduled post (customizable in the settings form).

## Setup
1. Run `supabase/migrations/0001_init.sql` in the Supabase SQL editor, then insert the cron secret (see the end of that file).
2. Copy `.env.example` to `.env.local` and fill in the values.
3. Supabase → Authentication → Providers → Google: add the Google client ID and secret.
   Authentication → URL Configuration: set the Site URL and add `<site>/auth/callback` as a redirect URL.
4. Google Cloud: enable the Drive API. The OAuth client's authorized redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`.
   Add the `.../auth/drive.file` scope on the consent screen.
5. `npm run dev`. Before pushing, run `npm run check`.

## Reminders schedule
`vercel.json` runs the cron once a day (the Vercel Hobby limit). For minute-level reminders use Vercel Pro, or an external scheduler such as cron-job.org that calls `GET /api/cron/reminders` with the header `Authorization: Bearer $CRON_SECRET`.
