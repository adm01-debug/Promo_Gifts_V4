import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

// react-remove-scroll-bar (diálogos, menus e sheets do Radix) injeta um <style> ao travar a
// rolagem do fundo. O CSS só varia pela largura da barra (`gap`, px inteiro) e, quando uma trava
// abre enquanto outra ainda está aplicada, pelo margin-right já existente (`right` = gap).
// Sem os hashes, a CSP bloqueia e o fundo rola atrás do modal (log de produção 13/11:
// XReiwj… = gap 10, nzTgYz… = gap 0). Recalculado do pacote instalado.
const ROOT = join(import.meta.dirname, "../..");
const MAX_GAP = 24;

function removeScrollStyleHashes(): string[] {
  const req = createRequire(join(ROOT, "package.json"));
  const file = req.resolve("react-remove-scroll-bar/dist/es5/component.js");
  const m = new Module(file) as Module & { _compile(src: string, f: string): void; paths: string[] };
  m.filename = file;
  m.paths = (Module as unknown as { _nodeModulePaths(d: string): string[] })._nodeModulePaths(dirname(file));
  m._compile(`${readFileSync(file, "utf8")}\nexports.__getStyles = getStyles;`, file);
  const getStyles = (m.exports as { __getStyles: (...a: unknown[]) => string }).__getStyles;
  const hash = (right: number, gap: number) =>
    `'sha256-${createHash("sha256")
      .update(getStyles({ left: 0, top: 0, right, gap }, true, "margin", "!important"))
      .digest("base64")}'`;
  const single = Array.from({ length: MAX_GAP + 1 }, (_, gap) => hash(0, gap));
  const stacked = Array.from({ length: MAX_GAP }, (_, i) => hash(i + 1, i + 1));
  return [...single, ...stacked];
}

describe("CSP style-src cobre o <style> de trava de rolagem (react-remove-scroll-bar)", () => {
  const hashes = removeScrollStyleHashes();
  it("os hashes vistos em produção (gap 10 e gap 0) estão entre os calculados", () => {
    expect(hashes).toContain("'sha256-XReiwjORRzqabGyv2ayyS+6pOG3pMi9VCy3dwX6vmjI='");
    expect(hashes).toContain("'sha256-nzTgYzXYDNe6BAHiiI7NNlfK8n/auuOAhh2t92YvuXo='");
  });
  for (const file of ["vercel.json", "public/_headers"]) {
    it(`${file} contém os ${hashes.length} hashes (gap 0..${MAX_GAP}px, simples e empilhado)`, () => {
      const content = readFileSync(join(ROOT, file), "utf8");
      expect(hashes.filter((h) => !content.includes(h))).toEqual([]);
    });
  }
});

describe("src/index.css não anula a trava de rolagem do Radix", () => {
  const css = readFileSync(join(ROOT, "src/index.css"), "utf8");
  const block = css.match(/html\[data-scroll-locked\],\s*body\[data-scroll-locked\][^{]*\{([^}]*)\}/)?.[1] ?? "";
  it("o bloco de data-scroll-locked existe e mantém a página clicável", () => {
    expect(block).toContain("pointer-events: auto");
  });
  it("não força overflow/position/margin no body travado", () => {
    expect(block).not.toMatch(/overflow|position|margin-right|padding-right/);
  });
  it("header fixo compensa a barra só enquanto travado (sem classe incondicional)", () => {
    expect(css).toMatch(/body\[data-scroll-locked\] \[data-testid='app-header'\]\s*\{\s*right: var\(--removed-body-scroll-bar-size, 0px\) !important;/);
  });
});
