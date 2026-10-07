/**
 * Retorna somente os dígitos do CNPJ, limitado a 14 caracteres.
 *
 * SSOT para "como armazenar" um CNPJ no formulário/estado: `normalizeCnpj`.
 * O valor renderizado em inputs/labels DEVE passar por `maskCnpj` na hora
 * do render — o estado permanece cru (`^\d{0,14}$`).
 */
export function normalizeCnpj(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '').slice(0, 14);
}

/**
 * True quando o valor contém exatamente 14 dígitos (sem máscara).
 * Não valida os DVs — para isso use `validateCnpj`.
 */
export function isNormalizedCnpj(value: string | null | undefined): boolean {
  return /^\d{14}$/.test(value ?? '');
}

export function maskCnpj(value: string | null | undefined): string {
  const digits = normalizeCnpj(value);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

export function validateCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calc = (slice: string, weights: number[]) =>
    weights.reduce((sum, w, i) => sum + parseInt(slice[i]) * w, 0);

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let remainder = calc(digits, w1) % 11;
  const d1 = remainder < 2 ? 0 : 11 - remainder;
  if (parseInt(digits[12]) !== d1) return false;

  remainder = calc(digits, w2) % 11;
  const d2 = remainder < 2 ? 0 : 11 - remainder;
  return parseInt(digits[13]) === d2;
}

export function maskCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, '$1-$2');
}

// ─────────────────────────────────────────────────────────────────────────
// CPF / CEP / Telefone BR — mesmos contratos do CNPJ acima:
// normalize* guarda dígitos crus, isNormalized* checa formato, validate*
// confere dígitos verificadores (CPF) ou plausibilidade (CEP/telefone).
// ─────────────────────────────────────────────────────────────────────────

export function normalizeCpf(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '').slice(0, 11);
}

export function isNormalizedCpf(value: string | null | undefined): boolean {
  return /^\d{11}$/.test(value ?? '');
}

export function maskCpf(value: string | null | undefined): string {
  const digits = normalizeCpf(value);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function validateCpf(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits.charAt(i)) * (10 - i);
  let d = (sum * 10) % 11;
  if (d === 10) d = 0;
  if (parseInt(digits.charAt(9)) !== d) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits.charAt(i)) * (11 - i);
  d = (sum * 10) % 11;
  if (d === 10) d = 0;
  return parseInt(digits.charAt(10)) === d;
}

export function normalizeCep(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '').slice(0, 8);
}

export function isNormalizedCep(value: string | null | undefined): boolean {
  return /^\d{8}$/.test(value ?? '');
}

/**
 * CEP BR não tem dígito verificador — valida formato (8 dígitos, não tudo
 * igual, não todo zero). Para garantir existência real use uma API de CEP.
 */
export function validateCep(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 8) return false;
  if (/^(\d)\1{7}$/.test(digits)) return false;
  return true;
}

export function normalizePhoneBr(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '').slice(0, 11);
}

export function isNormalizedPhoneBr(value: string | null | undefined): boolean {
  return /^\d{10,11}$/.test(value ?? '');
}

/**
 * Telefone BR: 10 dígitos (fixo, começa 2-5) ou 11 dígitos (móvel, 9 na
 * 3ª posição). DDD válido = 11–99 (0X é inexistente).
 */
export function validatePhoneBr(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 10 && digits.length !== 11) return false;
  const ddd = parseInt(digits.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  if (/^(\d)\1{9,10}$/.test(digits)) return false;
  if (digits.length === 11 && digits[2] !== '9') return false;
  if (digits.length === 10 && !/^[2-5]/.test(digits.slice(2))) return false;
  return true;
}

export const ESTADOS_BR = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
] as const;
