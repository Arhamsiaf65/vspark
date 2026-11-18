import type { ButtonHTMLAttributes } from "react";

/** Disables itself while pending to prevent double submits. */
export function SubmitButton({
  pending,
  children,
  pendingLabel = "Working…",
  className = "btn btn-primary",
  ...rest
}: { pending: boolean; pendingLabel?: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className} {...rest}>
      {pending ? pendingLabel : children}
    </button>
  );
}
