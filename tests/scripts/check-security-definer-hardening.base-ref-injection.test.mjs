import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function runCheck(env) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [resolve(ROOT, "scripts", "check-security-definer-hardening.mjs")], {
      cwd: ROOT,
      env: { PATH: process.env.PATH ?? "", ...env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", rejectRun);
    child.once("close", (exitCode) => resolveRun({ exitCode, stdout, stderr }));
  });
}

describe("check-security-definer-hardening", () => {
  let marker;

  afterEach(() => {
    if (marker && existsSync(marker)) rmSync(marker);
  });

  it("não executa comando arbitrário quando GITHUB_BASE_REF traz injeção de shell", async () => {
    marker = join(tmpdir(), `secdef-hardening-injection-${process.pid}-${Date.now()}.marker`);
    expect(existsSync(marker)).toBe(false);

    const outcome = await runCheck({
      // Nome de branch malicioso — vindo do ambiente da PR, nunca deve ser
      // interpolado numa shell string sem escape.
      GITHUB_BASE_REF: `main$(touch ${marker})`,
    });

    expect(existsSync(marker)).toBe(false);
    // Ref com caracteres fora de [A-Za-z0-9._/-] é recusada antes de chegar ao
    // git (fail-closed, exit 2) — antes caía no fallback e aprovava sem comparar.
    expect(outcome.exitCode).toBe(2);
  });
});
