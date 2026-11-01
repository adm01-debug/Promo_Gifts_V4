/**
 * Guarda de imports das edges do Magic Up (F-13 / BUG-MAGICUP-IMPORTS-1).
 *
 * Garante, ao nível do código-fonte, as duas invariantes do cartão:
 *   1. `handleCorsPreflightIfNeeded` não fica importado-e-não-usado nas edges
 *      `supabase/functions/generate-ad-image/index.ts` e
 *      `supabase/functions/generate-ad-prompt/index.ts` — ambas tratam OPTIONS
 *      à mão com `getCorsHeaders`, então o import era morto.
 *   2. `z` vem sempre do mesmo módulo compartilhado das outras edges —
 *      `supabase/functions/_shared/zod-validate.ts` (que por sua vez re-exporta
 *      o pin único `_shared/contracts/_zod.ts`, a ÚNICA URL de Zod do projeto)
 *      — e nunca de URL direta (deno.land / esm.sh / npm:).
 *
 * Teste de contrato de fonte: lê os dois `index.ts` como texto e falha se
 * alguém reintroduzir o import morto ou trocar o caminho do Zod.
 *
 * Roda via o shim Vitest `tests/edge-functions/generate-ad-image.imports.test.ts`
 * (`supabase/functions/**` não está no include do vitest.config.ts).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ZOD_SHARED_PATH = "supabase/functions/_shared/zod-validate.ts";

const EDGES: Array<{ name: string; file: string }> = [
  { name: "generate-ad-image", file: "supabase/functions/generate-ad-image/index.ts" },
  { name: "generate-ad-prompt", file: "supabase/functions/generate-ad-prompt/index.ts" },
];

describe("edges do Magic Up — imports", () => {
  for (const edge of EDGES) {
    describe(edge.name, () => {
      const source = readFileSync(path.resolve(ROOT, edge.file), "utf8");

      it("não importa handleCorsPreflightIfNeeded (import morto)", () => {
        expect(source).not.toMatch(/handleCorsPreflightIfNeeded/);
      });

      it(`importa z do modulo compartilhado ${ZOD_SHARED_PATH}`, () => {
        expect(source).toMatch(
          /import\s*\{\s*z\s*\}\s*from\s*["']\.\.\/_shared\/zod-validate\.ts["']/,
        );
      });

      it("não importa zod por URL direta (deno.land/esm.sh/npm)", () => {
        expect(source).not.toMatch(/https:\/\/deno\.land\/x\/zod/);
        expect(source).not.toMatch(/https:\/\/esm\.sh\/zod/);
        expect(source).not.toMatch(/from\s*["']npm:zod/);
      });
    });
  }
});
