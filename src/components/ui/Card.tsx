/**
 * Card primitive — a token-styled surface (see globals.css `.card`). No raw hex.
 *
 * Requirements: 10.1, 10.2
 */
import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render with the translucent glass surface instead of the solid panel. */
  glass?: boolean;
}

export function Card({ glass = false, className, children, ...rest }: CardProps) {
  const classes = ["card", glass ? "card--glass" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
