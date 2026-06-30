/**
 * WorkbenchView — pure presentational component for the operational workbench
 * «میز کار عملیاتی کارمان».
 *
 * Renders ONLY from the data it is given (all real Prisma counts). It shows the
 * five operational status sections (reference data, raw Taksa, projects/
 * contracts, workflow/inbox, readiness). When required reference groups are
 * missing it shows the exact Persian readiness warning. No charts, no fabricated
 * numbers; counts use tabular digits.
 *
 * Kept free of server-only imports so it is unit-testable in a DOM environment.
 *
 * Requirements: 10.4, 15.1, 15.2
 */
import * as React from "react";
import { Badge, CountGrid } from "@/components/ui";
import { t, formatNumber } from "@/lib/i18n";
import type {
  WorkbenchData,
  ReadinessGroup,
} from "@/server/workbench/dashboard";

export interface WorkbenchViewProps {
  data: WorkbenchData;
}

const READINESS_LABELS: Record<ReadinessGroup, string> = {
  hasReferenceSource: t.workbench.groupHasReferenceSource,
  hasReferenceBook: t.workbench.groupHasReferenceBook,
  hasReferenceItem: t.workbench.groupHasReferenceItem,
  hasReferenceUnit: t.workbench.groupHasReferenceUnit,
  hasReferenceIndexPeriod: t.workbench.groupHasReferenceIndexPeriod,
  hasReferenceCircular: t.workbench.groupHasReferenceCircular,
  hasReferenceMapping: t.workbench.groupHasReferenceMapping,
};


export function WorkbenchView({ data }: WorkbenchViewProps) {
  const { referenceCounts: r, taksaRawCounts: tk, projectCounts: p, workflowCounts: w, readiness } =
    data;

  return (
    <div className="workbench">
      <header className="workbench__header">
        <h1 className="workbench__title">{t.workbench.title}</h1>
        <p className="workbench__subtitle">{t.workbench.subtitle}</p>
      </header>

      {/* S1 — reference data status */}
      <section className="panel-section" aria-label={t.workbench.referenceTitle}>
        <h2 className="panel-section__title">{t.workbench.referenceTitle}</h2>
        <CountGrid
          entries={[
            { label: t.workbench.referenceSource, value: r.sources },
            { label: t.workbench.referenceImportRun, value: r.importRuns },
            { label: t.workbench.referenceBook, value: r.books },
            { label: t.workbench.referenceChapter, value: r.chapters },
            { label: t.workbench.referenceItem, value: r.items },
            { label: t.workbench.referenceUnit, value: r.units },
            { label: t.workbench.referenceResource, value: r.resources },
            { label: t.workbench.referenceIndexPeriod, value: r.indexPeriods },
            { label: t.workbench.referenceCircular, value: r.circulars },
            { label: t.workbench.referenceCoefficientRule, value: r.coefficientRules },
            { label: t.workbench.referenceDeductionRule, value: r.deductionRules },
            { label: t.workbench.referenceMapping, value: r.mappings },
          ]}
        />
      </section>

      {/* S2 — raw Taksa status */}
      <section className="panel-section" aria-label={t.workbench.taksaTitle}>
        <h2 className="panel-section__title">{t.workbench.taksaTitle}</h2>
        <CountGrid
          entries={[
            { label: t.workbench.taksaArtifact, value: tk.artifacts },
            { label: t.workbench.taksaRawTable, value: tk.rawTables },
            { label: t.workbench.taksaRawRow, value: tk.rawRows },
          ]}
        />
      </section>


      {/* S3 — projects & contracts (scoped) */}
      <section className="panel-section" aria-label={t.workbench.projectsTitle}>
        <h2 className="panel-section__title">{t.workbench.projectsTitle}</h2>
        <p className="panel-section__hint">
          {data.isSystemAdmin
            ? t.workbench.projectsScopeAdmin
            : t.workbench.projectsScopeMember}
        </p>
        <CountGrid
          entries={[
            { label: t.workbench.project, value: p.projects },
            { label: t.workbench.contract, value: p.contracts },
            { label: t.workbench.projectParty, value: p.parties },
            { label: t.workbench.projectMember, value: p.members },
          ]}
        />
      </section>

      {/* S4 — workflow / inbox (scoped) */}
      <section className="panel-section" aria-label={t.workbench.workflowTitle}>
        <h2 className="panel-section__title">{t.workbench.workflowTitle}</h2>
        <CountGrid
          entries={[
            { label: t.workbench.workflowTotal, value: w.total },
            { label: t.workbench.workflowOpen, value: w.open },
            { label: t.workbench.workflowLocked, value: w.locked },
          ]}
        />
      </section>

      {/* S5 — operational readiness */}
      <section className="panel-section" aria-label={t.workbench.readinessTitle}>
        <h2 className="panel-section__title">{t.workbench.readinessTitle}</h2>
        <div className="readiness">
          <div className="readiness__meter">
            <span className="readiness__percent tabular-digits">
              {formatNumber(readiness.percent)}٪
            </span>
            <span className="readiness__label">{t.workbench.readinessProgress}</span>
            <div
              className="readiness__bar"
              role="progressbar"
              aria-valuenow={readiness.percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span
                className="readiness__bar-fill"
                style={{ inlineSize: `${readiness.percent}%` }}
              />
            </div>
          </div>
          <ul className="readiness__groups">
            {(Object.keys(readiness.groups) as ReadinessGroup[]).map((g) => (
              <li key={g} className="readiness__group">
                <span className="readiness__group-label">{READINESS_LABELS[g]}</span>
                <Badge tone={readiness.groups[g] ? "ok" : "warn"}>
                  {readiness.groups[g] ? t.workbench.groupReady : t.workbench.groupMissing}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
        {readiness.isReady ? (
          <p className="readiness__ready">{t.workbench.readinessComplete}</p>
        ) : (
          <p className="readiness__warning" role="alert">
            {t.workbench.readinessWarning}
          </p>
        )}
      </section>
    </div>
  );
}
