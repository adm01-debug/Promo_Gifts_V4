/**
 * Formato salvo do plano de frete (`quotes.freight_plan`, etapas 61–62).
 *
 * `freightPlanBodySchema` espelha `FreightPlan` (`./types.ts`) campo a campo; o
 * teste de tipo garante que os dois andam juntos. `FreightPlan` não carrega
 * versão (é o objeto em memória), então a versão fica no envelope salvo:
 * `freightPlanSchema` = corpo + `version: 1`. Quem grava usa `toStoredFreightPlan`.
 *
 * Ler é sempre `parseStoredFreightPlan`: o JSON do banco é `unknown`, e plano
 * inválido, sem versão ou de versão que este código não conhece vira
 * "plano antigo, recalcular" — nunca um plano que a tela exibiria sem conferir.
 */
import { z } from 'zod';

import type { FreightPlan } from './types';

/** Versão atual do formato salvo. Mudou o formato → some 1 e trate a anterior. */
export const FREIGHT_PLAN_VERSION = 1;

/** Mensagem única para qualquer plano salvo que não dá para usar. */
export const STALE_PLAN_REASON = 'Plano antigo, recalcular o frete.';

const dimensionsSchema = z.object({
  heightCm: z.number().positive(),
  widthCm: z.number().positive(),
  lengthCm: z.number().positive(),
});

const cubicWeightSchema = z.object({
  correios: z.number().nonnegative(),
  rodoviario: z.number().nonnegative(),
});

const shippingBoxSchema = z.object({
  id: z.string(),
  code: z.string().min(1),
  name: z.string(),
  inner: dimensionsSchema,
  outer: dimensionsSchema,
  emptyWeightG: z.number().nonnegative(),
  maxWeightG: z.number().positive(),
  fillFactor: z.number().positive().max(1),
});

const packVolumeSchema = z.object({
  box: shippingBoxSchema,
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })),
  grossWeightG: z.number().nonnegative(),
  cubicWeightG: cubicWeightSchema,
  volumeM3: z.number().nonnegative(),
  fillRatio: z.number().nonnegative(),
});

const incompleteItemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  missing: z.array(z.enum(['height', 'length', 'weight', 'width'])),
});

const freightPlanShape = z.object({
  status: z.enum(['dados_insuficientes', 'nao_cabe', 'ok']),
  volumes: z.array(packVolumeSchema),
  totals: z.object({
    boxesByCode: z.record(z.string(), z.number().int().positive()),
    grossWeightG: z.number().nonnegative(),
    volumeM3: z.number().nonnegative(),
    cubicWeightG: cubicWeightSchema,
  }),
  warnings: z.array(z.string()),
  missing: z.array(incompleteItemSchema),
  mixMode: z.enum(['misturar', 'separar']),
  computedAt: z.iso.datetime({ offset: true }),
  itemsHash: z.string().min(1),
});

/** Plano `ok` tem volumes; qualquer outro status não tem (o motor devolve `[]`). */
function volumesCombinamComStatus(plan: { status: string; volumes: readonly unknown[] }): boolean {
  return plan.status === 'ok' ? plan.volumes.length > 0 : plan.volumes.length === 0;
}

const COERENCIA_MESSAGE = 'status ok exige volumes; os demais status exigem volumes vazios';

/** Espelho exato de `FreightPlan`, sem versão. */
export const freightPlanBodySchema = freightPlanShape.refine(volumesCombinamComStatus, {
  message: COERENCIA_MESSAGE,
  path: ['volumes'],
});

/** Envelope salvo: o corpo do plano mais a versão do formato. */
export const freightPlanSchema = freightPlanShape
  .extend({ version: z.literal(FREIGHT_PLAN_VERSION) })
  .refine(volumesCombinamComStatus, { message: COERENCIA_MESSAGE, path: ['volumes'] });

/** Igualdade exata de tipos: `true` só se `A` e `B` são o mesmo tipo. */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/**
 * Guarda de tipo, conferida pelo `qa:typecheck` (os testes não entram nele):
 * o corpo do schema e `FreightPlan` têm de ser o mesmo tipo. Campo novo ou
 * opcional só de um lado deixa de compilar aqui.
 */
export const FREIGHT_PLAN_SCHEMA_MATCHES_TYPE: Equal<
  z.infer<typeof freightPlanBodySchema>,
  FreightPlan
> = true;

export type StoredFreightPlan = z.infer<typeof freightPlanSchema>;

export type ParsedFreightPlan =
  { status: 'invalid'; reason: string } | { status: 'ok'; plan: FreightPlan };

/** Plano em memória → JSON a gravar em `quotes.freight_plan`. */
export function toStoredFreightPlan(plan: FreightPlan): StoredFreightPlan {
  return { ...plan, version: FREIGHT_PLAN_VERSION };
}

/** Lê o que veio do banco. Nunca lança; o `plan` devolvido não carrega `version`. */
export function parseStoredFreightPlan(value: unknown): ParsedFreightPlan {
  const envelope = freightPlanSchema.safeParse(value);
  if (!envelope.success) return { status: 'invalid', reason: STALE_PLAN_REASON };
  // O corpo descarta a chave `version`: o plano em memória não a tem.
  return { status: 'ok', plan: freightPlanBodySchema.parse(envelope.data) };
}
