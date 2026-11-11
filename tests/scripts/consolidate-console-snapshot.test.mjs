/**
 * Tests for scripts/consolidate-console-snapshot.mjs
 *
 * Bug found during adversarial testing: a `readdir(coverage/)` failure that
 * is NOT "the directory doesn't exist" (e.g. EACCES — permission denied, or
 * ENOTDIR — "coverage" exists but is a file) was swallowed by a bare
 * `catch {}` and treated identically to "no snapshots yet": the script
 * printed "[consolidate] sem snapshots para consolidar." and exited 0,
 * even when a real, unread snapshot file on disk contained a ref warning.
 * That is a false negative in a CI gate whose entire purpose is to fail
 * when ref warnings are present — a permission problem silently became a
 * green check.
 *
 * Fix: only swallow ENOENT (the directory genuinely does not exist, the
 * normal "nothing ran yet" case); any other readdir error now propagates to
 * main()'s top-level catch, which reports it and exits 2 instead of 0.
 *
 * Second bug found: `entries.push(...parsed.entries)` spreads a worker's
 * entire entries array as call arguments. With a single worker file holding
 * more than ~100k-125k entries (plausible for a noisy/looping test suite,
 * and exactly the "100k linhas" scale this kind of script should survive),
 * V8 throws "RangeError: Maximum call stack size exceeded". That error is
 * caught by the per-file try/catch, which then treats the whole (perfectly
 * valid) file as if it were corrupted JSON and silently drops ALL of its
 * entries — including any real ref warning in it. Fix: use
 * `entries.concat(parsed.entries)` instead of spread-push.
 *

 * Reproducing EACCES requires actually being denied by the filesystem, so
 * these tests run as an unprivileged user (uid `nobody`) via `setpriv` when
 * available (e.g. local/root CI containers) and are skipped otherwise (e.g.
 * a non-root sandbox where chmod has no effect anyway).
 *
 * These tests run the real script via spawnSync against isolated temp
 * fixture roots under the OS tmpdir — never against the repo's own
 * coverage/ directory.
 */

import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = resolve(process.cwd(), "scripts/consolidate-console-snapshot.mjs");

const tempRoots = [];

function makeFixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), "consolidate-console-snapshot-test-"));
  tempRoots.push(root);
  return root;
}

function coverageDir(root) {
  return join(root, "coverage");
}

function run(root, args = [], opts = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 15_000,
    ...opts,
  });
}

/** Detecta se dá para testar EACCES de fato (precisa rodar como não-root). */
function canDropPrivileges() {
  if (process.getuid && process.getuid() !== 0) return false; // já não-root: chmod já funciona com spawnSync normal
  const probe = spawnSync("setpriv", ["--version"], { encoding: "utf8" });
  return probe.status === 0;
}

afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop();
    try {
      chmodSync(coverageDir(root), 0o755);
    } catch {
      // diretório pode não existir mais / já ter permissão normal — ok ignorar.
    }
    rmSync(root, { recursive: true, force: true });
  }
});

