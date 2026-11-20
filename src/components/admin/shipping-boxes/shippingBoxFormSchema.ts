/**
 * Validação do formulário de caixa de transporte.
 *
 * O formulário guarda tudo como TEXTO (`ShippingBoxFormDraft`), porque o admin
 * digita com vírgula decimal ("26,5") e um campo numérico do navegador recusa a
 * vírgula conforme o idioma. O schema traduz o texto para o payload do serviço
 * (`ShippingBoxWrite`), já nas unidades do banco: cm, mm e gramas.
 *
 * As regras repetem os CHECKs da migration 20261119213000_create_shipping_boxes
 * para o erro aparecer no campo, e não como recusa genérica do banco:
 * medida externa de 0,01 a 300 cm, parede de 1 a 20 mm, medida interna > 0,
 * peso máximo até 100 kg e maior que o peso vazio, e fator de 0,50 a 1,00.
 *
 * As medidas internas NUNCA saem daqui: são colunas geradas pelo banco. O
 * cálculo abaixo serve só para validar e para a prévia na tela.
 */
import { z } from 'zod';
import { kgToG, mmToCm, round2 } from '@/lib/freight';
import type {
  ShippingBoxPatch,
  ShippingBoxRow,
  ShippingBoxWrite,
} from '@/services/shippingBoxService';

export const SHIPPING_BOX_FORM_FIELDS = [
  'code',
  'name',
  'outerHeightCm',
  'outerWidthCm',
  'outerLengthCm',
  'wallThicknessMm',
  'maxWeightKg',
  'emptyWeightG',
  'fillFactor',
  'sortOrder',
] as const;

export type ShippingBoxFormField = (typeof SHIPPING_BOX_FORM_FIELDS)[number];

/** O que está digitado no formulário. */
export type ShippingBoxFormDraft = Record<ShippingBoxFormField, string> & { isActive: boolean };

export type ShippingBoxFormErrors = Partial<Record<ShippingBoxFormField, string>>;

export type ShippingBoxFormResult =
  { ok: false; errors: ShippingBoxFormErrors } | { ok: true; values: ShippingBoxWrite };

/** Medidas internas e volume calculados a partir do que está digitado. */
export interface ShippingBoxInnerPreview {
  heightCm: number | null;
  widthCm: number | null;
  lengthCm: number | null;
  volumeL: number | null;
}

/**
 * Formulário em branco. Espessura, peso vazio, fator e ativa repetem os padrões
 * das colunas no banco (3 mm, 0 g, 0,90 e ativa).
 */
export const EMPTY_SHIPPING_BOX_DRAFT: ShippingBoxFormDraft = {
  code: '',
  name: '',
  outerHeightCm: '',
  outerWidthCm: '',
  outerLengthCm: '',
  wallThicknessMm: '3',
  maxWeightKg: '',
  emptyWeightG: '0',
  fillFactor: '0,90',
  sortOrder: '0',
  isActive: true,
};

/** DEFAULT da coluna `fill_factor` no banco. */
export const SHIPPING_BOX_COLUMN_FILL_FACTOR = 0.9;

function toFactorText(factor: number): string {
  return factor.toFixed(2).replace('.', ',');
}

/**
 * Formulário de caixa NOVA. O fator vem do "fator de aproveitamento padrão" de
 * `/admin/frete` (`freight_settings.default_fill_factor`) e a ordem é a próxima
 * da lista; são só sugestões, o admin pode trocar antes de salvar.
 */
export function newShippingBoxDraft(
  defaultFillFactor: number,
  sortOrder: number,
): ShippingBoxFormDraft {
  return {
    ...EMPTY_SHIPPING_BOX_DRAFT,
    fillFactor: toFactorText(defaultFillFactor),
    sortOrder: String(sortOrder),
  };
}

/** Maior ordem da lista + 1, para a caixa nova entrar no fim; lista vazia começa em 0. */
export function nextShippingBoxSortOrder(boxes: ReadonlyArray<{ sort_order: number }>): number {
  return boxes.length === 0 ? 0 : Math.max(...boxes.map((box) => box.sort_order)) + 1;
}

export const SHIPPING_BOX_CODE_MAX_LENGTH = 6;
export const SHIPPING_BOX_NAME_MAX_LENGTH = 80;

const CODE_PATTERN = /^[A-Z0-9]{1,6}$/;
const DECIMAL_2 = /^\d+(?:[.,]\d{1,2})?$/;
const DECIMAL_3 = /^\d+(?:[.,]\d{1,3})?$/;
const INTEGER = /^\d+$/;
const SIGNED_INTEGER = /^-?\d+$/;

const MIN_OUTER_CM = 0.01;
const MAX_OUTER_CM = 300;
const MAX_WEIGHT_G = 100_000;
/** Teto de `integer`, o tipo dos pesos em gramas e da ordem no banco. */
const MAX_INT4 = 2_147_483_647;

const OUTER_AXES = [
  { field: 'outerHeightCm', label: 'Altura' },
  { field: 'outerWidthCm', label: 'Largura' },
  { field: 'outerLengthCm', label: 'Comprimento' },
] as const;

