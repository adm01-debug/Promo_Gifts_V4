#!/usr/bin/env node
/**
 * Produtor standalone da cobertura crítica.
 *
 * Não altera package.json: roda o Vitest diretamente com os módulos e testes
 * mínimos necessários para medir os 3 alvos do gate.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { runCoverageCheck } from "./check-critical-coverage.mjs";

const ROOT = process.cwd();

export const CRITICAL_TEST_FILES = [
  "tests/components/pages/FiltersPage.test.tsx",
  "src/pages/filters/__tests__/FiltersPage.logic.test.tsx",
  "src/pages/filters/__tests__/FiltersPage.sorting.test.tsx",
  "src/pages/filters/__tests__/FiltersPage.minStock.test.tsx",
  "tests/components/pages/KitBuilderPage.test.tsx",
  "src/tests/MockupDeletion.test.tsx",
];

export const CRITICAL_COVERAGE_INCLUDES = [
  "src/pages/products/FiltersPage.tsx",
  "src/pages/kit-builder/KitBuilderPage.tsx",
  "src/pages/mockups/MockupGenerator.tsx",
];

function verifyFilesExist(paths, kind) {
  const missing = paths.filter((relPath) => !fs.existsSync(path.resolve(ROOT, relPath)));
  if (missing.length === 0) return;

  console.error(`\n❌ ${kind} ausente(s):`);
  for (const item of missing) console.error(`   - ${item}`);
  process.exit(1);
}

export function buildVitestArgs() {
  return [
    path.resolve(ROOT, "node_modules/vitest/vitest.mjs"),
    "run",
    ...CRITICAL_TEST_FILES,
    "--coverage",
    "--coverage.reporter=text",
    "--coverage.reporter=json-summary",
    "--coverage.thresholds.lines=0",
    "--coverage.thresholds.functions=0",
    "--coverage.thresholds.branches=0",
    "--coverage.thresholds.statements=0",
    ...CRITICAL_COVERAGE_INCLUDES.flatMap((file) => ["--coverage.include", file]),
  ];
}

export function runProducer() {
  verifyFilesExist(CRITICAL_TEST_FILES, "Arquivo de teste crítico");
  verifyFilesExist(CRITICAL_COVERAGE_INCLUDES, "Módulo crítico");

  const args = buildVitestArgs();
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    env: { ...process.env, TZ: process.env.TZ ?? "America/Sao_Paulo" },
    stdio: "inherit",
  });

  if (result.status === 0) {
    const gate = runCoverageCheck();
    if (!gate.ok) {
      console.error(`\n❌ ${gate.message}`);
      for (const line of gate.lines) console.error(line);
      process.exit(1);
    }
    process.exit(0);
  }

  if (typeof result.status === "number") {
    process.exit(result.status);
  }

  console.error("\n❌ Falha ao executar o produtor de critical coverage.");
  process.exit(1);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  runProducer();
}
