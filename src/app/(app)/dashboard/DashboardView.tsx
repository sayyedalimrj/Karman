/**
 * DashboardView — pure presentational component for the dashboard.
 *
 * It renders ONLY from the data it is given. When `data.projects` is empty it
 * shows the real empty state («هنوز پروژه‌ای ثبت نشده است.»); otherwise it shows
 * the real, DB-derived project list and counts. No data is fabricated here.
 *
 * Kept free of server-only imports so it is unit-testable in a DOM environment.
 *
 * Requirements: 10.4
 */
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Card, Badge } from "@/components/ui";
import { EmptyState } from "@/components/states";
import { t, formatNumber } from "@/lib/i18n";
import type { DashboardData } from "@/server/dashboard";
import type { ProjectStatus } from "@prisma/client";

export interface DashboardViewProps {
  data: DashboardData;
  /** Whether to surface the "create project" call-to-action (presentation). */
  canManageProjects: boolean;
}

function statusTone(status: ProjectStatus): "ok" | "info" | "neutral" {
  if (status === "ACTIVE") return "ok";
  if (status === "DRAFT") return "info";
  return "neutral";
}

export function DashboardView({ data, canManageProjects }: DashboardViewProps) {
  const { projects, stats } = data;

  if (projects.length === 0) {
    return (
      <EmptyState
        title={t.dashboard.noProjects}
        description={t.dashboard.noProjectsDescription}
        action={
          canManageProjects ? (
            <Link href={"/projects/setup" as Route} className="btn btn--primary">
              {t.dashboard.createProject}
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="dashboard">
      <section className="stat-grid" aria-label={t.dashboard.subtitle}>
        <Card className="stat-card">
          <span className="stat-card__value tabular-digits">
            {formatNumber(stats.projectCount)}
          </span>
          <span className="stat-card__label">{t.dashboard.statProjects}</span>
        </Card>
        <Card className="stat-card">
          <span className="stat-card__value tabular-digits">
            {formatNumber(stats.activeCaseCount)}
          </span>
          <span className="stat-card__label">{t.dashboard.statActiveCases}</span>
        </Card>
        <Card className="stat-card">
          <span className="stat-card__value tabular-digits">
            {formatNumber(stats.lockedCaseCount)}
          </span>
          <span className="stat-card__label">{t.dashboard.statLockedCases}</span>
        </Card>
      </section>

      <section className="panel-section">
        <h2 className="panel-section__title">{t.dashboard.projectsTitle}</h2>
        <ul className="record-list">
          {projects.map((p) => (
            <li key={p.id} className="record-list__item">
              <div className="record-list__main">
                <span className="record-list__title">{p.name}</span>
                <span className="record-list__meta tabular-digits">{p.code}</span>
              </div>
              <Badge tone={statusTone(p.status)}>{t.projectStatus[p.status]}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