/** Vírgula ou ponto decimal. Texto fora do formato vira `NaN`, que o schema recusa. */
function toNumber(text: string, pattern: RegExp): number {
  const trimmed = text.trim();
  return pattern.test(trimmed) ? Number(trimmed.replace(',', '.')) : Number.NaN;
}

/** Código como o banco vai guardar: sem espaço nas pontas e em maiúsculas. */
export function normalizeShippingBoxCode(text: string): string {
  return text.trim().toUpperCase();
}

/**
 * Medida interna de um eixo: externa − 2 × parede. É a mesma conta da coluna
 * gerada no banco. Devolve `null` quando a entrada não é número ou quando a
 * parede é maior que a medida (resultado negativo).
 */
export function innerDimensionCm(outerCm: number, wallThicknessMm: number): number | null {
  const wallCm = mmToCm(wallThicknessMm);
  if (wallCm === null) return null;
  return round2(outerCm - 2 * wallCm);
}

function positiveOrNull(value: number | null): number | null {
  return value !== null && value > 0 ? value : null;
}

/** Prévia ao vivo das internas e do volume em litros (1 L = 1.000 cm³). */
export function computeInnerPreview(draft: ShippingBoxFormDraft): ShippingBoxInnerPreview {
  const wallMm = toNumber(draft.wallThicknessMm, INTEGER);
  const inner = (text: string) =>
    positiveOrNull(innerDimensionCm(toNumber(text, DECIMAL_2), wallMm));

  const heightCm = inner(draft.outerHeightCm);
  const widthCm = inner(draft.outerWidthCm);
  const lengthCm = inner(draft.outerLengthCm);
  const volumeL =
    heightCm !== null && widthCm !== null && lengthCm !== null
      ? round2((heightCm * widthCm * lengthCm) / 1000)
      : null;

  return { heightCm, widthCm, lengthCm, volumeL };
}

function outerMeasure(label: string) {
  return z
    .string()
    .transform((text) => toNumber(text, DECIMAL_2))
    .pipe(
      z
        .number({
          error: `${label}: informe a medida externa em cm, com até 2 casas decimais (ex.: 27 ou 26,5).`,
        })
        .min(MIN_OUTER_CM, `${label}: use um valor entre 0,01 e 300 cm.`)
        .max(MAX_OUTER_CM, `${label}: use um valor entre 0,01 e 300 cm.`),
    );
}

export const shippingBoxFormSchema = z
  .object({
    code: z
      .string()
      .transform(normalizeShippingBoxCode)
      .pipe(
        z
          .string()
          .regex(
            CODE_PATTERN,
            'Use de 1 a 6 caracteres: letras de A a Z e números, sem espaço nem acento (ex.: P, GG, M2).',
          ),
      ),
    name: z
      .string()
      .trim()
      .min(1, 'Informe o nome da caixa.')
      .max(
        SHIPPING_BOX_NAME_MAX_LENGTH,
        `O nome pode ter até ${SHIPPING_BOX_NAME_MAX_LENGTH} caracteres.`,
      ),
    outerHeightCm: outerMeasure('Altura'),
    outerWidthCm: outerMeasure('Largura'),
    outerLengthCm: outerMeasure('Comprimento'),
    wallThicknessMm: z
      .string()
      .transform((text) => toNumber(text, INTEGER))
      .pipe(
        z
          .number({ error: 'Informe a espessura em milímetros, número inteiro (ex.: 3).' })
          .min(1, 'A espessura da parede vai de 1 a 20 mm.')
          .max(20, 'A espessura da parede vai de 1 a 20 mm.'),
      ),
    // Digitado em kg, sai daqui em GRAMAS (é como o banco guarda).
    maxWeightKg: z
      .string()
      .transform((text) => kgToG(toNumber(text, DECIMAL_3)) ?? Number.NaN)
      .pipe(
        z
          .number({
            error: 'Informe o peso máximo em kg, com até 3 casas decimais (ex.: 10 ou 12,5).',
          })
          .int('Informe o peso máximo em kg, com até 3 casas decimais (ex.: 10 ou 12,5).')
          .min(1, 'Use um valor entre 0,001 e 100 kg.')
          .max(MAX_WEIGHT_G, 'Use um valor entre 0,001 e 100 kg.'),
      ),
    emptyWeightG: z
      .string()
      .transform((text) => toNumber(text, INTEGER))
      .pipe(
        z
          .number({
            error: 'Informe o peso da caixa vazia em gramas, número inteiro (ex.: 0 ou 350).',
          })
          .lte(MAX_INT4, 'Peso da caixa vazia grande demais.'),
      ),
    fillFactor: z
      .string()
      .transform((text) => toNumber(text, DECIMAL_2))
      .pipe(
        z
          .number({ error: 'Informe o fator com até 2 casas decimais (ex.: 0,90).' })
          .min(0.5, 'O fator de aproveitamento vai de 0,50 a 1,00.')
          .max(1, 'O fator de aproveitamento vai de 0,50 a 1,00.'),
      ),
    sortOrder: z
      .string()
      .transform((text) => toNumber(text, SIGNED_INTEGER))
      .pipe(
        z
          .number({ error: 'Informe a ordem como número inteiro (ex.: 0, 1, 2).' })
          .min(-MAX_INT4, 'Ordem fora do limite.')
          .max(MAX_INT4, 'Ordem fora do limite.'),
      ),
    isActive: z.boolean(),
  })
  .superRefine((box, ctx) => {
    for (const axis of OUTER_AXES) {
      const innerCm = innerDimensionCm(box[axis.field], box.wallThicknessMm);
      if (innerCm === null || innerCm <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: [axis.field],
          message: `${axis.label}: a parede de ${box.wallThicknessMm} mm ocupa a medida inteira. A medida interna precisa ser maior que zero.`,
        });
      }
    }
    if (box.maxWeightKg <= box.emptyWeightG) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxWeightKg'],
        message: 'O peso máximo precisa ser maior que o peso da caixa vazia.',
      });
    }
  })
  .transform((box): ShippingBoxWrite => ({
    code: box.code,
    name: box.name,
    outer_height_cm: box.outerHeightCm,
    outer_width_cm: box.outerWidthCm,
    outer_length_cm: box.outerLengthCm,
    wall_thickness_mm: box.wallThicknessMm,
    empty_weight_g: box.emptyWeightG,
    max_weight_g: box.maxWeightKg,
    fill_factor: box.fillFactor,
    is_active: box.isActive,
    sort_order: box.sortOrder,
  }));

