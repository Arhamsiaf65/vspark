import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

type Common = { label: string; error?: string; hint?: ReactNode };

const control =
  "w-full rounded-2xl border bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-muted focus-visible:outline-brand";

function Field({ id, label, error, hint, children }: Common & { id: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <div className="text-xs text-muted">{hint}</div> : null}
      <p id={`${id}-err`} aria-live="polite" className="min-h-0 text-xs font-medium text-danger">
        {error}
      </p>
    </div>
  );
}

const a11y = (id: string, error?: string) => ({
  "aria-invalid": error ? true : undefined,
  "aria-describedby": error ? `${id}-err` : undefined,
});

export function Input({ label, error, hint, className = "", ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <input id={id} {...a11y(id, error)} {...rest} className={`${control} ${error ? "border-danger" : "border-line"} ${className}`} />
    </Field>
  );
}

export function Textarea({ label, error, hint, className = "", ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <textarea id={id} {...a11y(id, error)} {...rest} className={`${control} min-h-24 ${error ? "border-danger" : "border-line"} ${className}`} />
    </Field>
  );
}

export function Select({ label, error, hint, children, className = "", ...rest }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <select id={id} {...a11y(id, error)} {...rest} className={`${control} ${error ? "border-danger" : "border-line"} ${className}`}>
        {children}
      </select>
    </Field>
  );
}

export function CharCount({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span className={over ? "font-medium text-danger" : undefined}>
      {value.length}/{max}
    </span>
  );
}
