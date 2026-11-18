import "server-only";
import { getServerEnv } from "@/lib/env";

type Result<T> = { data: T; error: null } | { data: null; error: string };

export type ReminderEmail = {
  to: string;
  subjectTemplate: string;
  title: string;
  caption: string;
  hashtags: string[];
  platform: string;
  scheduledAt: string;
  timezone: string;
  includeCaption: boolean;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function formatWhen(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short", timeZone: timezone }).format(new Date(iso));
  } catch {
    return new Date(iso).toUTCString();
  }
}

export function renderSubject(template: string, vars: { title: string; platform: string; when: string }): string {
  return template
    .replace(/\{\{\s*title\s*\}\}/g, vars.title)
    .replace(/\{\{\s*platform\s*\}\}/g, vars.platform)
    .replace(/\{\{\s*when\s*\}\}/g, vars.when)
    .replace(/[\r\n]+/g, " ")
    .slice(0, 150);
}

export function renderBody(m: ReminderEmail, when: string): string {
  const tags = m.hashtags.map((h) => `#${esc(h)}`).join(" ");
  const quote = m.includeCaption
    ? `<blockquote style="border-left:4px solid #f97316;margin:0;padding:8px 16px;background:#fff7ed;white-space:pre-wrap">${esc(m.caption)}${tags ? `<br><br>${tags}` : ""}</blockquote>`
    : "";
  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto">
<h2 style="margin:0 0 8px">${esc(m.title)}</h2>
<p style="color:#555;margin:0 0 16px">Scheduled for <strong>${esc(when)}</strong> on ${esc(m.platform)}</p>
${quote}
</div>`;
}

export async function sendReminder(m: ReminderEmail): Promise<Result<true>> {
  try {
    const env = getServerEnv();
    const when = formatWhen(m.scheduledAt, m.timezone);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [m.to],
        subject: renderSubject(m.subjectTemplate, { title: m.title, platform: m.platform, when }),
        html: renderBody(m, when),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    return res.ok ? { data: true, error: null } : { data: null, error: `resend ${res.status}` };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "email failed" };
  }
}
