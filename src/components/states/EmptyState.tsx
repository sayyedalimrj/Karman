/**
 * EmptyState — a reusable, product-quality empty state (Persian, token-styled).
 *
 * Used for genuine "no data yet" situations driven by real queries — never to
 * fabricate or imply data that does not exist.
 *
 * Requirements: 10.1, 10.2, 10.4
 */
import * as React from "react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional call-to-action (e.g. a link/button) rendered below the text. */
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="state" role="status">
      <div className="state__icon" aria-hidden="true">
        {/* Simple token-colored glyph; currentColor inherits the token text color. */}
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="1.5" />
          <path d="M3 9h18" strokeWidth="1.5" />
          <path d="M8 14h8" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <p className="state__title">{title}</p>
      {description ? <p className="state__desc">{description}</p> : null}
      {action ? <div className="state__action">{action}</div> : null}
    </div>
  );
}
