/**
 * Regressão: o checker estático de aninhamento `<Trigger asChild>` deve
 * passar (exit 0). Se algum aninhamento sem wrapper neutro for introduzido,
 * este teste falha junto com o CI.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const SCRIPT = path.join(ROOT, "scripts/check-aschild-nesting.mjs");

describe("Radix asChild nesting checker", () => {
  it("não detecta aninhamento <Trigger asChild><Trigger asChild> sem wrapper", () => {
    let stdout = "";
    let exitCode = 0;
    try {
      stdout = execSync("node scripts/check-aschild-nesting.mjs", {
        cwd: ROOT,
        encoding: "utf8",
      });
    } catch (err) {
      // execSync joga em exit != 0
      exitCode = (err as { status?: number }).status ?? 1;
      stdout = `${(err as { stdout?: string }).stdout ?? ""}\n${(err as { stderr?: string }).stderr ?? ""}`;
    }
    expect(exitCode, `Checker falhou:\n${stdout}`).toBe(0);
    expect(stdout).toMatch(/nenhum aninhamento problemático/i);
  });
});

/**
 * Bug real encontrado via teste adversarial (código comentado): o checker é
 * puramente textual (regex sobre o arquivo cru) e, antes da correção, tratava
 * `<Trigger asChild>` dentro de um comentário de bloco `/* ... *\/` — ou do
 * equivalente comentário JSX `{/* ... *\/}` — como JSX real, gerando
 * falso-positivo. O fix ignora o conteúdo de comentários de bloco antes de
 * varrer (preservando as quebras de linha, para não deslocar os números
 * reportados). Estes testes rodam o script real (via cópia num tmpdir, pois
 * `ROOT`/`SRC` são resolvidos a partir de `__dirname` do próprio script) e
 * falhariam sem a correção.
 */
describe("Radix asChild nesting checker — ignora comentários", () => {
  let work: string;

  function runChecker(): { code: number; stdout: string; stderr: string } {
    try {
      const stdout = execSync("node scripts/check-aschild-nesting.mjs", {
        cwd: work,
        encoding: "utf8",
      });
      return { code: 0, stdout, stderr: "" };
    } catch (err) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      return { code: e.status ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
    }
  }

  beforeEach(() => {
    work = mkdtempSync(path.join(tmpdir(), "aschild-nesting-check-"));
    mkdirSync(path.join(work, "scripts"), { recursive: true });
    mkdirSync(path.join(work, "src"), { recursive: true });
    cpSync(SCRIPT, path.join(work, "scripts/check-aschild-nesting.mjs"));
  });

  afterEach(() => {
    rmSync(work, { recursive: true, force: true });
  });

  it("NÃO sinaliza aninhamento comentado em bloco /* ... */", () => {
    writeFileSync(
      path.join(work, "src/Commented.tsx"),
      `
        export function Commented() {
          /*
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button />
            </PopoverTrigger>
          </TooltipTrigger>
          */
          return <div>sem aninhamento real</div>;
        }
      `,
    );
    const r = runChecker();
    expect(r.code, `stderr:\n${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/nenhum aninhamento problemático/i);
  });

  it("NÃO sinaliza aninhamento dentro de comentário JSX {/* ... */}", () => {
    writeFileSync(
      path.join(work, "src/JsxComment.tsx"),
      `
        export function JsxComment() {
          return (
            <div>
              {/* <TooltipTrigger asChild><PopoverTrigger asChild><Button/></PopoverTrigger></TooltipTrigger> */}
              <RealButton />
            </div>
          );
        }
      `,
    );
    const r = runChecker();
    expect(r.code, `stderr:\n${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/nenhum aninhamento problemático/i);
  });

  it("continua sinalizando aninhamento real mesmo com comentário de bloco antes, com o número de linha correto", () => {
    writeFileSync(
      path.join(work, "src/Mixed.tsx"),
      `export function Mixed() {
  /* comentário qualquer
     em múltiplas linhas */
  return (
    <TooltipTrigger asChild>
      <PopoverTrigger asChild>
        <Button />
      </PopoverTrigger>
    </TooltipTrigger>
  );
}
`,
    );
    const r = runChecker();
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/Mixed\.tsx:5/);
  });
});
