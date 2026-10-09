// Entrada do runner Vitest para o teste co-localizado da edge generate-ad-image
// (`supabase/functions/**` não está no include do vitest.config.ts, caminho
// bloqueado pelo portão do projeto). Espelha o padrão aceito das edges irmãs
// (tests/edge-functions/generate-ad-prompt.timeout.test.ts): importa o teste
// co-localizado e afirma 1 contrato do fonte.
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import "../../supabase/functions/generate-ad-image/index.imports.test.ts";

it("edges do Magic Up mantêm imports sem mortos e zod do modulo compartilhado (F-13)", () => {
  for (const file of [
    "supabase/functions/generate-ad-image/index.ts",
    "supabase/functions/generate-ad-prompt/index.ts",
  ]) {
    const src = readFileSync(path.resolve(process.cwd(), file), "utf8");
    expect(src).not.toMatch(/handleCorsPreflightIfNeeded/);
    expect(src).toMatch(/from\s*["']\.\.\/_shared\/zod-validate\.ts["']/);
  }
});
