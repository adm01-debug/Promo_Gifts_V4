import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const TMP_PREFIX = path.join(os.tmpdir(), "critical-coverage-gate-");
const createdDirs = [];

async function loadModule() {
  return import(path.resolve(ROOT, "scripts/check-critical-coverage.mjs"));
}

function mkdtemp() {
  const dir = fs.mkdtempSync(TMP_PREFIX);
  createdDirs.push(dir);
  return dir;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function touchFile(filePath, content = "export default null;\n", mtimeMs = Date.now()) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  const stamp = new Date(mtimeMs);
  fs.utimesSync(filePath, stamp, stamp);
}

afterEach(() => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("check-critical-coverage", () => {
  it("falha quando o coverage-summary.json está ausente", async () => {
    const { runCoverageCheck } = await loadModule();
    const tempRoot = mkdtemp();

    const result = runCoverageCheck({
      summaryPath: path.join(tempRoot, "coverage", "coverage-summary.json"),
      trackedModules: {
        "src/pages/products/FiltersPage.tsx": {
          thresholds: { statements: 40, branches: 40, functions: 40, lines: 40 },
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing_summary");
  });

  it("falha quando o summary está stale em relação ao módulo-alvo", async () => {
    const { runCoverageCheck } = await loadModule();
    const tempRoot = mkdtemp();
    const oldTime = Date.now() - 10_000;
    const newTime = Date.now();

    const trackedFile = path.join(tempRoot, "src/pages/products/FiltersPage.tsx");
    const summaryPath = path.join(tempRoot, "coverage/coverage-summary.json");

    touchFile(trackedFile, "export default function FiltersPage() {}\n", newTime);
    writeJson(summaryPath, {
      total: {},
      [trackedFile]: {
        statements: { pct: 100 },
        branches: { pct: 100 },
        functions: { pct: 100 },
        lines: { pct: 100 },
      },
    });
    const oldStamp = new Date(oldTime);
    fs.utimesSync(summaryPath, oldStamp, oldStamp);

    const result = runCoverageCheck({
      summaryPath,
      trackedModules: {
        "src/pages/products/FiltersPage.tsx": {
          thresholds: { statements: 40, branches: 40, functions: 40, lines: 40 },
        },
      },
      baseDir: tempRoot,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("stale_summary");
    expect(result.lines[0]).toContain("summary mais antigo que o módulo-alvo");
  });

  it("falha quando um módulo-alvo não foi medido pelo summary", async () => {
    const { runCoverageCheck } = await loadModule();
    const tempRoot = mkdtemp();
    const now = Date.now();
    const trackedFile = path.join(tempRoot, "src/pages/products/FiltersPage.tsx");
    const summaryPath = path.join(tempRoot, "coverage/coverage-summary.json");

    touchFile(trackedFile, "export default function FiltersPage() {}\n", now);
    writeJson(summaryPath, {
      total: {},
      "/tmp/other-file.tsx": {
        statements: { pct: 100 },
        branches: { pct: 100 },
        functions: { pct: 100 },
        lines: { pct: 100 },
      },
    });
    const stamp = new Date(now + 1_000);
    fs.utimesSync(summaryPath, stamp, stamp);

    const result = runCoverageCheck({
      summaryPath,
      trackedModules: {
        "src/pages/products/FiltersPage.tsx": {
          thresholds: { statements: 40, branches: 40, functions: 40, lines: 40 },
        },
      },
      baseDir: tempRoot,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("threshold_or_missing_module");
    expect(result.lines[0]).toContain("módulo-alvo não foi medido");
  });

  it("passa quando o summary é atual e cobre o módulo dentro do piso", async () => {
    const { runCoverageCheck } = await loadModule();
    const tempRoot = mkdtemp();
    const now = Date.now();
    const trackedFile = path.join(tempRoot, "src/pages/products/FiltersPage.tsx");
    const summaryPath = path.join(tempRoot, "coverage/coverage-summary.json");

    touchFile(trackedFile, "export default function FiltersPage() {}\n", now);
    writeJson(summaryPath, {
      total: {},
      [trackedFile]: {
        statements: { pct: 85 },
        branches: { pct: 80 },
        functions: { pct: 90 },
        lines: { pct: 86 },
      },
    });
    const stamp = new Date(now + 1_000);
    fs.utimesSync(summaryPath, stamp, stamp);

    const result = runCoverageCheck({
      summaryPath,
      trackedModules: {
        "src/pages/products/FiltersPage.tsx": {
          thresholds: { statements: 40, branches: 40, functions: 40, lines: 40 },
        },
      },
      baseDir: tempRoot,
    });

    expect(result.ok).toBe(true);
    expect(result.reason).toBe("ok");
  });
});
