import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// O ScrollArea do Radix renderiza um <style> FIXO (esconde a barra nativa). Com a CSP sem o
// hash dele, o navegador bloqueia e aparecem duas barras de rolagem (log de produção 12/11).
// O hash é recalculado do pacote instalado: se o Radix mudar o CSS, este teste quebra.
const ROOT = join(import.meta.dirname, "../..");

function radixScrollAreaHash(): string {
  const req = createRequire(join(ROOT, "package.json"));
  const entry = req.resolve("@radix-ui/react-scroll-area");
  const src = readFileSync(entry.replace(/index\.js$/, "index.mjs"), "utf8");
  const css = src.match(/__html: `([^`]*)`/)?.[1];
  if (!css) throw new Error("CSS fixo do ScrollArea não encontrado no pacote");
  return `'sha256-${createHash("sha256").update(css).digest("base64")}'`;
}

describe("CSP style-src cobre o <style> fixo do Radix ScrollArea", () => {
  const hash = radixScrollAreaHash();
  for (const file of ["vercel.json", "public/_headers"]) {
    it(`${file} contém o hash atual`, () => {
      expect(readFileSync(join(ROOT, file), "utf8")).toContain(hash);
    });
  }
});