describe("consolidate-console-snapshot.mjs — comportamento padrão (sem regressão)", () => {
  it("sem diretório coverage: exit 0 e mensagem informativa", () => {
    const root = makeFixtureRoot();
    const result = run(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("sem snapshots para consolidar");
  });

  it("consolida snapshots válidos e falha (exit 1) quando há ref warning", () => {
    const root = makeFixtureRoot();
    mkdirSync(coverageDir(root), { recursive: true });
    writeFileSync(
      join(coverageDir(root), "console-snapshot.w1.json"),
      JSON.stringify({
        entries: [
          {
            timestamp: "2026-01-01T00:00:00Z",
            level: "warn",
            message: "Function components cannot be given refs",
            isRefWarning: true,
          },
        ],
      }),
    );

    const result = run(root);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("1 entrada(s) consolidada(s)");
    expect(result.stderr).toContain("ref warning(s) detectado(s)");
  });

  it("--no-fail: consolida e reporta ref warning, mas exit 0", () => {
    const root = makeFixtureRoot();
    mkdirSync(coverageDir(root), { recursive: true });
    writeFileSync(
      join(coverageDir(root), "console-snapshot.w1.json"),
      JSON.stringify({
        entries: [
          { timestamp: "t1", level: "warn", message: "ref warning", isRefWarning: true },
        ],
      }),
    );

    const result = run(root, ["--no-fail"]);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("ref warning(s) detectado(s)");
  });

  it("ignora arquivo JSON corrompido sem travar e ainda consolida os válidos", () => {
    const root = makeFixtureRoot();
    mkdirSync(coverageDir(root), { recursive: true });
    writeFileSync(join(coverageDir(root), "console-snapshot.bad.json"), "{ nao e json");
    writeFileSync(
      join(coverageDir(root), "console-snapshot.good.json"),
      JSON.stringify({
        entries: [{ timestamp: "t1", level: "warn", message: "ok", isRefWarning: false }],
      }),
    );

    const result = run(root);

    expect(result.status).toBe(0);
    // console.warn (não console.log) vai para stderr.
    expect(result.stderr).toContain("ignorando console-snapshot.bad.json");
    expect(result.stdout).toContain("1 entrada(s) consolidada(s)");
  });
});

describe("consolidate-console-snapshot.mjs — regressão: arquivo de worker com muitas entradas (spread-push)", () => {
  it("um único worker com 150k entradas não deve ser descartado como 'corrompido' (stack overflow do spread)", () => {
    const root = makeFixtureRoot();
    mkdirSync(coverageDir(root), { recursive: true });

    const N = 150_000;
    const entries = [];
    for (let i = 0; i < N; i++) {
      entries.push({
        timestamp: `t${i}`,
        level: "warn",
        message: i === N - 1 ? "Function components cannot be given refs" : `msg${i}`,
        isRefWarning: i === N - 1,
      });
    }
    writeFileSync(
      join(coverageDir(root), "console-snapshot.w1.json"),
      JSON.stringify({ entries }),
    );

    const result = run(root);

    // Antes do fix: "ignorando console-snapshot.w1.json: Maximum call
    // stack size exceeded" no stderr, 0 entradas consolidadas, exit 0 —
    // o ref warning real na última entrada desaparecia sem rastro.
    expect(result.stderr).not.toContain("Maximum call stack size exceeded");
    expect(result.stdout).toContain(`${N} entrada(s) consolidada(s)`);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("ref warning(s) detectado(s)");
  });
});

describe("consolidate-console-snapshot.mjs — regressão: readdir falhando por motivo real (EACCES/ENOTDIR)", () => {
  it("coverage/ existe mas sem permissão de leitura: NÃO deve reportar 'sem snapshots' com exit 0 (gate mudo)", () => {
    if (!canDropPrivileges()) {
      // Ambiente sem como negar permissão de fato (ex.: sandbox não-root
      // sem setpriv). Sem isolar privilégio não há como provar EACCES real;
      // pular em vez de fingir que foi testado.
      return;
    }

    const root = makeFixtureRoot();
    mkdirSync(coverageDir(root), { recursive: true });
    writeFileSync(
      join(coverageDir(root), "console-snapshot.w1.json"),
      JSON.stringify({
        entries: [
          { timestamp: "t1", level: "warn", message: "ref warning real e invisivel", isRefWarning: true },
        ],
      }),
    );
    chmodSync(root, 0o777);
    chmodSync(coverageDir(root), 0o000);

    const result = spawnSync(
      "setpriv",
      ["--reuid=65534", "--regid=65534", "--clear-groups", process.execPath, SCRIPT],
      { cwd: root, encoding: "utf8", timeout: 15_000 },
    );

    // Antes do fix: status 0 + stdout "sem snapshots para consolidar." —
    // escondendo silenciosamente o ref warning real presente no arquivo.
    expect(result.stdout).not.toContain("sem snapshots para consolidar");
    expect(result.status).not.toBe(0);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("erro inesperado");
  });
});
