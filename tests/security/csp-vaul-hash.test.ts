import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// O vaul (gaveta de src/components/ui/drawer.tsx) injeta um <style> FIXO ao carregar o módulo.
// Sem o hash dele na CSP, o navegador bloqueia: a gaveta do kit perde animação/alça e o console
// enche de "Applying inline style violates..." (log de produção 13/11, hash YIjArHm2...).
// O hash é recalculado do pacote instalado: se o vaul mudar o CSS, este teste quebra.
const ROOT = join(import.meta.dirname, "../..");

function vaulHash(): string {
  const req = createRequire(join(ROOT, "package.json"));
  const src = readFileSync(req.resolve("vaul").replace(/index\.js$/, "index.mjs"), "utf8");
  // 1ª ocorrência é a definição da função; a 2ª é a chamada com o CSS literal.
  const call = [...src.matchAll(/__insertCSS\("((?:\\.|[^"\\])*)"\)/g)].at(-1)?.[1];
  if (!call) throw new Error("CSS fixo do vaul não encontrado no pacote");
  const css = JSON.parse(`"${call}"`) as string;
  return `'sha256-${createHash("sha256").update(css).digest("base64")}'`;
}

describe("CSP style-src cobre o <style> fixo do vaul", () => {
  const hash = vaulHash();
  it("hash conhecido do vaul instalado", () => {
    expect(hash).toBe("'sha256-YIjArHm2rkb5J7hX9lUM1bnQ3Kp61MTfluMGkuyKwDw='");
  });
  for (const file of ["vercel.json", "public/_headers"]) {
    it(`${file} contém o hash atual`, () => {
      expect(readFileSync(join(ROOT, file), "utf8")).toContain(hash);
    });
  }
});