function isFormField(value: unknown): value is ShippingBoxFormField {
  return SHIPPING_BOX_FORM_FIELDS.some((field) => field === value);
}

/** Valida o formulário. Devolve o payload do serviço ou o primeiro erro de cada campo. */
export function parseShippingBoxForm(draft: ShippingBoxFormDraft): ShippingBoxFormResult {
  const result = shippingBoxFormSchema.safeParse(draft);
  if (result.success) return { ok: true, values: result.data };

  const errors: ShippingBoxFormErrors = {};
  for (const issue of result.error.issues) {
    const [field] = issue.path;
    if (isFormField(field) && errors[field] === undefined) errors[field] = issue.message;
  }
  return { ok: false, errors };
}

function toInputText(value: number): string {
  return String(value).replace('.', ',');
}

/** Preenche o formulário com uma caixa existente (peso máximo volta para kg). */
export function toShippingBoxDraft(row: ShippingBoxRow): ShippingBoxFormDraft {
  return {
    code: row.code,
    name: row.name,
    outerHeightCm: toInputText(row.outer_height_cm),
    outerWidthCm: toInputText(row.outer_width_cm),
    outerLengthCm: toInputText(row.outer_length_cm),
    wallThicknessMm: String(row.wall_thickness_mm),
    maxWeightKg: toInputText(row.max_weight_g / 1000),
    emptyWeightG: String(row.empty_weight_g),
    fillFactor: toFactorText(row.fill_factor),
    sortOrder: String(row.sort_order),
    isActive: row.is_active,
  };
}

/** `undefined` (campo não enviado) nunca conta como alteração. */
function changed<T>(value: T | undefined, saved: T): value is T {
  return value !== undefined && value !== saved;
}

/**
 * Só os campos que o admin mudou em relação à caixa aberta na edição. Vazio =
 * nada a salvar. Mandar o formulário inteiro regravaria, a partir de uma lista
 * que pode estar velha, o que outro admin alterou nesse meio-tempo.
 */
export function buildShippingBoxPatch(
  row: ShippingBoxRow,
  values: ShippingBoxWrite,
): ShippingBoxPatch {
  const patch: ShippingBoxPatch = {};
  if (changed(values.code, row.code)) patch.code = values.code;
  if (changed(values.name, row.name)) patch.name = values.name;
  if (changed(values.outer_height_cm, row.outer_height_cm)) {
    patch.outer_height_cm = values.outer_height_cm;
  }
  if (changed(values.outer_width_cm, row.outer_width_cm)) {
    patch.outer_width_cm = values.outer_width_cm;
  }
  if (changed(values.outer_length_cm, row.outer_length_cm)) {
    patch.outer_length_cm = values.outer_length_cm;
  }
  if (changed(values.wall_thickness_mm, row.wall_thickness_mm)) {
    patch.wall_thickness_mm = values.wall_thickness_mm;
  }
  if (changed(values.empty_weight_g, row.empty_weight_g)) {
    patch.empty_weight_g = values.empty_weight_g;
  }
  if (changed(values.max_weight_g, row.max_weight_g)) patch.max_weight_g = values.max_weight_g;
  // Em centésimos, para 0,9 e 0,90 contarem como o mesmo fator.
  if (
    values.fill_factor !== undefined &&
    Math.round(values.fill_factor * 100) !== Math.round(row.fill_factor * 100)
  ) {
    patch.fill_factor = values.fill_factor;
  }
  if (changed(values.is_active, row.is_active)) patch.is_active = values.is_active;
  if (changed(values.sort_order, row.sort_order)) patch.sort_order = values.sort_order;
  return patch;
}
