// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { useLiveValidation } from "@/lib/hooks/use-live-validation";

const schema = z.object({ name: z.string().min(3, "Too short").max(5, "Too long"), email: z.email("Bad email") });

describe("useLiveValidation", () => {
  it("does not nag 'incomplete' while typing, but shows it on blur", () => {
    const { result } = renderHook(() => useLiveValidation(schema));
    act(() => result.current.validateField({ name: "ab", email: "" }, "name"));
    expect(result.current.errors.name).toBeUndefined();
    act(() => result.current.validateField({ name: "ab", email: "" }, "name", { blur: true }));
    expect(result.current.errors.name).toBe("Too short");
  });
  it("shows 'too long' immediately", () => {
    const { result } = renderHook(() => useLiveValidation(schema));
    act(() => result.current.validateField({ name: "abcdefg", email: "" }, "name"));
    expect(result.current.errors.name).toBe("Too long");
  });
  it("clears the error once the value is fixed", () => {
    const { result } = renderHook(() => useLiveValidation(schema));
    act(() => result.current.validateField({ name: "a", email: "" }, "name", { blur: true }));
    expect(result.current.errors.name).toBeDefined();
    act(() => result.current.validateField({ name: "abcd", email: "" }, "name"));
    expect(result.current.errors.name).toBeUndefined();
  });
  it("validateAll blocks on invalid input and passes on valid input", () => {
    const { result } = renderHook(() => useLiveValidation(schema));
    let ok = true;
    act(() => void (ok = result.current.validateAll({ name: "", email: "x" })));
    expect(ok).toBe(false);
    expect(Object.keys(result.current.errors).sort()).toEqual(["email", "name"]);
    act(() => void (ok = result.current.validateAll({ name: "abcd", email: "a@b.co" })));
    expect(ok).toBe(true);
  });
  it("server errors show until the user edits that field", () => {
    const { result } = renderHook(() => useLiveValidation(schema));
    const server = { name: ["Taken"] };
    expect(result.current.errorFor("name", server)).toBe("Taken");
    act(() => result.current.validateField({ name: "abcd", email: "" }, "name"));
    expect(result.current.errorFor("name", server)).toBeUndefined();
  });
});
