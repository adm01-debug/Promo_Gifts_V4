/**
 * Gate CI: garante que o simulador de fluxos diários passa em todos os
 * invariantes de negócio (quote calc, price freshness, cnpj, invokeEdge
 * policy, webhook idempotency, magazine publish).
 *
 * Rodado em CI + local. Ver `scripts/simulate-daily-flows.mjs`.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, afterEach } from "vitest";

const SCRIPT = join(process.cwd(), "scripts/simulate-daily-flows.mjs");

describe("Daily flows simulation harness", () => {
  // E106: usa tmpdir para não sujar a árvore versionada
  let outDir: string;
  afterEach(() => { try { rmSync(outDir, { recursive: true, force: true }); } catch {} });

  it("runs 600+ scenarios and holds every invariant", () => {
    if (!existsSync(SCRIPT)) throw new Error(`Missing script: ${SCRIPT}`);
    outDir = mkdtempSync(join(tmpdir(), "daily-flows-"));
    // Executa o simulador em SCALE=1; falha se algum invariante violar.
    execFileSync("node", [SCRIPT, `--out-dir=${outDir}`], { stdio: "pipe", encoding: "utf8" });

    // Verifica que o JSON de relatório foi emitido e tem os fluxos esperados.
    const today = new Date().toISOString().slice(0, 10);
    const jsonPath = join(outDir, `daily-flows-simulation-${today}.json`);
    const report = JSON.parse(readFileSync(jsonPath, "utf8"));

    expect(report.totalScenarios).toBeGreaterThanOrEqual(600);
    expect(report.totalFailed).toBe(0);
    for (const key of [
      "quote-calc",
      "price-freshness",
      "cnpj-validation",
      "invoke-edge-policy",
      "webhook-idempotency",
      "magazine-publish",
    ]) {
      expect(report.flows[key]).toBeDefined();
      expect(report.flows[key].failed).toBe(0);
    }
  }, 60_000);
});
