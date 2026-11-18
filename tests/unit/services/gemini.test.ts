import { afterEach, describe, expect, it, vi } from "vitest";
import { generateCaptions } from "@/lib/services/gemini";

const input = { prompt: "cold brew launch", platform: "instagram", tone: "friendly" } as const;
const reply = (obj: unknown) => ({
  ok: true,
  json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }),
});

afterEach(() => vi.unstubAllGlobals());

describe("generateCaptions", () => {
  it("returns cleaned options", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ options: [{ caption: " Hi ", hashtags: ["#coffee", "a b!"] }] })));
    const r = await generateCaptions(input);
    expect(r.data).toEqual([{ caption: "Hi", hashtags: ["coffee", "ab"] }]);
  });
  it("sends the key in a header, not the URL", async () => {
    const f = vi.fn().mockResolvedValue(reply({ options: [{ caption: "x y z", hashtags: [] }] }));
    vi.stubGlobal("fetch", f);
    await generateCaptions(input);
    expect(String(f.mock.calls[0][0])).not.toContain("test-gemini-key");
    expect(f.mock.calls[0][1].headers["x-goog-api-key"]).toBe("test-gemini-key-000");
  });
  it("fails safely on HTTP errors and malformed output", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    expect((await generateCaptions(input)).error).toBe("gemini 429");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ nope: 1 })));
    expect((await generateCaptions(input)).error).toBe("gemini bad shape");
  });
});
