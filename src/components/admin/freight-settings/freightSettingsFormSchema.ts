/**
 * Regras do formulário de parâmetros de frete (`/admin/frete`).
 *
 * O formulário guarda o que a pessoa digita como texto (`FreightSettingsDraft`)
 * e só vira número aqui, na validação. Os limites repetem os CHECK da tabela
 * `freight_settings` (migration 20261119213100 e a de endurecimento): divisores
 * de cubagem de 1000 a 10000, fator de 0,50 a 1,00 e folga interna de 0 a 60
 * dias. Validar antes evita que o banco recuse o salvar com uma mensagem
 * genérica.
 */
import { z } from 'zod';
import type {
  FreightSettingsPatch,
  FreightSettingsRow,
  FreightSettingsWrite,
  MultiPersonalizationRule,
} from '@/services/freightSettingsService';

/** O que está nos campos da tela, como foi digitado. */
export interface FreightSettingsDraft {
  originCep: string;
  cubicDivisorCorreios: string;
  cubicDivisorRodoviario: string;
  defaultFillFactor: string;
  internalBufferDays: string;
  multiPersonalizationRule: MultiPersonalizationRule;
}

export type FreightSettingsField = keyof FreightSettingsDraft;

/** Mensagem de erro por campo; campo sem erro não aparece. */
export type FreightSettingsFieldErrors = Partial<Record<FreightSettingsField, string>>;

export type FreightSettingsParseResult =
  { ok: false; errors: FreightSettingsFieldErrors } | { ok: true; values: FreightSettingsWrite };

const FIELDS = [
  'originCep',
  'cubicDivisorCorreios',
  'cubicDivisorRodoviario',
  'defaultFillFactor',
  'internalBufferDays',
  'multiPersonalizationRule',
] as const satisfies readonly FreightSettingsField[];

const CEP_PATTERN = /^\d{5}-\d{3}$/;
/** Só algarismos; o limite de cada campo vem da faixa abaixo. */
const INTEGER_PATTERN = /^\d+$/;
/** Um dígito e até duas casas, com vírgula ou ponto — a coluna é numeric(3,2). */
const FACTOR_PATTERN = /^\d(?:[.,]\d{1,2})?$/;

const FILL_FACTOR_MIN = 0.5;
const FILL_FACTOR_MAX = 1;

const DIVISOR_MIN = 1000;
const DIVISOR_MAX = 10000;
const BUFFER_DAYS_MAX = 60;

const DIVISOR_FORMAT_MESSAGE =
  'Use só algarismos, sem ponto nem vírgula, maior que zero (ex.: 6000).';
const DIVISOR_RANGE_MESSAGE = `Use um valor entre ${DIVISOR_MIN} e ${DIVISOR_MAX}.`;
const BUFFER_FORMAT_MESSAGE = 'Use só algarismos, sem ponto nem vírgula (ex.: 2).';
const BUFFER_RANGE_MESSAGE = `Use um valor entre 0 e ${BUFFER_DAYS_MAX} dias.`;
const FACTOR_MESSAGE = 'Use um valor entre 0,50 e 1,00, com até duas casas decimais.';

const divisorSchema = z
  .string()
  .trim()
  .regex(INTEGER_PATTERN, DIVISOR_FORMAT_MESSAGE)
  .transform(Number)
  .refine((value) => value >= DIVISOR_MIN && value <= DIVISOR_MAX, DIVISOR_RANGE_MESSAGE);

export const freightSettingsFormSchema = z.object({
  originCep: z.string().regex(CEP_PATTERN, 'Informe o CEP completo, no formato 00000-000.'),
  cubicDivisorCorreios: divisorSchema,
  cubicDivisorRodoviario: divisorSchema,
  defaultFillFactor: z
    .string()
    .trim()
    .regex(FACTOR_PATTERN, FACTOR_MESSAGE)
    .transform((text) => Number(text.replace(',', '.')))
    .refine((value) => value >= FILL_FACTOR_MIN && value <= FILL_FACTOR_MAX, FACTOR_MESSAGE),
  internalBufferDays: z
    .string()
    .trim()
    .regex(INTEGER_PATTERN, BUFFER_FORMAT_MESSAGE)
    .transform(Number)
    .refine((value) => value <= BUFFER_DAYS_MAX, BUFFER_RANGE_MESSAGE),
  multiPersonalizationRule: z.enum(['max', 'sum']),
});

/** Aplica a máscara 00000-000 ao que foi digitado (só dígitos, no máximo 8). */
export function maskCep(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

/** Fator com vírgula e duas casas, como se escreve em PT-BR: 0.9 vira "0,90". */
export function formatFillFactor(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

/** Preenche os campos a partir da linha salva no banco. */
export function toFreightSettingsDraft(row: FreightSettingsRow): FreightSettingsDraft {
  return {
    originCep: maskCep(row.origin_cep),
    cubicDivisorCorreios: String(row.cubic_divisor_correios),
    cubicDivisorRodoviario: String(row.cubic_divisor_rodoviario),
    defaultFillFactor: formatFillFactor(row.default_fill_factor),
    internalBufferDays: String(row.internal_buffer_days),
    multiPersonalizationRule: row.multi_personalization_rule === 'sum' ? 'sum' : 'max',
  };
}

/** Valida o que foi digitado e devolve os valores prontos para gravar. */
export function parseFreightSettingsDraft(draft: FreightSettingsDraft): FreightSettingsParseResult {
  const result = freightSettingsFormSchema.safeParse(draft);
  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error);
    const errors: FreightSettingsFieldErrors = {};
    for (const field of FIELDS) {
      const message = fieldErrors[field]?.[0];
      if (message) errors[field] = message;
    }
    return { ok: false, errors };
  }

  const values = result.data;
  return {
    ok: true,
    values: {
      origin_cep: values.originCep,
      cubic_divisor_correios: values.cubicDivisorCorreios,
      cubic_divisor_rodoviario: values.cubicDivisorRodoviario,
      default_fill_factor: values.defaultFillFactor,
      internal_buffer_days: values.internalBufferDays,
      multi_personalization_rule: values.multiPersonalizationRule,
    },
  };
}

/** Compara o fator em centésimos, para 0,9 e 0,90 contarem como o mesmo valor. */
function sameFactor(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}

/** Só os campos que mudaram em relação à linha salva. Vazio = nada a salvar. */
export function buildFreightSettingsPatch(
  row: FreightSettingsRow,
  values: FreightSettingsWrite,
): FreightSettingsPatch {
  const patch: FreightSettingsPatch = {};
  if (values.origin_cep !== row.origin_cep) patch.origin_cep = values.origin_cep;
  if (values.cubic_divisor_correios !== row.cubic_divisor_correios) {
    patch.cubic_divisor_correios = values.cubic_divisor_correios;
  }
  if (values.cubic_divisor_rodoviario !== row.cubic_divisor_rodoviario) {
    patch.cubic_divisor_rodoviario = values.cubic_divisor_rodoviario;
  }
  if (!sameFactor(values.default_fill_factor, row.default_fill_factor)) {
    patch.default_fill_factor = values.default_fill_factor;
  }
  if (values.internal_buffer_days !== row.internal_buffer_days) {
    patch.internal_buffer_days = values.internal_buffer_days;
  }
  if (values.multi_personalization_rule !== row.multi_personalization_rule) {
    patch.multi_personalization_rule = values.multi_personalization_rule;
  }
  return patch;
}
