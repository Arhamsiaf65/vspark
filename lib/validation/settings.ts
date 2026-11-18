import { z } from "zod";

export const settingsSchema = z.object({
  emailEnabled: z.boolean(),
  notifyEmail: z
    .string()
    .trim()
    .max(254, "Email is too long")
    .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email like name@example.com"),
  leadMinutes: z.coerce.number().int("Whole minutes only").min(0, "Cannot be negative").max(10080, "Maximum is 7 days (10080)"),
  subjectTemplate: z
    .string()
    .trim()
    .min(1, "Subject is required")
    .max(120, "Subject must be 120 characters or fewer"),
  includeCaption: z.boolean(),
  timezone: z
    .string()
    .trim()
    .min(1, "Pick a timezone")
    .max(64, "Timezone is too long")
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "Use a timezone like Asia/Karachi or UTC"),
});
export type SettingsInput = z.infer<typeof settingsSchema>;
