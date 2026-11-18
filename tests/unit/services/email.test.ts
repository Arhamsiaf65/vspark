import { afterEach, describe, expect, it, vi } from "vitest";
import { renderBody, renderSubject, sendReminder } from "@/lib/services/email";

const mail = {
  to: "a@b.co",
  subjectTemplate: "Time: {{title}}",
  title: "Launch <b>",
  caption: "Hello <script>alert(1)</script>",
  hashtags: ["x"],
  platform: "x",
  scheduledAt: "2026-12-01T10:00:00.000Z",
  timezone: "UTC",
  includeCaption: true,
};

afterEach(() => vi.unstubAllGlobals());

describe("email rendering", () => {
  it("fills template variables and strips newlines", () => {
    expect(renderSubject("{{title}} on {{platform}} at {{when}}\n", { title: "T", platform: "x", when: "noon" })).toBe("T on x at noon ");
  });
  it("escapes user content (XSS)", () => {
    const html = renderBody(mail, "noon");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
  it("omits the caption when disabled", () => {
    expect(renderBody({ ...mail, includeCaption: false }, "noon")).not.toContain("blockquote");
  });
});

describe("sendReminder", () => {
  it("returns data on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    expect((await sendReminder(mail)).error).toBeNull();
  });
  it("returns an error (never throws) on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    expect((await sendReminder(mail)).error).toBe("resend 403");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect((await sendReminder(mail)).error).toBe("offline");
  });
});
