// @vitest-environment jsdom
/**
 * Render tests for WorkbenchView — confirms it renders the real, DB-derived
 * counts it is given and shows the exact readiness warning when reference
 * groups are missing (zero state). No fabricated values.
 *
 * Requirements: 10.4, 15.1
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { WorkbenchView } from "./WorkbenchView";
import { computeReadiness, type WorkbenchData } from "@/server/workbench/dashboard";
import { t } from "@/lib/i18n";

afterEach(cleanup);

function makeData(over: Partial<WorkbenchData> = {}): WorkbenchData {
  const referenceCounts = {
    sources: 0, importRuns: 0, books: 0, chapters: 0, items: 0, units: 0,
    resources: 0, indexPeriods: 0, circulars: 0, coefficientRules: 0,
    deductionRules: 0, mappings: 0,
    ...(over.referenceCounts ?? {}),
  };
  return {
    isSystemAdmin: false,
    referenceCounts,
    taksaRawCounts: { artifacts: 0, rawTables: 0, rawRows: 0, ...(over.taksaRawCounts ?? {}) },
    projectCounts: { projects: 0, contracts: 0, parties: 0, members: 0, ...(over.projectCounts ?? {}) },
    workflowCounts: { total: 0, locked: 0, open: 0, ...(over.workflowCounts ?? {}) },
    readiness: computeReadiness(referenceCounts),
    ...over,
  };
}

describe("WorkbenchView", () => {
  it("shows the exact readiness warning when reference groups are missing", () => {
    render(<WorkbenchView data={makeData()} />);
    expect(screen.getByText(t.workbench.readinessWarning)).toBeTruthy();
    expect(screen.getByText(t.workbench.referenceTitle)).toBeTruthy();
    expect(screen.getByText(t.workbench.taksaTitle)).toBeTruthy();
  });

  it("renders the ready state (no warning) when all groups have data", () => {
    const data = makeData({
      referenceCounts: {
        sources: 1, importRuns: 1, books: 1, chapters: 1, items: 1, units: 1,
        resources: 1, indexPeriods: 1, circulars: 1, coefficientRules: 1,
        deductionRules: 1, mappings: 1,
      },
    });
    render(<WorkbenchView data={data} />);
    expect(screen.getByText(t.workbench.readinessComplete)).toBeTruthy();
    expect(screen.queryByText(t.workbench.readinessWarning)).toBeNull();
  });
});
