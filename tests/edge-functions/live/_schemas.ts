/**
 * tests/edge-functions/live/_schemas.ts
 * --------------------------------------------------------------
 * Validadores zod reutilizáveis para as saídas das Edge Functions.
 * Mantêm os asserts de shape concisos e consistentes entre as 60+ specs.
 */
import { z } from "zod";

/**
 * Item de `fields` no envelope de validação. O contrato canônico
 * (supabase/functions/_shared/contracts/errors.ts → FieldIssue e
 * _shared/zod-validate.ts → ValidationFieldError) emite objetos
 * { path, message, code? }; strings simples ficam aceitas por compat.
 */
const fieldIssueSchema = z.union([
  z.string(),
  z.object({ path: z.string(), message: z.string(), code: z.string().optional() }).passthrough(),
]);

/** Contrato de erro padrão das edges migradas: { code, message, fields? }. */
export const errorEnvelopeSchema = z
  .object({
    code: z.string().optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    fields: z.array(fieldIssueSchema).optional(),
  })
  .passthrough()
  // ao menos um identificador de erro presente
  .refine((o) => Boolean(o.code || o.error || o.message), {
    message: "erro sem code/error/message",
  });

export const healthSchema = z
  .object({
    status: z.string().optional(),
    ok: z.boolean().optional(),
    healthy: z.boolean().optional(),
  })
  .passthrough()
  .refine((o) => o.status !== undefined || o.ok !== undefined || o.healthy !== undefined, {
    message: "health sem status/ok/healthy",
  });

/** Lista de catálogo: array puro OU { data: [...] } OU { items: [...] }. */
export const catalogListSchema = z.union([
  z.array(z.unknown()),
  z.object({ data: z.array(z.unknown()) }).passthrough(),
  z.object({ items: z.array(z.unknown()) }).passthrough(),
  z.object({ results: z.array(z.unknown()) }).passthrough(),
]);

/**
 * materials-api (action "groups"): sucesso = { data: { groups: [...], count }, success: true }
 * (consumido por src/services/materialService.ts via `result.data`). Com o banco
 * externo não configurado devolve { data: [], _unconfigured: true } (200).
 */
export const materialsGroupsSchema = z.union([
  z
    .object({
      data: z.object({ groups: z.array(z.unknown()), count: z.number() }).passthrough(),
      success: z.literal(true),
    })
    .passthrough(),
  z.object({ data: z.array(z.unknown()), _unconfigured: z.literal(true) }).passthrough(),
]);

/** Relatório de auditoria/dry-run: objeto com algum campo de resumo. */
export const auditReportSchema = z.object({}).passthrough();

/** Objeto genérico não-vazio (happy-path sem shape conhecido). */
export const nonEmptyObjectSchema = z
  .record(z.string(), z.unknown())
  .refine((o) => Object.keys(o).length > 0, { message: "objeto vazio" });

export type Schema = z.ZodTypeAny;
