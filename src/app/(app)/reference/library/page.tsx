/**
 * Reference Library (SERVER, protected) — /reference/library.
 *
 * Real summaries/counts for the normalized reference entities (books, chapters,
 * items, units, resources, index periods, circulars, coefficients, deductions,
 * mappings). When empty it shows the exact "library not yet complete" message.
 * No fake rows, no sample official values.
 *
 * Requirements: 15.1, 15.2, 15.5, 10.4
 */
import * as React from "react";
import { requirePageUser } from "@/server/auth/page-guard";
import { loadReferenceLibrary } from "@/server/reference/queries";
import { CountGrid } from "@/components/ui";
import { EmptyState, ErrorState } from "@/components/states";
import { t } from "@/lib/i18n";
import { workbench as wb } from "@/lib/i18n/labels";

export default async function ReferenceLibraryPage() {
  await requirePageUser("/reference/library");

  let library;
  try {
    library = await loadReferenceLibrary();
  } catch {
    return <ErrorState title={t.states.errorTitle} description={t.states.errorDescription} />;
  }

  return (
    <div className="workbench">
      <header className="workbench__header">
        <h1 className="workbench__title">{t.reference.library.title}</h1>
        <p className="workbench__subtitle">{t.reference.library.subtitle}</p>
      </header>

      {library.isEmpty ? (
        <EmptyState title={t.reference.library.empty} />
      ) : (
        <section className="panel-section">
          <h2 className="panel-section__title">{t.reference.library.countsTitle}</h2>
          <CountGrid entries={wb.libraryCountEntries(library.counts)} />
        </section>
      )}
    </div>
  );
}
