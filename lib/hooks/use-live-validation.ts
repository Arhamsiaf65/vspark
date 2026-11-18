"use client";
import { useCallback, useState } from "react";
import type { z } from "zod";

/**
 * Live validation from the SAME Zod schema the server uses.
 * - blur: validate that field
 * - typing: validate once the field has a value or was touched
 * - while untouched, "incomplete" issues (too_small / invalid_format) wait for blur
 */
export function useLiveValidation<S extends z.ZodType>(schema: S) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [edited, setEdited] = useState<Record<string, boolean>>({});

  const run = useCallback(
    (values: Record<string, unknown>, field?: string, isTouched = true) => {
      const res = schema.safeParse(values);
      const next: Record<string, string> = {};
      if (!res.success) {
        for (const issue of res.error.issues) {
          const key = String(issue.path[0] ?? "");
          if (!key || next[key]) continue;
          const incomplete = issue.code === "too_small" || issue.code === "invalid_format";
          if (field === key && !isTouched && incomplete) continue;
          next[key] = issue.message;
        }
      }
      return next;
    },
    [schema],
  );

  const validateField = useCallback(
    (values: Record<string, unknown>, field: string, opts: { blur?: boolean } = {}) => {
      const wasTouched = touched[field] || opts.blur === true;
      if (opts.blur) setTouched((t) => ({ ...t, [field]: true }));
      else setEdited((e) => ({ ...e, [field]: true }));
      const value = values[field];
      const hasValue = value !== "" && value !== undefined && value !== null;
      if (!opts.blur && !wasTouched && !hasValue) {
        setErrors((e) => {
          const rest = { ...e };
          delete rest[field];
          return rest;
        });
        return;
      }
      const all = run(values, field, !!wasTouched);
      setErrors((e) => {
        const rest = { ...e };
        delete rest[field];
        return all[field] ? { ...rest, [field]: all[field] } : rest;
      });
    },
    [run, touched],
  );

  /** Validate everything (submit). Returns true if valid. */
  const validateAll = useCallback(
    (values: Record<string, unknown>) => {
      const all = run(values);
      setErrors(all);
      setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])));
      setEdited({});
      return Object.keys(all).length === 0;
    },
    [run],
  );

  /** Client error wins while the user is editing; server errors show until the field is edited. */
  const errorFor = useCallback(
    (name: string, serverErrors?: Record<string, string[]>) => errors[name] ?? (edited[name] ? undefined : serverErrors?.[name]?.[0]),
    [errors, edited],
  );

  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
    setEdited({});
  }, []);

  return { errors, validateField, validateAll, errorFor, reset };
}
