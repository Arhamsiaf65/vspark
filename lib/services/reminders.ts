import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendReminder } from "@/lib/services/email";

type Result<T> = { data: T; error: null } | { data: null; error: string };

type Due = {
  post_id: string;
  title: string;
  caption: string;
  hashtags: string[];
  platform: string;
  scheduled_at: string;
  to_email: string;
  subject_template: string;
  include_caption: boolean;
  timezone: string;
};

/** Claim due posts (atomically marks them), email each, release any whose email failed. */
export async function processDueReminders(db: SupabaseClient, secret: string): Promise<Result<{ sent: number; failed: number }>> {
  const { data, error } = await db.rpc("claim_due_reminders", { p_secret: secret });
  if (error) return { data: null, error: error.message };

  let sent = 0;
  let failed = 0;
  for (const d of (data ?? []) as Due[]) {
    const res = await sendReminder({
      to: d.to_email,
      subjectTemplate: d.subject_template,
      title: d.title,
      caption: d.caption,
      hashtags: d.hashtags,
      platform: d.platform,
      scheduledAt: d.scheduled_at,
      timezone: d.timezone,
      includeCaption: d.include_caption,
    });
    if (res.error) {
      failed += 1;
      await db.rpc("release_reminder", { p_secret: secret, p_post_id: d.post_id });
    } else sent += 1;
  }
  return { data: { sent, failed }, error: null };
}
