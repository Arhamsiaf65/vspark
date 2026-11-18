import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SettingsInput } from "@/lib/validation/settings";

type Result<T> = { data: T; error: null } | { data: null; error: string };

export type SettingsRow = {
  email_enabled: boolean;
  notify_email: string | null;
  lead_minutes: number;
  subject_template: string;
  include_caption: boolean;
  timezone: string;
};

const COLUMNS = "email_enabled, notify_email, lead_minutes, subject_template, include_caption, timezone";

export async function getSettings(db: SupabaseClient, userId: string): Promise<Result<SettingsRow>> {
  const { data, error } = await db.from("notification_settings").select(COLUMNS).eq("user_id", userId).maybeSingle();
  if (error) return { data: null, error: error.message };
  if (data) return { data: data as SettingsRow, error: null };
  // Row missing (user predates the trigger): create defaults.
  const created = await db.from("notification_settings").insert({ user_id: userId }).select(COLUMNS).single();
  return created.error ? { data: null, error: created.error.message } : { data: created.data as SettingsRow, error: null };
}

export async function saveSettings(db: SupabaseClient, userId: string, input: SettingsInput): Promise<Result<SettingsRow>> {
  const { data, error } = await db
    .from("notification_settings")
    .upsert(
      {
        user_id: userId,
        email_enabled: input.emailEnabled,
        notify_email: input.notifyEmail === "" ? null : input.notifyEmail,
        lead_minutes: input.leadMinutes,
        subject_template: input.subjectTemplate,
        include_caption: input.includeCaption,
        timezone: input.timezone,
      },
      { onConflict: "user_id" },
    )
    .select(COLUMNS)
    .single();
  return error ? { data: null, error: error.message } : { data: data as SettingsRow, error: null };
}
