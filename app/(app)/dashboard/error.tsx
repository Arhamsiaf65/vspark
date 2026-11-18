"use client";

import { ErrorPanel } from "@/components/ui/Panels";

export default function DashboardError({ unstable_retry }: { error: Error; unstable_retry: () => void }) {
  return <ErrorPanel message="This page hit a problem. Your data is safe." onRetry={unstable_retry} />;
}
