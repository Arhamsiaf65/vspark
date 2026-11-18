# Competition Checklist: Next.js and Supabase Topics

Source: @nafees, Nov 16, 2026. Tick items off as they are implemented.

## 1. Validation and data contracts
- [ ] Zod schemas for every input
- [ ] Shared types inferred from schemas
- [ ] Typed environment variables
- [ ] Server-side file type and size checks

## 2. Result handling and feedback
- [ ] Standard action result shape
- [ ] Field-level errors
- [ ] Guidance hints: requirement checklists and character counters
- [ ] Live (as-you-type) validation from the shared Zod schema, on every form
- [ ] Toast notifications
- [ ] Warnings for partial failures
- [ ] Optimistic updates
- [ ] Double-submit prevention

## 3. Loading and error UX
- [ ] Skeleton loaders
- [ ] Suspense streaming
- [ ] Route-level `error.tsx` and `not-found.tsx`
- [ ] Empty states with calls to action
- [ ] Retry buttons for failed requests

## 4. Data layer
- [ ] Pagination (cursor-based preferred over offset)
- [ ] Server-side search and filtering
- [ ] Sorting
- [ ] Selecting only needed columns
- [ ] Database indexes on filtered and sorted fields
- [ ] Avoiding N+1 queries
- [ ] Soft delete or undo
- [ ] Timestamps via `created_at` and `updated_at`

## 5. Caching and rendering
- [ ] Route revalidation with `revalidatePath` and `revalidateTag`
- [ ] Choosing static, dynamic, or cached rendering per page
- [ ] Caching external API responses
- [ ] `next/image` and `next/font`

## 6. Security
- [ ] Row Level Security on every table
- [ ] Storage policies scoped to the user's folder
- [ ] Signed URLs for private files
- [ ] Rate limiting on auth and paid or external endpoints
- [ ] Content Security Policy and security headers
- [ ] Output escaping against XSS
- [ ] Dependency audit (`npm audit`)
- [ ] Secret scanning before push

## 7. Accessibility and responsiveness
- [ ] Semantic HTML
- [ ] Keyboard navigation and focus states
- [ ] ARIA labels for dynamic messages
- [ ] Color contrast
- [ ] Mobile-first layouts
- [ ] Dark mode

## 8. Performance
- [ ] Lighthouse score targets
- [ ] Bundle size awareness (dynamic imports)
- [ ] Minimizing client components
- [ ] Image optimization

## 9. Observability and operations
- [ ] Structured server logging
- [ ] Vercel logs and error tracking
- [ ] Health check route
- [ ] Environment-specific configuration

## 10. Testing
- [x] Zod schema unit tests (plus services, actions, components)
- [ ] Smoke test on the production URL
- [ ] Manual failure testing: offline, bad key, empty data, oversized file

## 11. Engineering practices
- [ ] Conventional commit messages
- [ ] Small, focused commits
- [ ] Clean folder structure
- [ ] Consistent naming
- [ ] No unused code or dead imports
- [ ] Build and lint passing before every push

## 12. Documentation and architecture
- [ ] Architecture diagram
- [ ] Data model diagram
- [ ] Decision notes on key choices (why Supabase, why Server Actions, why this rate-limit approach)
- [ ] API and environment variable reference
