/**
 * InboxView — pure presentational component for the inbox.
 *
 * Renders only from the provided items. Empty input yields a real empty state;
 * no fake tasks/cards are ever produced.
 *
 * Requirements: 10.4
 */
import * as React from "react";
import { Badge } from "@/components/ui";
import { EmptyState } from "@/components/states";
import { t } from "@/lib/i18n";
import type { InboxItem } from "@/server/inbox";

export interface InboxViewProps {
  items: InboxItem[];
}

export function InboxView({ items }: InboxViewProps) {
  if (items.length === 0) {
    return <EmptyState title={t.inbox.empty} description={t.inbox.emptyDescription} />;
  }

  return (
    <section className="panel-section">
      <ul className="record-list">
        {items.map((item) => (
          <li key={item.id} className="record-list__item">
            <div className="record-list__main">
              <span className="record-list__title">{item.title}</span>
              <span className="record-list__meta">{item.projectName}</span>
            </div>
            <Badge tone="info">{item.state}</Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}
