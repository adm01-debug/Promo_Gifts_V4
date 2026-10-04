import { z } from 'zod';
import {
  normalizeCpf,
  isNormalizedCpf,
  validateCpf,
  normalizeCep,
  isNormalizedCep,
  validateCep,
  normalizePhoneBr,
  isNormalizedPhoneBr,
  validatePhoneBr,
} from './masks';

/**
 * Schemas Zod BR (CPF / CEP / telefone) — mesmo contrato de `cnpj-schema.ts`:
 * qualquer valor enviado a persistência é `null` OU dígitos normalizados
 * (sem máscara/espaços/símbolos).
 *
 * Aceita input com máscara para conveniência: normaliza antes de validar.
 * SSOT — usar em todo create/update que persistir CPF, CEP ou telefone.
 */

export const cpfOptionalSchema = z
  .string()
  .nullable()
  .optional()
  .transform((v) => {
    const raw = v?.trim() ?? '';
    if (raw === '') return null;
    return normalizeCpf(raw);
  })
  .refine((v) => v === null || isNormalizedCpf(v), {
    message: 'CPF deve conter exatamente 11 dígitos (sem máscara).',
  })
  .refine((v) => v === null || validateCpf(v), {
    message: 'CPF inválido (dígitos verificadores não conferem).',
  });

export const cepOptionalSchema = z
  .string()
  .nullable()
  .optional()
  .transform((v) => {
    const raw = v?.trim() ?? '';
    if (raw === '') return null;
    return normalizeCep(raw);
  })
  .refine((v) => v === null || isNormalizedCep(v), {
    message: 'CEP deve conter exatamente 8 dígitos (sem máscara).',
  })
  .refine((v) => v === null || validateCep(v), {
    message: 'CEP inválido.',
  });

export const phoneBrOptionalSchema = z
  .string()
  .nullable()
  .optional()
  .transform((v) => {
    const raw = v?.trim() ?? '';
    if (raw === '') return null;
    return normalizePhoneBr(raw);
  })
  .refine((v) => v === null || isNormalizedPhoneBr(v), {
    message: 'Telefone deve ter 10 ou 11 dígitos com DDD (sem máscara).',
  })
  .refine((v) => v === null || validatePhoneBr(v), {
    message: 'Telefone inválido (verifique DDD e formato).',
  });

/** Helpers imperativos para code paths que ainda não usam Zod diretamente. */
export function assertPersistableCpf(value: string | null | undefined): string | null {
  const parsed = cpfOptionalSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'CPF inválido');
  }
  return parsed.data;
}

export function assertPersistableCep(value: string | null | undefined): string | null {
  const parsed = cepOptionalSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'CEP inválido');
  }
  return parsed.data;
}

export function assertPersistablePhoneBr(value: string | null | undefined): string | null {
  const parsed = phoneBrOptionalSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Telefone inválido');
  }
  return parsed.data;
}
