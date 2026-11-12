import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

// react-remove-scroll-bar (usado por diálogos, menus e sheets do Radix) injeta um <style> ao
// travar a rolagem do fundo. O CSS só varia pela largura da barra de rolagem (`gap`, px inteiro).
// Sem os hashes na CSP o navegador bloqueia e o fundo continua rolando atrás do diálogo
// (log de produção 12/11: sha256-XReiwj… = gap 10). Recalculado do pacote instalado.
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
  return Array.from({ length: MAX_GAP + 1 }, (_, gap) => {
    const css = getStyles({ left: 0, top: 0, right: 0, gap }, true, "margin", "!important");
    return `'sha256-${createHash("sha256").update(css).digest("base64")}'`;
  });
}

describe("CSP style-src cobre o <style> de trava de rolagem (react-remove-scroll-bar)", () => {
  const hashes = removeScrollStyleHashes();
  it("o hash visto em produção (gap 10) está entre os calculados", () => {
    expect(hashes).toContain("'sha256-XReiwjORRzqabGyv2ayyS+6pOG3pMi9VCy3dwX6vmjI='");
  });
  for (const file of ["vercel.json", "public/_headers"]) {
    it(`${file} contém os ${MAX_GAP + 1} hashes (gap 0..${MAX_GAP}px)`, () => {
      const content = readFileSync(join(ROOT, file), "utf8");
      const missing = hashes.filter((h) => !content.includes(h));
      expect(missing).toEqual([]);
    });
  }
});
