// Entrada do runner Vitest para o teste co-localizado da edge magic-up-score
// (`supabase/functions/**` não está no include do vitest.config.ts). Espelha o
// padrão aceito das edges irmãs: importa o teste co-localizado para que a suíte
// o colete, e afirma 1 contrato do fonte.
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import "../../supabase/functions/magic-up-score/index.limits.test.ts";

it("magic-up-score limita o tamanho da imagem e dos textos recebidos (F-05/F-07)", () => {
  const src = readFileSync(
    path.resolve(process.cwd(), "supabase/functions/magic-up-score/index.ts"),
    "utf8",
  );
  expect(src).toContain("export const MAX_REQUEST_BYTES");
  expect(src).toMatch(/readBodyWithinLimit\(req, MAX_REQUEST_BYTES\)/);
  expect(src).toMatch(/byteLength\(parsed\.data\.imageUrl\) > MAX_IMAGE_URL_BYTES/);
});
