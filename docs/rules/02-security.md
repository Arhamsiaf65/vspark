# Security Rules (must follow)

1. **No leaks.** Never expose secrets, keys, stack traces, SQL, table names, or raw database errors to the client. Map every error through `toSafeError()` in `lib/security.ts`.
2. **Generic auth errors.** Use "Invalid email or password". Never reveal whether an email exists.
3. **Env vars.** Validated in `lib/env.ts`. Never read `process.env` elsewhere. Secrets have no `NEXT_PUBLIC_` prefix. `.env*` files are git-ignored. `.env.example` lists names only, never values.
4. **Roles:** `anonymous`, `user`, `admin`. Store the role in a `profiles` table with RLS. Check the role in `middleware.ts` (or `proxy.ts` on Next 16) for route access, in actions via `requireRole()`, and in RLS policies for data. Deny by default.
5. **Authorization.** Enforced in RLS first. Services also filter by `user_id`. Never trust an ID from the client without an ownership check.
6. **Input validation.** Validate every input with Zod on the server. Limit string lengths, numbers, and array sizes. Reject uploads by MIME type, extension, and size, using allowlists.
7. **Storage.** Buckets are private. Serve files through short-lived signed URLs. Storage policies restrict each user to their own folder.
8. **Rate limiting.** Sign-in, sign-up, uploads, and any endpoint that calls a paid or external API. Return 429 with a generic message.
9. **XSS.** Never use `dangerouslySetInnerHTML` with user data. Rely on React escaping.
10. **Headers.** Set in `next.config.ts`: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
11. **Route handlers that change data** must verify the session and check the origin. Server Actions have built-in origin checks, but still verify the session.
12. **Logging.** Server-side only. Never log passwords, tokens, session cookies, or full emails. Redact before logging.
13. **No committed secrets.** Run `git status` before every push. Rotate any key that was exposed, even briefly.
14. **Uploads.** Never trust the client filename or MIME type: store as `<user_id>/<random-uuid>.<ext>` with the
    extension derived from the sniffed file signature. Delete the new file if the DB write fails, and report
    a `warning` if cleanup of a replaced file fails.
15. **Dependencies.** Run `npm audit` and remove unused packages before the final push.

## Quick pre-push checklist

- [ ] `git status` shows no `.env*` or key files
- [ ] `npm run lint` and `npm run build` pass
- [ ] `npm audit` reviewed
- [ ] No unused packages or dead imports
- [ ] Every new table has RLS enabled plus policies
- [ ] Every new input has a Zod schema with length/size limits
