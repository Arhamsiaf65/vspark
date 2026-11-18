# Architecture Rules

Stack: Next.js (App Router, TypeScript), Tailwind CSS, Supabase (Postgres, Auth, Storage), Zod, Vercel.

> **Next.js version warning:** this repo runs Next 16.x, which has breaking changes. Before writing any
> Next code, read the relevant guide in `node_modules/next/dist/docs/`. Notably, `middleware.ts` is
> renamed to `proxy.ts` in Next 16 (see `01-app/02-guides/upgrading/version-16.md`). Wherever these
> rules say `middleware.ts`, use whatever filename the installed version requires.

## Folder structure

```
notes-app/
├── app/                              # Routing + controllers
│   ├── layout.tsx                    # Root layout (navbar, toaster)
│   ├── page.tsx                      # Landing page
│   ├── not-found.tsx
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── (app)/layout.tsx              # Protected shell, server-side user check
│   ├── (app)/notes/
│   │   ├── page.tsx                  # View: Server Component, calls services
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   └── actions.ts                # Controller: 'use server'
│   ├── (app)/uploads/
│   │   ├── page.tsx
│   │   └── actions.ts
│   ├── (app)/weather/page.tsx
│   └── api/health/route.ts           # Controller: HTTP endpoint
├── components/                       # View: presentational and feature UI
│   ├── ui/                           # Generic: Button, Input, Card, FormError
│   ├── layout/Navbar.tsx
│   └── notes/                        # NoteForm, NoteCard, DeleteButton
├── lib/
│   ├── services/                     # Model: all data access and external calls
│   │   ├── notes.ts
│   │   ├── uploads.ts
│   │   └── weather.ts
│   ├── validation/                   # Zod schemas and inferred types
│   │   ├── notes.ts
│   │   └── uploads.ts
│   ├── types/action-result.ts        # ActionResult<T> shared type
│   ├── supabase/
│   │   ├── server.ts                 # Server client (cookies), import 'server-only'
│   │   ├── client.ts                 # Browser client
│   │   └── middleware.ts             # Session refresh helper
│   ├── security.ts                   # toSafeError(), requireRole(), rate limiting, redaction
│   └── env.ts                        # Zod-validated environment variables
├── middleware.ts                     # Session refresh + route protection (proxy.ts on Next 16)
├── supabase/migrations/              # SQL: tables, indexes, RLS, storage policies
├── .env.example
└── README.md
```

## Layers (MVC-style)

| Layer | Location | Responsibility |
|---|---|---|
| View | `components/`, `app/**/page.tsx` | Render UI, collect input |
| Controller | `app/**/actions.ts`, `app/api/**/route.ts` | Validate, call service, return result |
| Model | `lib/services/` | Only code that touches Supabase or external APIs |

## Layer rules (must follow)

1. Components and pages (View) render UI and collect input. They never import `lib/supabase` or call Supabase directly.
2. Server Actions and route handlers (Controller) validate input with a Zod schema from `lib/validation`, call a service, and return `ActionResult<T>`. They call `revalidatePath` after writes. They never build queries.
3. Services (`lib/services`) are the only code that queries Supabase or calls external APIs. They return `{ data, error }` and never throw to the UI. They do not import `next/navigation`, `cookies()`, or `revalidatePath`.
4. Every write validates input on the server, even if the client also validates.
5. Authorization is enforced by Row Level Security in `supabase/migrations`. Filter by `user_id` in queries as well, but never rely on the UI alone.
6. Secrets come only from `lib/env.ts`. Never hardcode keys. Never prefix a secret with `NEXT_PUBLIC_`. The `service_role` key is never used in app code.
7. Shared types come from `z.infer` of the schemas. Avoid `any`.

## ActionResult contract

