/**
 * LoadingState — a reusable loading indicator (Persian, token-styled).
 *
 * Requirements: 10.1, 10.2
 */
import * as React from "react";
import { t } from "@/lib/i18n";

export interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <div className="state" role="status" aria-live="polite">
      <div className="state__spinner" aria-hidden="true" />
      <p className="state__desc">{label ?? t.states.loading}</p>
    </div>
  );
}
