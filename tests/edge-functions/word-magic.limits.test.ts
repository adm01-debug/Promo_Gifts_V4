// Entrada do runner Vitest para o teste co-localizado da edge word-magic
// (`supabase/functions/**` não está no include do vitest.config.ts). Espelha o
// padrão aceito das edges irmãs: importa o teste co-localizado para que a suíte
// o colete, e afirma 1 contrato do fonte.
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import "../../supabase/functions/word-magic/index.limits.test.ts";

it("word-magic tem limite de uso, quota e registro de consumo (F-08)", () => {
  const src = readFileSync(
    path.resolve(process.cwd(), "supabase/functions/word-magic/index.ts"),
    "utf8",
  );
  expect(src).toContain("import { applyRateLimit, rateLimiters } from '../_shared/rate-limiter.ts'");
  expect(src).toMatch(/applyRateLimit\(req, rateLimiters\.ai, \(\) => auth\.userId\)/);
  expect(src).toMatch(/acquireAiQuota\(auth\.userId, AI_FUNCTION_NAME, DEEPSEEK_MODEL\)/);
  expect(src).toMatch(/logAiUsage\(\{/);
});
