#!/usr/bin/env node
/**
 * Coverage gate canônico para os 3 módulos críticos de jornada:
 * - Catalog / FiltersPage
 * - Kit Builder / KitBuilderPage
 * - Mockup / MockupGenerator
 *
 * O gate falha quando:
 * - o artefato `coverage-summary.json` não existe;
 * - o artefato está stale em relação aos módulos-alvo;
 * - um dos módulos não foi medido pelo summary;
 * - a cobertura do módulo fica abaixo do piso.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const SUMMARY_PATH = path.resolve(
  process.env.CRITICAL_COVERAGE_SUMMARY_PATH ?? "coverage/coverage-summary.json",
);

export const TOLERANCE_PP = Number(process.env.COVERAGE_TOLERANCE_PP ?? "1");

export const CRITICAL_MODULES = {
  "src/pages/products/FiltersPage.tsx": {
    label: "Catalog / FiltersPage",
    thresholds: { statements: 40, branches: 40, functions: 40, lines: 40 },
  },
  "src/pages/kit-builder/KitBuilderPage.tsx": {
    label: "Kit Builder / KitBuilderPage",
    thresholds: { statements: 40, branches: 40, functions: 40, lines: 40 },
  },
  "src/pages/mockups/MockupGenerator.tsx": {
    label: "Mockup / MockupGenerator",
    thresholds: { statements: 40, branches: 40, functions: 40, lines: 40 },
  },
};

export const TRACKED_FILES = Object.keys(CRITICAL_MODULES);

function normalizePath(value) {
  return value.replace(/\\/g, "/");
}

export function findCoverageEntry(summary, relPath) {
  const normalized = normalizePath(relPath);
  const key = Object.keys(summary).find(
    (candidate) =>
      candidate !== "total" && normalizePath(candidate).endsWith(normalized),
  );
  return key ? summary[key] : null;
}

export function getMetricSnapshot(entry) {
  return {
    statements: entry?.statements?.pct ?? 0,
    branches: entry?.branches?.pct ?? 0,
    functions: entry?.functions?.pct ?? 0,
    lines: entry?.lines?.pct ?? 0,
  };
}

export function formatMetrics(metrics) {
  return `S:${metrics.statements.toFixed(0)}% B:${metrics.branches.toFixed(0)}% F:${metrics.functions.toFixed(0)}% L:${metrics.lines.toFixed(0)}%`;
}

export function collectFreshnessIssues(summaryPath, trackedFiles, baseDir = process.cwd()) {
  const summaryStat = fs.statSync(summaryPath);
  const staleAgainst = [];

  for (const relPath of trackedFiles) {
    const absPath = path.resolve(baseDir, relPath);
    if (!fs.existsSync(absPath)) {
      staleAgainst.push({
        type: "missing_target",
        file: relPath,
        detail: "arquivo-alvo não existe mais no worktree",
      });
      continue;
    }

    const targetStat = fs.statSync(absPath);
    if (targetStat.mtimeMs > summaryStat.mtimeMs) {
      staleAgainst.push({
        type: "stale",
        file: relPath,
        detail: `summary mais antigo que o módulo-alvo (${new Date(summaryStat.mtimeMs).toISOString()} < ${new Date(targetStat.mtimeMs).toISOString()})`,
      });
    }
  }

  return staleAgainst;
}

export function evaluateCoverageSummary(summary, trackedModules, tolerance = TOLERANCE_PP) {
  const lines = [];
  let hasFailure = false;

  for (const [file, config] of Object.entries(trackedModules)) {
    const entry = findCoverageEntry(summary, file);
    if (!entry) {
      hasFailure = true;
      lines.push(
        `✗ ${file.padEnd(60)} (sem cobertura — módulo-alvo não foi medido pelo summary)`,
      );
      continue;
    }

    const metrics = getMetricSnapshot(entry);
    const violations = Object.entries(config.thresholds).filter(
      ([metric, min]) => metrics[metric] < min - tolerance,
    );

    if (violations.length === 0) {
      lines.push(`✓ ${file.padEnd(60)} ${formatMetrics(metrics)}`);
      continue;
    }

    hasFailure = true;
    const detail = violations
      .map(
        ([metric, min]) =>
          `${metric} ${metrics[metric].toFixed(1)}% < ${(min - tolerance).toFixed(1)}% (piso ${min}% − tol ${tolerance}pp)`,
      )
      .join(", ");
    lines.push(`✗ ${file.padEnd(60)} ${formatMetrics(metrics)}   ← ${detail}`);
  }

  return { hasFailure, lines };
}

export function runCoverageCheck({
  summaryPath = SUMMARY_PATH,
  trackedModules = CRITICAL_MODULES,
  tolerance = TOLERANCE_PP,
  baseDir = process.cwd(),
} = {}) {
  const trackedFiles = Object.keys(trackedModules);

  if (!fs.existsSync(summaryPath)) {
    return {
      ok: false,
      reason: "missing_summary",
      message:
        `coverage-summary.json não encontrado em ${summaryPath}. ` +
        `Gere a cobertura crítica antes de validar este gate.`,
      lines: [],
    };
  }

  const freshnessIssues = collectFreshnessIssues(summaryPath, trackedFiles, baseDir);
  if (freshnessIssues.length > 0) {
    return {
      ok: false,
      reason: freshnessIssues.some((issue) => issue.type === "missing_target")
        ? "missing_target"
        : "stale_summary",
      message: "Artefato de cobertura stale ou incompatível com os módulos-alvo atuais.",
      lines: freshnessIssues.map(
        (issue) => `✗ ${issue.file.padEnd(60)} ${issue.detail}`,
      ),
    };
  }

  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const evaluation = evaluateCoverageSummary(summary, trackedModules, tolerance);

  return {
    ok: !evaluation.hasFailure,
    reason: evaluation.hasFailure ? "threshold_or_missing_module" : "ok",
    message: evaluation.hasFailure
      ? "Cobertura crítica incompleta ou abaixo do piso."
      : "Cobertura crítica dentro do piso.",
    lines: evaluation.lines,
  };
}

export function runCli() {
  const result = runCoverageCheck();

  console.log("\nCritical Modules — coverage gate");
  console.log("─".repeat(96));
  for (const line of result.lines) console.log(line);
  console.log("─".repeat(96));

  if (!result.ok) {
    console.error(`\n❌ ${result.message}`);
    process.exit(1);
  }

  console.log("\n✅ Cobertura dos módulos críticos dentro do piso.\n");
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  runCli();
}
