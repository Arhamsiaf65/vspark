# Captionly brand

**Tagline:** Say it well. Post it on time.
**Promise:** Less staring at a blank caption box, more posts that actually go out.
**Personality:** calm, clear, quietly encouraging. Minimal, not loud.

## Logo
A cobalt square with a plain lowercase-style "C" cut from a thick stroke. No sparkles, no gradients: it should look like a printed stamp, not a template.

| File | Use |
|---|---|
| `public/logo.svg` / `app/icon.svg` | App mark, favicon, avatars. Minimum size 16 px. |
| `public/logo-wordmark-light.svg` | Mark + "captionly" on light backgrounds. |
| `public/logo-wordmark-dark.svg` | Mark + "captionly" on dark backgrounds. |

Rules: clear space equal to half the mark's width; never recolour, stretch, rotate or add effects.

## Colour
All colours are tokens in `app/globals.css`. Do not hard-code hex values in components.

| Token | Light | Dark | Role |
|---|---|---|---|
| `canvas` | `#f4f1ea` | `#121110` | Page background (warm paper) |
| `surface` | `#fffdf8` | `#1b1a17` | Cards |
| `ink` | `#161512` | `#f1eee6` | Text, hero background |
| `muted` | `#6b675e` | `#a29d92` | Secondary text |
| `brand` | `#2540e8` | `#7b8cff` | Primary actions (cobalt) |
| `brand-strong` | `#1b2fb8` | `#aab6ff` | Cobalt used as text on surfaces |
| `accent` | `#1f6f50` | `#5fc79a` | Hashtags, "in Drive" (forest green, small use) |
| `success` / `danger` | `#15803d` / `#b91c1c` | `#4ade80` / `#f87171` | Status |

Proportion: mostly paper and ink. Cobalt only on the one primary action per view; green only for small accents. Flat colour only: no gradients, glows, glass or drop shadows.

## Type
- Headings: Plus Jakarta Sans, 800 weight, tight leading (1.05 to 1.15).
- Body: DM Sans, 400 and 500.
- Left-aligned, generous whitespace, hairline rules instead of heavy boxes.

## Voice
Short sentences. Say what to do next.

| Instead of | Write |
|---|---|
| "Invalid input" | "Caption must be at least 3 characters" |
| "Operation failed" | "Couldn't save the post. Please try again." |
| "Success!" | "Post scheduled and saved to Google Drive." |

## Shape and motion
Cards `rounded-2xl`, buttons fully round, thin `line` borders. No hover animation beyond a colour change; reduced-motion is respected.
