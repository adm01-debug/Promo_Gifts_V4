/**
 * Contrato da cotação de frete Promo Gifts → Loggi (lado Promo, etapa 81).
 *
 * Texto, exemplos e erros em `docs/frete/contrato-cotacao-loggi.md`; o bloco
 * `contract` desse documento e este arquivo dizem a mesma coisa. Os nomes dos
 * campos são `snake_case` porque é o JSON que viaja entre os dois sistemas.
 *
 * Medidas: centímetros externos da caixa e **gramas brutas** do volume (caixa +
 * produtos), que é o que a transportadora cuba e pesa. Peso fracionado do motor
 * sobe para o grama inteiro: arredondar para baixo subcobraria o frete.
 */
import { z } from 'zod';

import type { FreightPlan } from './types';

const CEP_PATTERN = /^\d{5}-\d{3}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const cepSchema = z
  .string({ error: 'o CEP deve ser um texto' })
  .regex(CEP_PATTERN, 'o CEP deve estar no formato 00000-000');

/** Ida e volta: `2026-02-30` vira `2026-03-02` no `Date` e é recusada. */
function dataExiste(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const isoDateSchema = z
  .string({ error: 'a data deve ser um texto' })
  .regex(ISO_DATE_PATTERN, 'a data deve estar no formato AAAA-MM-DD')
  .refine(dataExiste, 'a data não existe');

const positiveNumber = z
  .number({ error: 'informe um número válido' })
  .positive('o valor deve ser maior que zero');

export const quoteVolumeSchema = z.object({
  height_cm: positiveNumber,
  width_cm: positiveNumber,
  length_cm: positiveNumber,
  weight_g: z
    .number({ error: 'informe um número válido' })
    .int('o peso deve ser em gramas inteiras')
    .positive('o peso deve ser maior que zero'),
});

export const quoteRequestSchema = z.object({
  origin_cep: cepSchema,
  destination_cep: cepSchema,
  declared_value_brl: positiveNumber,
  volumes: z.array(quoteVolumeSchema).min(1, 'informe ao menos um volume'),
  ready_date: isoDateSchema.optional(),
});

export const quoteOptionSchema = z.object({
  carrier: z.string().min(1),
  service: z.string().min(1),
  price_brl: positiveNumber,
  transit_business_days: z.number().int().nonnegative(),
  delivery_date: isoDateSchema.optional(),
  option_id: z.string().min(1),
});

export const quoteResponseSchema = z.object({
  quote_id: z.string().min(1),
  options: z.array(quoteOptionSchema).min(1, 'a cotação veio sem opções'),
  computed_at: z.iso.datetime({ offset: true }),
});

/** Status HTTP de erro do contrato e o código que vai no corpo. */
export const QUOTE_ERROR_CODES = {
  400: 'invalid_request',
  401: 'unauthorized',
  429: 'rate_limited',
  502: 'carrier_error',
  504: 'carrier_timeout',
} as const;

export const quoteErrorSchema = z.object({
  error: z.enum([
    'invalid_request',
    'unauthorized',
    'rate_limited',
    'carrier_error',
    'carrier_timeout',
  ]),
  message: z.string().min(1),
  request_id: z.string().min(1).optional(),
});

export type QuoteVolume = z.infer<typeof quoteVolumeSchema>;
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type QuoteOption = z.infer<typeof quoteOptionSchema>;
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;
export type QuoteError = z.infer<typeof quoteErrorSchema>;

export interface QuoteRequestParams {
  originCep: string;
  destinationCep: string;
  declaredValueBrl: number;
  /** ISO `AAAA-MM-DD`: quando a mercadoria fica pronta para coleta. */
  readyDate?: string;
}

export type BuildQuoteRequestResult =
  { status: 'error'; reason: string } | { status: 'ok'; request: QuoteRequest };

const ROTULOS_CAMPO: Record<string, string> = {
  origin_cep: 'CEP de origem',
  destination_cep: 'CEP de destino',
  declared_value_brl: 'Valor declarado',
  ready_date: 'Data de prontidão',
  volumes: 'Volumes',
  height_cm: 'altura',
  width_cm: 'largura',
  length_cm: 'comprimento',
  weight_g: 'peso',
};

/** `['volumes', 0, 'weight_g']` → `Volume 1, peso`; nunca expõe o caminho técnico. */
export function rotuloDoCaminho(path: readonly PropertyKey[]): string {
  const [campo, indice, medida] = path;
  const rotulo = (chave: PropertyKey | undefined) => ROTULOS_CAMPO[String(chave)] ?? 'Cotação';
  if (campo === 'volumes' && typeof indice === 'number') {
    return `Volume ${indice + 1}, ${rotulo(medida)}`;
  }
  return rotulo(campo);
}

/**
 * Monta o pedido de cotação a partir do plano de frete. Nunca lança: plano
 * ausente ou que não está `ok` (sem volumes fechados não há o que cotar),
 * parâmetros ausentes ou dados fora do contrato voltam como `status: 'error'`.
 */
export function buildQuoteRequest(
  plan: FreightPlan | null,
  params: QuoteRequestParams | undefined,
): BuildQuoteRequestResult {
  if (plan?.status !== 'ok') {
    return {
      status: 'error',
      reason: 'O plano de frete não está calculado: complete os dados dos produtos antes de cotar.',
    };
  }
  if (params === undefined) {
    return {
      status: 'error',
      reason: 'Informe o CEP de origem, o CEP de destino e o valor declarado para cotar.',
    };
  }

  const parsed = quoteRequestSchema.safeParse({
    origin_cep: params.originCep,
    destination_cep: params.destinationCep,
    declared_value_brl: params.declaredValueBrl,
    volumes: plan.volumes.map(({ box, grossWeightG }) => ({
      height_cm: box.outer.heightCm,
      width_cm: box.outer.widthCm,
      length_cm: box.outer.lengthCm,
      weight_g: Math.ceil(grossWeightG),
    })),
    ...(params.readyDate === undefined ? {} : { ready_date: params.readyDate }),
  });

  if (!parsed.success) {
    const detalhe = parsed.error.issues
      .map((issue) => `${rotuloDoCaminho(issue.path)}: ${issue.message}`)
      .join('; ');
    return { status: 'error', reason: `Dados da cotação inválidos — ${detalhe}.` };
  }

  return { status: 'ok', request: parsed.data };
}
