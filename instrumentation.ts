import type { Instrumentation } from "next";

/** Unhandled server errors land in Vercel logs as one redacted JSON line (searchable, no stack traces to users). */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const { log } = await import("@/lib/security");
  const message = err instanceof Error ? err.message : String(err);
  log("error", `unhandled: ${message}`, { path: request.path.split("?")[0], method: request.method, route: context.routePath });
};
