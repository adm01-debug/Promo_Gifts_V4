#!/usr/bin/env node
/**
 * Coverage gate dedicado aos arquivos de "price freshness".
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const SUMMARY_PATH = path.resolve("coverage/coverage-summary.json");

const FILE_THRESHOLDS = {
  "src/utils/price-freshness.ts": {
    statements: 99,
    branches: 99,
    functions: 99,
    lines: 99,
  },
  "src/components/products/PriceFreshnessBadge.tsx": {
    statements: 62,
    branches: 63,
    functions: 49,
    lines: 62,
  },
};

const TOLERANCE_PP = Number(process.env.COVERAGE_TOLERANCE_PP ?? "1");

const TRACKED_FILES = Object.keys(FILE_THRESHOLDS);

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(SUMMARY_PATH)) {
  console.log(`[check-price-freshness-coverage] static-pass: coverage-summary.json ausente; gate ignorado.`);
  process.exit(0);
}

const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, "utf8"));

function findEntry(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  const key = Object.keys(summary).find(
    (k) => k !== "total" && k.replace(/\\/g, "/").endsWith(normalized),
  );
  return key ? summary[key] : null;
}

let hasFailure = false;
const lines = [];

for (const file of TRACKED_FILES) {
  const entry = findEntry(file);
  if (!entry) {
    hasFailure = true;
    lines.push(`✗ ${file.padEnd(60)} (sem cobertura — arquivo não foi exercitado)`);
    continue;
  }

  const m = {
    statements: entry.statements?.pct ?? 0,
    branches: entry.branches?.pct ?? 0,
    functions: entry.functions?.pct ?? 0,
    lines: entry.lines?.pct ?? 0,
  };

  const thresholds = FILE_THRESHOLDS[file];
  const violations = Object.entries(thresholds).filter(
    ([metric, min]) => m[metric] < min - TOLERANCE_PP,
  );

  const fmt = `S:${m.statements.toFixed(0)}% B:${m.branches.toFixed(0)}% F:${m.functions.toFixed(0)}% L:${m.lines.toFixed(0)}%`;

  if (violations.length === 0) {
    lines.push(`✓ ${file.padEnd(60)} ${fmt}`);
  } else {
    hasFailure = true;
    const detail = violations
      .map(([metric, min]) => `${metric} ${m[metric].toFixed(1)}% < ${(min - TOLERANCE_PP).toFixed(1)}% (piso ${min}% − tol ${TOLERANCE_PP}pp)`)
      .join(", ");
    lines.push(`✗ ${file.padEnd(60)} ${fmt}   ← ${detail}`);
  }
}

console.log("\nPrice Freshness — coverage gate");
console.log("─".repeat(80));
for (const l of lines) console.log(l);
console.log("─".repeat(80));

if (hasFailure) {
  fail("Cobertura de price freshness regrediu abaixo do piso. Adicione testes.");
}

console.log("\n✅ Cobertura de price freshness dentro do piso.\n");
