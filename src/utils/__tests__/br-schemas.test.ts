import { describe, it, expect } from 'vitest';
import {
  cpfOptionalSchema,
  cepOptionalSchema,
  phoneBrOptionalSchema,
  assertPersistableCpf,
  assertPersistableCep,
  assertPersistablePhoneBr,
} from '../br-schemas';
import {
  validateCpf,
  validateCep,
  validatePhoneBr,
  normalizeCpf,
  normalizeCep,
  normalizePhoneBr,
  maskCpf,
} from '../masks';

// CPFs/telefones sintéticos válidos (DVs corretos) e inválidos — gerados para
// teste, não são documentos reais.
const CPF_VALIDOS = ['52998224725', '11144477735', '93541134780'];
const CPF_INVALIDOS = ['12345678901', '52998224726', '11111111111', '00000000000'];

describe('validateCpf (masks)', () => {
  it.each(CPF_VALIDOS)('aceita CPF válido %s', (cpf) => {
    expect(validateCpf(cpf)).toBe(true);
  });

  it.each(CPF_INVALIDOS)('rejeita CPF inválido %s', (cpf) => {
    expect(validateCpf(cpf)).toBe(false);
  });

  it('rejeita todos os dígitos repetidos', () => {
    for (let d = 0; d <= 9; d++) {
      expect(validateCpf(String(d).repeat(11))).toBe(false);
    }
  });

  it('rejeita tamanhos errados', () => {
    expect(validateCpf('123')).toBe(false);
    expect(validateCpf('123456789012')).toBe(false);
    expect(validateCpf('')).toBe(false);
  });
});

describe('validateCep (masks)', () => {
  it('aceita CEP de 8 dígitos plausível', () => {
    expect(validateCep('01310100')).toBe(true);
    expect(validateCep('01310-100')).toBe(true);
  });

  it('rejeita formato errado e dígitos repetidos', () => {
    expect(validateCep('1234567')).toBe(false);
    expect(validateCep('123456789')).toBe(false);
    expect(validateCep('00000000')).toBe(false);
    expect(validateCep('')).toBe(false);
  });
});

describe('validatePhoneBr (masks)', () => {
  it('aceita celular 11 dígitos (9 na 3ª posição)', () => {
    expect(validatePhoneBr('11987654321')).toBe(true);
    expect(validatePhoneBr('(11) 98765-4321')).toBe(true);
  });

  it('aceita fixo 10 dígitos', () => {
    expect(validatePhoneBr('1134567890')).toBe(true);
    expect(validatePhoneBr('(11) 3456-7890')).toBe(true);
  });

  it('rejeita DDD inexistente (0X)', () => {
    expect(validatePhoneBr('01987654321')).toBe(false);
    expect(validatePhoneBr('0087654321')).toBe(false);
  });

  it('rejeita celular sem 9 na 3ª posição', () => {
    expect(validatePhoneBr('11887654321')).toBe(false);
  });

  it('rejeita tamanhos e repetições inválidas', () => {
    expect(validatePhoneBr('119876543')).toBe(false);
    expect(validatePhoneBr('11111111111')).toBe(false);
    expect(validatePhoneBr('')).toBe(false);
  });
});

describe('normalize* (masks)', () => {
  it('stripa máscara e limita tamanho', () => {
    expect(normalizeCpf('529.982.247-25')).toBe('52998224725');
    expect(normalizeCpf('52998224725999')).toBe('52998224725');
    expect(normalizeCep('01310-100')).toBe('01310100');
    expect(normalizePhoneBr('+55 11 98765-4321')).toBe('55119876543'); // corta em 11
  });

  it('maskCpf formata 000.000.000-00', () => {
    expect(maskCpf('52998224725')).toBe('529.982.247-25');
    expect(maskCpf('529')).toBe('529');
  });
});

