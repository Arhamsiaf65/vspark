"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveSettingsAction } from "@/app/(app)/dashboard/actions";
import { useLiveValidation } from "@/lib/hooks/use-live-validation";
import { settingsSchema } from "@/lib/validation/settings";
import type { SettingsRow } from "@/lib/services/settings";
import { CharCount, Input } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function SettingsForm({ settings }: { settings: SettingsRow }) {
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    emailEnabled: settings.email_enabled,
    notifyEmail: settings.notify_email ?? "",
    leadMinutes: String(settings.lead_minutes),
    subjectTemplate: settings.subject_template,
    includeCaption: settings.include_caption,
    timezone: settings.timezone,
  });
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>();
  const live = useLiveValidation(settingsSchema);

  const set = <K extends keyof typeof f>(field: K, value: (typeof f)[K], blur = false) => {
    const next = { ...f, [field]: value };
    setF(next);
    live.validateField(next, field, { blur });
  };
  const err = (name: string) => live.errorFor(name, serverErrors);
  const text = (field: "notifyEmail" | "leadMinutes" | "subjectTemplate" | "timezone") => ({
    value: f[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(field, e.target.value),
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => set(field, e.target.value, true),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!live.validateAll(f)) return;
    start(async () => {
      const res = await saveSettingsAction(f);
      if (!res.ok) {
        setServerErrors(res.fieldErrors);
        return void toast.error(res.error);
      }
      toast.success(res.message ?? "Saved.");
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card space-y-4" aria-labelledby="set-h">
      <h2 id="set-h" className="font-display text-xl font-bold">
        Email notifications
      </h2>
      <label className="flex items-center gap-3 text-sm font-medium">
        <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={f.emailEnabled} onChange={(e) => set("emailEnabled", e.target.checked)} />
        Send me an email before each scheduled post
      </label>
      <Input label="Send to (leave empty to use your Google email)" type="email" {...text("notifyEmail")} error={err("notifyEmail")} placeholder="name@example.com" />
      <Input label="Default reminder lead time (minutes)" type="number" min={0} max={10080} inputMode="numeric" {...text("leadMinutes")} error={err("leadMinutes")} />
      <Input
        label="Email subject"
        {...text("subjectTemplate")}
        error={err("subjectTemplate")}
        hint={
          <>
            Use {"{{title}}"}, {"{{platform}}"}, {"{{when}}"} · <CharCount value={f.subjectTemplate} max={120} />
          </>
        }
      />
      <label className="flex items-center gap-3 text-sm font-medium">
        <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={f.includeCaption} onChange={(e) => set("includeCaption", e.target.checked)} />
        Include the caption in the email
      </label>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input label="Timezone for email times" {...text("timezone")} error={err("timezone")} placeholder="Asia/Karachi" />
        </div>
        <button type="button" className="btn btn-outline btn-sm mb-6" onClick={() => set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone, true)}>
          Use mine
        </button>
      </div>
      <SubmitButton pending={pending} pendingLabel="Saving…">
        Save settings
      </SubmitButton>
    </form>
  );
}
