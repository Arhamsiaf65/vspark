"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useLiveValidation } from "@/lib/hooks/use-live-validation";
import { listQuerySchema, SORTS, STATUS_FILTERS, type ListQuery } from "@/lib/validation/posts";
import { CharCount, Input, Select } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/SubmitButton";

const SORT_LABELS: Record<(typeof SORTS)[number], string> = {
  soonest: "Publishing soonest",
  newest: "Recently created",
  oldest: "Oldest first",
};

/** Search / filter / sort. Navigates with query params; the server does the querying. */
export function PostFilters({ initial }: { initial: Pick<ListQuery, "q" | "status" | "sort"> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState(initial);
  const live = useLiveValidation(listQuerySchema);

  const set = <K extends keyof typeof f>(field: K, value: (typeof f)[K], blur = false) => {
    const next = { ...f, [field]: value };
    setF(next);
    live.validateField(next, field, { blur });
  };

  function go(next: typeof f) {
    const params = new URLSearchParams();
    if (next.q.trim()) params.set("q", next.q.trim());
    params.set("status", next.status);
    params.set("sort", next.sort);
    start(() => router.push(`/dashboard?${params.toString()}`));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (live.validateAll(f)) go(f);
  }

  return (
    <form onSubmit={onSubmit} noValidate role="search" aria-label="Search posts" className="card grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-start">
      <Input
        label="Search"
        type="search"
        value={f.q}
        placeholder="Title or caption"
        onChange={(e) => set("q", e.target.value)}
        onBlur={(e) => set("q", e.target.value, true)}
        error={live.errorFor("q")}
        hint={<CharCount value={f.q} max={80} />}
      />
      <Select label="Status" value={f.status} onChange={(e) => set("status", e.target.value as typeof f.status)}>
        {STATUS_FILTERS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      <Select label="Sort by" value={f.sort} onChange={(e) => set("sort", e.target.value as typeof f.sort)}>
        {SORTS.map((s) => (
          <option key={s} value={s}>
            {SORT_LABELS[s]}
          </option>
        ))}
      </Select>
      <SubmitButton pending={pending} pendingLabel="Searching…" className="btn btn-dark sm:mt-7">
        Apply
      </SubmitButton>
    </form>
  );
}
