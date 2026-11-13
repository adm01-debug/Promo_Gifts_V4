// Testa scripts/test-critical-coverage.mjs (produtor standalone da cobertura
// crítica, exposto como `npm run check:critical-coverage`). Cobre os
// caminhos rápidos de validação (arquivos ausentes) sem rodar o Vitest real,
// e a guarda de "sou o entrypoint?" — que tinha um no-op silencioso (exit 0,
// sem executar nada) quando o script era invocado via symlink, porque
// import.meta.url já vem resolvido pelo Node e a comparação direta com
// process.argv[1] (não resolvido) nunca batia.
import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildVitestArgs,
  CRITICAL_COVERAGE_INCLUDES,
  CRITICAL_TEST_FILES,
} from "../../scripts/test-critical-coverage.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = resolve(ROOT, "scripts/test-critical-coverage.mjs");

const temporaryDirs = [];
afterEach(() => {
  for (const dir of temporaryDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temporaryDirs.push(dir);
  return dir;
}

function touchAll(baseDir, relPaths) {
  for (const relPath of relPaths) {
    const abs = join(baseDir, relPath);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, "");
  }
}

function run(entryScript, cwd) {
  const result = spawnSync(process.execPath, [entryScript], {
    cwd,
    encoding: "utf8",
    timeout: 15_000,
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

describe("test-critical-coverage — validação rápida (sem rodar Vitest real)", () => {
  it("falha com exit 1 e lista os arquivos de teste críticos ausentes, sem tentar rodar o Vitest", () => {
    const cwd = tempDir("tcc-missing-tests-");

    const { status, output } = run(SCRIPT, cwd);

    expect(status).toBe(1);
    expect(output).toContain("Arquivo de teste crítico ausente(s)");
    for (const relPath of CRITICAL_TEST_FILES) {
      expect(output).toContain(relPath);
    }
  });

  it("falha com exit 1 e lista os módulos críticos ausentes quando os testes existem mas os módulos-alvo não", () => {
    const cwd = tempDir("tcc-missing-modules-");
    touchAll(cwd, CRITICAL_TEST_FILES);

    const { status, output } = run(SCRIPT, cwd);

    expect(status).toBe(1);
    expect(output).toContain("Módulo crítico ausente(s)");
    for (const relPath of CRITICAL_COVERAGE_INCLUDES) {
      expect(output).toContain(relPath);
    }
  });

  it("não vira no-op silencioso (exit 0 sem rodar nada) quando invocado via symlink — falso-positivo de gate", () => {
    const linkDir = tempDir("tcc-symlink-");
    const link = join(linkDir, "entry.mjs");
    symlinkSync(SCRIPT, link);
    const cwd = tempDir("tcc-missing-tests-via-link-");

    const { status, output } = run(link, cwd);

    // Antes da correção: status === 0 e output === "" (a guarda de entrypoint
    // nunca batia porque import.meta.url resolve o symlink e process.argv[1]
    // não resolvido ficava apontando pro link). runProducer() nunca era
    // chamado, e um gate de cobertura "passava" sem medir cobertura alguma.
    expect(status).toBe(1);
    expect(output).toContain("Arquivo de teste crítico ausente(s)");
  });

  it("importar o módulo sem ser o entrypoint não dispara spawn de Vitest nem process.exit", async () => {
    const mod = await import(`${SCRIPT}?import-only-check`);

    expect(mod.CRITICAL_TEST_FILES).toEqual(CRITICAL_TEST_FILES);
    expect(typeof mod.runProducer).toBe("function");
    // Se a guarda de entrypoint disparasse em um import comum, este teste
    // nunca chegaria aqui (o worker do Vitest teria sido finalizado).
  });
});

describe("buildVitestArgs", () => {
  it("inclui todos os arquivos de teste críticos, zera os thresholds do Vitest e aponta os includes de cobertura", () => {
    const args = buildVitestArgs();

    expect(args[1]).toBe("run");
    for (const relPath of CRITICAL_TEST_FILES) {
      expect(args).toContain(relPath);
    }
    expect(args).toContain("--coverage");
    expect(args).toContain("--coverage.thresholds.lines=0");
    expect(args).toContain("--coverage.thresholds.functions=0");
    expect(args).toContain("--coverage.thresholds.branches=0");
    expect(args).toContain("--coverage.thresholds.statements=0");

    const includeIndexes = args.flatMap((arg, i) =>
      arg === "--coverage.include" ? [i] : [],
    );
    const includedPaths = includeIndexes.map((i) => args[i + 1]);
    expect(includedPaths).toEqual(CRITICAL_COVERAGE_INCLUDES);
  });
});
