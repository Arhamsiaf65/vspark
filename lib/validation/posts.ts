import { z } from "zod";

export const PLATFORMS = ["instagram", "x", "linkedin", "facebook", "tiktok"] as const;
export const TONES = ["friendly", "professional", "playful", "inspirational", "bold"] as const;

export const generateSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(5, "Describe your post in at least 5 characters")
    .max(500, "Keep the prompt under 500 characters"),
  platform: z.enum(PLATFORMS, { error: "Pick a platform" }),
  tone: z.enum(TONES, { error: "Pick a tone" }),
});
export type GenerateInput = z.infer<typeof generateSchema>;

const hashtag = z
  .string()
  .trim()
  .regex(/^#?[\p{L}\p{N}_]{1,40}$/u, "Hashtags use letters, numbers or _ only");

/** Fields shared by create and edit. */
const base = {
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(80, "Title must be 80 characters or fewer"),
  caption: z.string().trim().min(3, "Caption must be at least 3 characters").max(2200, "Caption must be 2200 characters or fewer"),
  hashtags: z.array(hashtag).max(30, "Use at most 30 hashtags").default([]),
  platform: z.enum(PLATFORMS, { error: "Pick a platform" }),
  notes: z.string().trim().max(500, "Notes must be 500 characters or fewer").optional(),
};

export const MIN_LEAD_MS = 60_000;

/** ISO string that must be in the future. Field-level so the message attaches live. */
const futureDate = z
  .string()
  .min(1, "Pick a date and time")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date and time")
  .refine((v) => Date.parse(v) > Date.now() + MIN_LEAD_MS, "Pick a time at least a minute in the future");

const lead = z.coerce.number().int("Whole minutes only").min(0, "Cannot be negative").max(10080, "Maximum is 7 days (10080)");

export const savePostSchema = z.object({
  ...base,
  scheduledAt: futureDate,
  leadMinutes: z.union([z.literal(""), lead]).optional(),
});
export type SavePostInput = z.infer<typeof savePostSchema>;

/** Edit allows keeping a past time on an already-sent post, so scheduling is optional. */
export const updatePostSchema = z.object({
  id: z.uuid("Invalid post"),
  title: base.title,
  caption: base.caption,
  hashtags: base.hashtags,
  notes: base.notes,
  scheduledAt: z.string().optional(),
  leadMinutes: z.union([z.literal(""), lead]).optional(),
});
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const deletePostSchema = z.object({ id: z.uuid("Invalid post") });

/** Turn "#a #b, c" into ["a","b","c"]. */
export function parseHashtags(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#/, "").trim())
    .filter(Boolean);
}
