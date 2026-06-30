/**
 * Reference Sources (SERVER, protected) — /reference/sources.
 *
 * Lists REAL ReferenceSource rows and, for users who may manage projects,
 * surfaces the real source-registration form. Registration authorization is
 * still enforced server-side by the action (this visibility is presentation
 * only). No fake import data is ever shown.
 *
 * Requirements: 15.1, 15.4, 4.2, 10.4
 */
import * as React from "react";
import { requirePageUser } from "@/server/auth/page-guard";
import { loadReferenceSources } from "@/server/reference/queries";
import { canManageProjects } from "@/components/shell/nav";
import { Badge } from "@/components/ui";
import { EmptyState, ErrorState } from "@/components/states";
import { t, formatDate } from "@/lib/i18n";
import { RegisterSourceForm } from "./RegisterSourceForm";

export default async function ReferenceSourcesPage() {
  const user = await requirePageUser("/reference/sources");

  let sources;
  try {
    sources = await loadReferenceSources();
  } catch {
    return <ErrorState title={t.states.errorTitle} description={t.states.errorDescription} />;
  }

  const mayRegister = canManageProjects(user.systemRole);

  return (
    <div className="workbench">
      <header className="workbench__header">
        <h1 className="workbench__title">{t.reference.sources.title}</h1>
        <p className="workbench__subtitle">{t.reference.sources.subtitle}</p>
      </header>

      {mayRegister ? (
        <section className="panel-section">
          <h2 className="panel-section__title">{t.reference.sources.registerTitle}</h2>
          <RegisterSourceForm />
        </section>
      ) : null}

      <section className="panel-section">
        <h2 className="panel-section__title">{t.reference.sources.listTitle}</h2>
        {sources.length === 0 ? (
          <EmptyState title={t.reference.sources.empty} />
        ) : (
          <ul className="record-list">
            {sources.map((s) => (
              <li key={s.id} className="record-list__item">
                <div className="record-list__main">
                  <span className="record-list__title">{s.name}</span>
                  <span className="record-list__meta">
                    {s.originalDbName ??
                      s.originalScriptName ??
                      s.originalFileName ??
                      s.checksum ??
                      ""}
                  </span>
                  <span className="record-list__meta tabular-digits">
                    {formatDate(s.createdAt)}
                  </span>
                </div>
                <Badge tone="info">{t.referenceSourceType[s.sourceType]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