```ts
type ActionResult<T = void> =
  | { ok: true; data?: T; message?: string; warning?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

## Conventions

- Files are named by feature: `notes`, `uploads`, `weather`.
- Error messages shown to users are human-readable. Log details on the server only.
- Keep components small. Extract logic into services, not into components.
- Use `import 'server-only'` in `lib/services` and `lib/supabase/server.ts`.
- Mark `'use client'` only where state or browser events are needed.
- Add a loading state and an error state for every data-fetching page.

## Form validation UX (must follow)

1. **Live feedback, never submit-then-tell.** Every form validates as the user types/blurs, using the
   SAME Zod schema from `lib/validation` via `useLiveValidation` (`lib/hooks/use-live-validation.ts`).
   Do not write separate client-only rules; they would drift from the server.
2. Behaviour: validate a field on blur; while typing, validate once the field has a value or was touched
   (don't nag empty untouched fields). On submit, validate everything and block the submit if invalid.
3. Errors render under the field (`Input`/`Select`/`Textarea` `error` prop, `aria-invalid`,
   `aria-describedby`, `aria-live="polite"`). Use `live.errorFor(name, serverFieldErrors)` so server
   errors show after submit but are replaced as soon as the user edits the field.
4. Cross-field refinements must be expressed as field-level checks (e.g. `.extend({ field: base.refine(...) })`)
   so the message is attached to the right field live.
5. Files (e.g. posters) get instant client checks with the shared `validatePosterFile()`; the server
   re-checks MIME, extension, size AND magic bytes. Client checks never replace server checks.
6. New forms must disable the submit button while pending (`SubmitButton`).
7. **Guide, don't scold.** Show ALL requirements up front, not one error at a time. Password fields use the
   live `PasswordRequirements` checklist driven by `PASSWORD_RULES` (the same array builds the Zod schema).
   Length-limited text fields show a `CharCount` hint. Pass these through the `hint` prop of
   `Input`/`Textarea`/`Select`.
8. **Don't nag mid-typing.** While a field is untouched, "incomplete" errors (`too_small`, `invalid_format`)
   wait until blur; "too long" and custom errors show immediately. This is built into `useLiveValidation`.
9. **Messages say what to do** ("Name must be at least 2 characters", "Enter a valid email like
   name@university.edu"), never just "Invalid".

## When generating code

- State which layer each new file belongs to.
- Never place Supabase calls in components or pages.

## Testing rules (must follow)

- `npm test` (Vitest, fast, no network): Zod schemas, services (mocked Supabase), controllers/actions
  (mocked services), live-validation components. Every new schema, service and action ships with tests.
- `npm run test:integration`: real-Supabase workflow (RLS, grants, capacity, storage policies). Needs the
  `TEST_*` accounts in `.env.local`. Test files are the only place besides `lib/env.ts` allowed to read `process.env`.
- `npm run smoke -- <url>`: production/local smoke (health, headers, route protection, 404).
- `npm run check` = typecheck + lint + unit tests + build. Run it before every push.
- Mocks of a module hide it: test the real module in its own file (see `tests/unit/services/uploads.test.ts`).

## Design system (must follow)

References: a warm dashboard (Voom-style: off-white canvas, white rounded cards, orange accent, sidebar,
stat tiles, poster cards with category chips) and a dark landing hero (Penta-style: huge headline with a
hand-drawn underline, pill buttons, category chips).

- **Tokens, not hard-coded colours.** All colours come from the CSS variables in `app/globals.css`
  (`canvas, surface, ink, muted, line, brand, brand-soft, brand-strong, success, danger`), exposed as Tailwind
  classes (`bg-brand`, `text-muted`, `border-line`...). Dark mode swaps the variables; never write `dark:` colour pairs.
- **Cobalt is the single accent; white (`text-brand-ink`) is its text colour.** Text ON orange uses `text-brand-ink` (dark) for WCAG AA;
  orange used AS text on light surfaces uses `text-brand-strong`.
- **Shared classes:** `.btn` + `.btn-primary|outline|dark|sm`, `.card`, `.chip`, `.link`. Use them instead of ad-hoc class strings.
- **Shapes:** cards `rounded-2xl`, controls and buttons fully rounded / `rounded-2xl`, generous spacing, thin `line` borders.
- **Type:** headings use the display font (`font-display`, Plus Jakarta Sans); body uses DM Sans.
- **Layout:** public pages use `SiteHeader`; signed-in pages render inside `AppShell` (sidebar on desktop,
  tab bar on mobile). Dashboards start with `StatTile`s. Every list has a skeleton (`PageSkeleton`),
  an empty state with a call to action, and an error state (`ErrorPanel`).
- **Icons:** `components/ui/Icon.tsx` only. Decorative icons are `aria-hidden`.
- **Motion** respects `prefers-reduced-motion` (handled globally).
