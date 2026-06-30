/**
 * ErrorState — a reusable error state (Persian, token-styled). Shows a safe,
 * generic message; never leaks internal error detail to the UI.
 *
 * Requirements: 10.1, 10.2
 */
import * as React from "react";

export interface ErrorStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function ErrorState({ title, description, action }: ErrorStateProps) {
  return (
    <div className="state state--error" role="alert">
      <div className="state__icon" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
          <path d="M12 7v6" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="0.75" fill="currentColor" stroke="none" />
        </svg>
      </div>
      <p className="state__title">{title}</p>
      {description ? <p className="state__desc">{description}</p> : null}
      {action ? <div className="state__action">{action}</div> : null}
    </div>
  );
}
