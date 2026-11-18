import { z } from "zod";

export const captionOptionsSchema = z.object({
  options: z
    .array(
      z.object({
        caption: z.string().min(1).max(2200),
        hashtags: z.array(z.string().max(60)).max(30),
      }),
    )
    .min(1)
    .max(3),
});
export type CaptionOptions = z.infer<typeof captionOptionsSchema>;
export type CaptionOption = CaptionOptions["options"][number];
