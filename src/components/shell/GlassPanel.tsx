/**
 * GlassPanel — the liquid-glass surface used by the shell frame and major
 * panels. Token-driven (see globals.css `.glass-panel`); no raw hex.
 *
 * Requirements: 10.1, 10.2, 10.3
 */
import * as React from "react";

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: "div" | "section" | "aside" | "header" | "nav";
  strong?: boolean;
}

export function GlassPanel({
  as = "div",
  strong = false,
  className,
  children,
  ...rest
}: GlassPanelProps) {
  const Tag = as;
  const classes = ["glass-panel", strong ? "glass-panel--strong" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