describe('cpfOptionalSchema', () => {
  it.each(CPF_VALIDOS)('persiste %s normalizado', (cpf) => {
    const r = cpfOptionalSchema.safeParse(cpf);
    expect(r.success).toBe(true);
    expect(r.success && r.data).toBe(cpf);
  });

  it('normaliza input mascarado', () => {
    const r = cpfOptionalSchema.safeParse('529.982.247-25');
    expect(r.success).toBe(true);
    expect(r.success && r.data).toBe('52998224725');
  });

  it('vazio/undefined vira null', () => {
    expect(cpfOptionalSchema.safeParse('').success && cpfOptionalSchema.parse('')).toBe(null);
    expect(cpfOptionalSchema.parse(undefined)).toBe(null);
    expect(cpfOptionalSchema.parse(null)).toBe(null);
    expect(cpfOptionalSchema.parse('   ')).toBe(null);
  });

  it.each(CPF_INVALIDOS)('rejeita %s com mensagem pt-BR', (cpf) => {
    const r = cpfOptionalSchema.safeParse(cpf);
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues[0].message).toContain('CPF');
  });

  it('rejeita quantidade errada de dígitos', () => {
    expect(cpfOptionalSchema.safeParse('123').success).toBe(false);
  });

  it('rejeita dígitos EXCEDENTES (não trunca para salvar o prefixo)', () => {
    // Regressão Devin Review: normalize* trunca em edição, mas persistência
    // deve rejeitar — '529982247259' não pode virar '52998224725'.
    expect(cpfOptionalSchema.safeParse('529982247259').success).toBe(false);
    expect(cepOptionalSchema.safeParse('013101009').success).toBe(false);
    expect(phoneBrOptionalSchema.safeParse('5511987654321').success).toBe(false);
  });
});

describe('cepOptionalSchema', () => {
  it('persiste CEP normalizado', () => {
    const r = cepOptionalSchema.safeParse('01310-100');
    expect(r.success).toBe(true);
    expect(r.success && r.data).toBe('01310100');
  });

  it('vazio vira null', () => {
    expect(cepOptionalSchema.parse('')).toBe(null);
    expect(cepOptionalSchema.parse(null)).toBe(null);
  });

  it('rejeita formato errado', () => {
    expect(cepOptionalSchema.safeParse('123').success).toBe(false);
    expect(cepOptionalSchema.safeParse('00000000').success).toBe(false);
  });
});

describe('phoneBrOptionalSchema', () => {
  it('persiste celular normalizado', () => {
    const r = phoneBrOptionalSchema.safeParse('(11) 98765-4321');
    expect(r.success).toBe(true);
    expect(r.success && r.data).toBe('11987654321');
  });

  it('vazio vira null', () => {
    expect(phoneBrOptionalSchema.parse('')).toBe(null);
    expect(phoneBrOptionalSchema.parse(undefined)).toBe(null);
  });

  it('rejeita telefone inválido', () => {
    expect(phoneBrOptionalSchema.safeParse('123').success).toBe(false);
    expect(phoneBrOptionalSchema.safeParse('0087654321').success).toBe(false);
  });
});

describe('assert* helpers', () => {
  it('assertPersistableCpf lança com mensagem pt-BR', () => {
    expect(() => assertPersistableCpf('123')).toThrow(/CPF/);
    expect(assertPersistableCpf('529.982.247-25')).toBe('52998224725');
    expect(assertPersistableCpf(null)).toBe(null);
  });

  it('assertPersistableCep lança com mensagem pt-BR', () => {
    expect(() => assertPersistableCep('123')).toThrow(/CEP/);
    expect(assertPersistableCep('01310-100')).toBe('01310100');
  });

  it('assertPersistablePhoneBr lança com mensagem pt-BR', () => {
    expect(() => assertPersistablePhoneBr('999')).toThrow(/Telefone/);
    expect(assertPersistablePhoneBr('(11) 98765-4321')).toBe('11987654321');
  });
});
