/**
 * CountGrid — a token-styled grid of labelled numeric counts.
 *
 * Used across the operational workbench and reference/Taksa workbench routes to
 * render REAL, DB-derived counts (never fabricated). Counts use tabular digits
 * (the `tabular-digits` utility). No raw hex — styling flows through the design
 * tokens via globals.css (`.count-grid` / `.count-card`).
 *
 * Requirements: 10.1, 10.2, 10.4
 */
import * as React from "react";
import { Card } from "./Card";
import { formatNumber } from "@/lib/i18n";

export interface CountEntry {
  label: string;
  value: number;
}

export interface CountGridProps {
  entries: CountEntry[];
}

export function CountGrid({ entries }: CountGridProps) {
  return (
    <div className="count-grid">
      {entries.map((e) => (
        <Card key={e.label} className="count-card">
          <span className="count-card__value tabular-digits">{formatNumber(e.value)}</span>
          <span className="count-card__label">{e.label}</span>
        </Card>
      ))}
    </div>
  );
}
