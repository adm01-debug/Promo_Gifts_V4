// Entrada do runner Vitest para o teste co-localizado da edge generate-ad-prompt
// (`supabase/functions/**` não está no include do vitest.config.ts, caminho
// bloqueado pelo portão do projeto). Espelha o padrão aceito das edges irmãs
// (tests/edge-functions/mockup-assistant.test.ts, e2e-cleanup.mockups.test.ts):
// importa o teste co-localizado e afirma 1 contrato do fonte.
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import "../../supabase/functions/generate-ad-prompt/index.timeout.test.ts";

it("mantém o tempo limite da edge ligado ao teto da generate-ad-image (E-14)", () => {
  const src = readFileSync(
    path.resolve(process.cwd(), "supabase/functions/generate-ad-prompt/index.ts"),
    "utf8",
  );
  expect(src).toContain("legacyTimeoutMs: AI_PROVIDER_TIMEOUT_MS");
  expect(src).toMatch(/code:\s*TIMEOUT_ERROR_CODE/);
});
