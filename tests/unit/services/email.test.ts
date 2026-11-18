import { afterEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.hoisted(() => vi.fn());
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail }) } }));

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

afterEach(() => sendMail.mockReset());

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
  it("sends via SMTP with the rendered subject", async () => {
    sendMail.mockResolvedValue({});
    expect((await sendReminder(mail)).error).toBeNull();
    expect(sendMail.mock.calls[0][0]).toMatchObject({ to: "a@b.co", subject: expect.stringContaining("Time: Launch") });
  });
  it("returns an error (never throws) when SMTP fails", async () => {
    sendMail.mockRejectedValue(new Error("Invalid login"));
    expect((await sendReminder(mail)).error).toBe("Invalid login");
  });
});
