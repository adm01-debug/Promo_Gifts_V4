// Entrada do runner Vitest para o teste co-localizado da edge generate-ad-image
// (`supabase/functions/**` não está no include do vitest.config.ts). Espelha o
// padrão aceito das edges irmãs: importa o teste co-localizado para que a suíte
// o colete, e afirma 1 contrato do fonte.
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import "../../supabase/functions/generate-ad-image/index.sanitize.test.ts";

it("generate-ad-image delimita os campos de texto livre antes do prompt (F-05)", () => {
  const src = readFileSync(
    path.resolve(process.cwd(), "supabase/functions/generate-ad-image/index.ts"),
    "utf8",
  );
  expect(src).toContain('from "./sanitize.ts"');
  expect(src).toMatch(/wrapUserData\(scenePrompt,/);
  expect(src).toContain("reduceCampaignBrief(campaignBrief)");
});
