export type ActionResult<T = void> =
  | { ok: true; data?: T; message?: string; warning?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
