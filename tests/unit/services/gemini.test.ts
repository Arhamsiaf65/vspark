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
  it("falls back to the next model when one is overloaded or times out", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockRejectedValueOnce(Object.assign(new Error("timeout"), { name: "TimeoutError" }))
      .mockResolvedValueOnce(reply({ options: [{ caption: "Works now", hashtags: ["a"] }] }));
    vi.stubGlobal("fetch", f);
    const r = await generateCaptions(input);
    expect(r.data).toEqual([{ caption: "Works now", hashtags: ["a"] }]);
    const urls = f.mock.calls.map((c) => String(c[0]));
    expect(new Set(urls).size).toBe(3); // three different models were tried
  });
  it("does not fall back on a bad key or request (400/403)", async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    vi.stubGlobal("fetch", f);
    expect((await generateCaptions(input)).error).toContain("403");
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("fails safely when every model is down, and on malformed output", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    expect((await generateCaptions(input)).error).toContain("429");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ nope: 1 })));
    expect((await generateCaptions(input)).error).toBe("gemini bad shape");
  });
});
