/**
 * Badge primitive — token-driven status pill (see globals.css `.badge*`).
 * Colors map to the semantic status tokens; no raw hex in this component.
 *
 * Requirements: 10.1, 10.2
 */
import * as React from "react";

export type BadgeTone = "neutral" | "ok" | "warn" | "error" | "info";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = "neutral", className, children, ...rest }: BadgeProps) {
  const classes = ["badge", `badge--${tone}`, className ?? ""].filter(Boolean).join(" ");
  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}
