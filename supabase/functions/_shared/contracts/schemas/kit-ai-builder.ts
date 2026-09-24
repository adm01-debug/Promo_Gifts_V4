/**
 * supabase/functions/_shared/contracts/schemas/kit-ai-builder.ts
 *
 * v1: prompt 6-2000 chars. Sunset 2026-10-31.
 * v2: strict + idempotency_key.
 */
import { z } from "https://esm.sh/zod@3.23.8";

export const KitAiBuilderV1 = z.object({
  prompt: z
    .string()
    .min(6, { message: "prompt inválido (6–2000 chars)" })
    .max(2000, { message: "prompt inválido (6–2000 chars)" }),
});

export const KitAiBuilderV2 = z
  .object({
    prompt: z.string().min(6).max(2000),
    idempotency_key: z.string().uuid(),
  })
  .strict();

/** Runtime contract for the model tool-call. Never trust model JSON directly. */
export const KitAiBuilderSuggestion = z
  .object({
    kit_type: z.enum(["montado", "original", "simples"]),
    box_keywords: z.array(z.string().trim().min(1).max(80)).min(1).max(4),
    item_keywords: z.array(z.string().trim().min(1).max(80)).min(3).max(6),
    target_price_brl: z
      .object({ min: z.number().finite().nonnegative(), max: z.number().finite().nonnegative() })
      .strict()
      .refine((value) => value.max >= value.min, {
        message: "target_price_brl.max must be greater than or equal to min",
      }),
    narrative: z.string().trim().min(1).max(500),
    // Opcionais (etapa 17): sem eles, o cliente mantém o fallback atual
    // ("Kit sugerido N") — nunca quebram um cliente que ainda não os lê.
    title: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().min(1).max(160).optional(),
    style_tag: z.string().trim().min(1).max(40).optional(),
  })
  .strict();

/**
 * Etapa 2 (plano de 100 etapas, 2026-09-24): trunca os campos opcionais de
 * apresentação (title/description) antes do safeParse — um deles maior que
 * o limite não pode derrubar a sugestão inteira (kit_type/box_keywords/
 * item_keywords/narrative, que são o que o kit-builder realmente precisa)
 * com um 502 "Resposta da IA não pôde ser validada". O tool schema já pede
 * maxLength ao modelo; isto é a defesa quando ele ignora o pedido.
 */
export function truncateKitAiBuilderPresentationFields(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const draft: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  if (typeof draft.title === "string" && draft.title.length > 80) {
    draft.title = draft.title.slice(0, 80).trim();
  }
  if (typeof draft.description === "string" && draft.description.length > 160) {
    draft.description = draft.description.slice(0, 160).trim();
  }
  return draft;
}

export const KitAiBuilderSchemas = {
  name: "kit-ai-builder",
  versions: { "1": KitAiBuilderV1, "2": KitAiBuilderV2 },
  defaultVersion: "1" as const,
  deprecated: [
    {
      version: "1",
      sunset: "2026-10-31",
      migrationUrl:
        "https://github.com/adm01-debug/promo-gifts-v4/blob/main/docs/contracts/MIGRATION_GUIDE.md#kit-ai-builder",
    },
  ],
};
