/**
 * Taksa imports map (SERVER, protected) — /taksa/imports.
 *
 * An HONEST, product-specific map of the required Taksa source types and what
 * IS implemented (source registration, reference schema, raw-preservation
 * schema, mapping contracts, importer foundation) versus what is INTENTIONALLY
 * NOT implemented yet (full Taksa DB restore, SVZT/BRVT/PSNT parser, PDF
 * extraction, export serialization). It deliberately does NOT claim a parser
 * exists.
 *
 * Requirements: 9.4, 15.6, 10.4
 */
import * as React from "react";
import { requirePageUser } from "@/server/auth/page-guard";
import { t } from "@/lib/i18n";

function ListPanel({ title, items, tone }: { title: string; items: readonly string[]; tone: string }) {
  return (
    <section className={`panel-section panel-section--${tone}`}>
      <h2 className="panel-section__title">{title}</h2>
      <ul className="status-list">
        {items.map((it) => (
          <li key={it} className="status-list__item">
            {it}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function TaksaImportsPage() {
  await requirePageUser("/taksa/imports");

  return (
    <div className="workbench">
      <header className="workbench__header">
        <h1 className="workbench__title">{t.taksa.imports.title}</h1>
        <p className="workbench__subtitle">{t.taksa.imports.subtitle}</p>
      </header>

      <ListPanel
        title={t.taksa.imports.requiredTitle}
        items={t.taksa.imports.requiredSources}
        tone="neutral"
      />
      <ListPanel
        title={t.taksa.imports.implementedTitle}
        items={t.taksa.imports.implemented}
        tone="ok"
      />
      <ListPanel
        title={t.taksa.imports.deferredTitle}
        items={t.taksa.imports.deferred}
        tone="warn"
      />

      <section className="panel-section">
        <p className="panel-section__hint">{t.taksa.imports.honestNote}</p>
      </section>
    </div>
  );
}
