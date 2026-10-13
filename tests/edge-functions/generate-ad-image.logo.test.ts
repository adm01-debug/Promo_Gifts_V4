// Entrada do runner Vitest para o teste co-localizado da edge generate-ad-image
// (`supabase/functions/**` não está no include do vitest.config.ts). Espelha o
// padrão das edges irmãs: importa o teste co-localizado para que a suíte o
// colete, e afirma 1 contrato de fiação do fonte.
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import "../../supabase/functions/generate-ad-image/index.logo.test.ts";

it("generate-ad-image recusa logo grande/em formato não suportado antes do provedor (F pergunta 7)", () => {
  const src = readFileSync(
    path.resolve(process.cwd(), "supabase/functions/generate-ad-image/index.ts"),
    "utf8",
  );
  expect(src).toContain("export function rejectLogoBase64");
  expect(src).toContain("const LOGO_MAX_BYTES = 10 * 1024 * 1024;");
  expect(src).toMatch(/const logoRejection = rejectLogoBase64\(logoBase64\);/);
  expect(src).toMatch(/status: logoRejection\.status/);
  // A guarda precisa vir ANTES de montar o prompt e chamar o provedor.
  expect(src.indexOf("rejectLogoBase64(logoBase64)")).toBeLessThan(
    src.indexOf("await callAiWithTracking({"),
  );
});
