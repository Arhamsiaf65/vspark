import { describe, expect, it } from "vitest";
import { generateSchema, parseHashtags, savePostSchema, updatePostSchema } from "@/lib/validation/posts";
import { settingsSchema } from "@/lib/validation/settings";

const future = () => new Date(Date.now() + 3600_000).toISOString();
const valid = { title: "Cold brew launch", caption: "Fresh cold brew is here", hashtags: ["coffee"], platform: "instagram", scheduledAt: future() };

describe("generateSchema", () => {
  it("accepts a normal prompt", () => {
    expect(generateSchema.safeParse({ prompt: "Launching cold brew", platform: "x", tone: "bold" }).success).toBe(true);
  });
  it("rejects short and oversized prompts with actionable messages", () => {
    const short = generateSchema.safeParse({ prompt: "hi", platform: "x", tone: "bold" });
    expect(short.success ? "" : short.error.issues[0].message).toMatch(/at least 5/);
    expect(generateSchema.safeParse({ prompt: "a".repeat(501), platform: "x", tone: "bold" }).success).toBe(false);
  });
  it("rejects unknown platforms", () => {
    expect(generateSchema.safeParse({ prompt: "hello world", platform: "myspace", tone: "bold" }).success).toBe(false);
  });
});

describe("savePostSchema", () => {
  it("accepts a valid post", () => {
    expect(savePostSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects a past schedule on the scheduledAt field", () => {
    const r = savePostSchema.safeParse({ ...valid, scheduledAt: new Date(Date.now() - 1000).toISOString() });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path[0]).toBe("scheduledAt");
  });
  it("rejects missing time, bad hashtags and too many hashtags", () => {
    expect(savePostSchema.safeParse({ ...valid, scheduledAt: "" }).success).toBe(false);
    expect(savePostSchema.safeParse({ ...valid, hashtags: ["bad tag!"] }).success).toBe(false);
    expect(savePostSchema.safeParse({ ...valid, hashtags: Array(31).fill("a") }).success).toBe(false);
  });
  it("limits caption, title and lead minutes", () => {
    expect(savePostSchema.safeParse({ ...valid, caption: "a".repeat(2201) }).success).toBe(false);
    expect(savePostSchema.safeParse({ ...valid, title: "a" }).success).toBe(false);
    expect(savePostSchema.safeParse({ ...valid, leadMinutes: 10081 }).success).toBe(false);
    expect(savePostSchema.safeParse({ ...valid, leadMinutes: "" }).success).toBe(true);
    expect(savePostSchema.safeParse({ ...valid, leadMinutes: "15" }).success).toBe(true);
  });
});

describe("updatePostSchema", () => {
  it("requires a uuid id and allows no schedule change", () => {
    const base = { title: "Edited", caption: "Edited caption", hashtags: [] };
    expect(updatePostSchema.safeParse({ ...base, id: "nope" }).success).toBe(false);
    expect(updatePostSchema.safeParse({ ...base, id: crypto.randomUUID() }).success).toBe(true);
  });
});

describe("parseHashtags", () => {
  it("splits on spaces/commas and strips #", () => {
    expect(parseHashtags("#a, b  #c")).toEqual(["a", "b", "c"]);
    expect(parseHashtags("")).toEqual([]);
  });
});

describe("settingsSchema", () => {
  const ok = { emailEnabled: true, notifyEmail: "", leadMinutes: "30", subjectTemplate: "Post: {{title}}", includeCaption: true, timezone: "Asia/Karachi" };
  it("accepts valid settings, empty email included", () => {
    expect(settingsSchema.safeParse(ok).success).toBe(true);
  });
  it("rejects bad email, timezone and lead time", () => {
    expect(settingsSchema.safeParse({ ...ok, notifyEmail: "nope" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...ok, timezone: "Mars/Base" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...ok, leadMinutes: "-1" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...ok, subjectTemplate: "" }).success).toBe(false);
  });
});
