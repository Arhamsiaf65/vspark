"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { generateCaptionsAction, savePostAction } from "@/app/(app)/dashboard/actions";
import { useLiveValidation } from "@/lib/hooks/use-live-validation";
import { generateSchema, parseHashtags, PLATFORMS, savePostSchema, TONES } from "@/lib/validation/posts";
import type { CaptionOption } from "@/lib/validation/ai";
import { CharCount, Input, Select, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/SubmitButton";

type ServerErrors = Record<string, string[]> | undefined;

/** `datetime-local` value (device time) -> ISO string, or "" when empty/invalid. */
export function localToIso(v: string): string {
  const t = Date.parse(v);
  return v && !Number.isNaN(t) ? new Date(t).toISOString() : "";
}

export function Composer() {
  const [pending, start] = useTransition();
  const [options, setOptions] = useState<CaptionOption[]>([]);
  const [picked, setPicked] = useState<CaptionOption | null>(null);
  const [gen, setGen] = useState({ prompt: "", platform: "instagram", tone: "friendly" });
  const [serverErrors, setServerErrors] = useState<ServerErrors>();
  const live = useLiveValidation(generateSchema);

  const set = (field: keyof typeof gen, value: string, blur = false) => {
    const next = { ...gen, [field]: value };
    setGen(next);
    live.validateField(next, field, { blur });
  };

  function run(fresh: boolean) {
    setServerErrors(undefined);
    start(async () => {
      const res = await generateCaptionsAction(gen, fresh);
      if (!res.ok) {
        setServerErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      setOptions(res.data ?? []);
      setPicked(null);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (live.validateAll(gen)) run(false);
  }

  return (
    <section aria-labelledby="gen-h" className="space-y-6">
      <form onSubmit={onSubmit} noValidate className="card space-y-4">
        <h2 id="gen-h" className="font-display text-xl font-bold">
          1 · Generate captions
        </h2>
        <Textarea
          label="What is the post about?"
          name="prompt"
          value={gen.prompt}
          maxLength={600}
          placeholder="Launching our new cold brew at the campus café this Friday"
          onChange={(e) => set("prompt", e.target.value)}
          onBlur={(e) => set("prompt", e.target.value, true)}
          error={live.errorFor("prompt", serverErrors)}
          hint={<CharCount value={gen.prompt} max={500} />}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Platform" value={gen.platform} onChange={(e) => set("platform", e.target.value)} error={live.errorFor("platform", serverErrors)}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <Select label="Tone" value={gen.tone} onChange={(e) => set("tone", e.target.value)} error={live.errorFor("tone", serverErrors)}>
            {TONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <SubmitButton pending={pending} pendingLabel="Asking Gemini…">
            Generate 3 options
          </SubmitButton>
          {options.length > 0 && (
            <button type="button" className="btn btn-outline" disabled={pending} onClick={() => live.validateAll(gen) && run(true)}>
              Regenerate
            </button>
          )}
        </div>
      </form>

      {options.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-3" aria-label="Caption options">
          {options.map((o, i) => (
            <li key={i} className={`card flex flex-col gap-3 ${picked === o ? "ring-2 ring-brand" : ""}`}>
              <p className="whitespace-pre-wrap text-sm">{o.caption}</p>
              <p className="text-xs font-medium text-brand-strong">{o.hashtags.map((h) => `#${h}`).join(" ")}</p>
              <button type="button" className="btn btn-outline btn-sm mt-auto" onClick={() => setPicked(o)}>
                {picked === o ? "Selected" : "Use this caption"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {picked && <ScheduleForm key={picked.caption} option={picked} platform={gen.platform} promptHint={gen.prompt} onSaved={() => setPicked(null)} />}
    </section>
  );
}

function ScheduleForm({ option, platform, promptHint, onSaved }: { option: CaptionOption; platform: string; promptHint: string; onSaved: () => void }) {
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    title: promptHint.slice(0, 60).trim(),
    caption: option.caption,
    hashtagsText: option.hashtags.map((h) => `#${h}`).join(" "),
    platform,
    when: "",
    leadMinutes: "",
    notes: "",
  });
  const [serverErrors, setServerErrors] = useState<ServerErrors>();
  const live = useLiveValidation(savePostSchema);

  const values = (x = f) => ({
    title: x.title,
    caption: x.caption,
    hashtags: parseHashtags(x.hashtagsText),
    platform: x.platform,
    scheduledAt: localToIso(x.when),
    leadMinutes: x.leadMinutes,
    notes: x.notes || undefined,
  });
  const keyOf = (field: keyof typeof f) => (field === "hashtagsText" ? "hashtags" : field === "when" ? "scheduledAt" : field);

  const set = (field: keyof typeof f, value: string, blur = false) => {
    const next = { ...f, [field]: value };
    setF(next);
    live.validateField(values(next), keyOf(field), { blur });
  };
  const err = (name: string) => live.errorFor(name, serverErrors);
  const bind = (field: keyof typeof f) => ({
    value: f[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>) => set(field, e.target.value),
    onBlur: (e: React.FocusEvent<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>) => set(field, e.target.value, true),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!live.validateAll(values())) return;
    setServerErrors(undefined);
    start(async () => {
      const res = await savePostAction(values());
      if (!res.ok) {
        setServerErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Saved.");
      if (res.warning) toast.warning(res.warning);
      onSaved();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card space-y-4" aria-labelledby="sched-h">
      <h2 id="sched-h" className="font-display text-xl font-bold">
        2 · Schedule &amp; save to Drive
      </h2>
      <Input label="Task title" {...bind("title")} error={err("title")} hint={<CharCount value={f.title} max={80} />} />
      <Textarea label="Caption" {...bind("caption")} error={err("caption")} hint={<CharCount value={f.caption} max={2200} />} />
      <Input label="Hashtags" {...bind("hashtagsText")} error={err("hashtags")} hint="Separate with spaces or commas" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Publish at (your device time)" type="datetime-local" {...bind("when")} error={err("scheduledAt")} />
        <Input
          label="Remind me before (minutes)"
          type="number"
          inputMode="numeric"
          min={0}
          max={10080}
          placeholder="Use my default"
          {...bind("leadMinutes")}
          error={err("leadMinutes")}
          hint="Leave empty to use your notification settings"
        />
      </div>
      <Textarea label="Notes (optional)" {...bind("notes")} error={err("notes")} hint={<CharCount value={f.notes} max={500} />} className="min-h-16" />
      <SubmitButton pending={pending} pendingLabel="Saving…">
        Schedule post
      </SubmitButton>
    </form>
  );
}
