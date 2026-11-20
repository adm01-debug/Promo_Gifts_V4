import { describe, expect, it } from 'vitest';
import { addBusinessDays, businessDaysBetween } from '../businessDays';

// Calendário usado nas contas (2026): 13/11 sexta; 14 sáb; 15 dom; 16 seg; 19 qui; 20 sex (feriado nacional);
// 23 seg; 31/12 qui; 2027-01-01 sex (feriado); 04/01/2027 seg.
const NO_HOLIDAYS: string[] = [];
const FERIADO_20 = ['2026-11-20'];

function addOk(start: string, days: number, holidays: string[]): string | null {
  const result = addBusinessDays(start, days, holidays);
  return result.ok ? result.value : null;
}

function betweenOk(start: string, end: string, holidays: string[]): number | null {
  const result = businessDaysBetween(start, end, holidays);
  return result.ok ? result.value : null;
}

describe('addBusinessDays', () => {
  it.each([
    // sexta 13/11 + 1 dia útil: sáb e dom não contam -> segunda 16/11
    ['sexta + 1 = segunda', '2026-11-13', 1, NO_HOLIDAYS, '2026-11-16'],
    // quinta 19/11 + 1 com feriado sexta 20/11: sex feriado, sáb 21, dom 22 pulam -> segunda 23/11
    [
      'véspera de feriado pula o feriado e o fim de semana',
      '2026-11-19',
      1,
      FERIADO_20,
      '2026-11-23',
    ],
    // 0 dias = mesmo dia, mesmo sendo sábado 14/11
    ['0 dias devolve o mesmo dia (sábado)', '2026-11-14', 0, NO_HOLIDAYS, '2026-11-14'],
    // sexta 13/11 + 5: seg16(1) ter17(2) qua18(3) qui19(4) sex20(5) -> 20/11 sem feriado
    ['5 dias úteis sem feriado', '2026-11-13', 5, NO_HOLIDAYS, '2026-11-20'],
    // sexta 13/11 + 5 com feriado 20/11: seg16(1) ter17(2) qua18(3) qui19(4) [sex20 feriado] seg23(5)
    ['5 dias úteis com feriado na sexta', '2026-11-13', 5, FERIADO_20, '2026-11-23'],
    // sábado 14/11 + 1: partida em fim de semana, 1º dia útil = segunda 16/11
    ['partida no sábado + 1', '2026-11-14', 1, NO_HOLIDAYS, '2026-11-16'],
    // quinta 31/12/2026 + 1 com feriado 01/01/2027 (sex): sex feriado, sáb 2, dom 3 -> seg 04/01/2027
    ['virada de ano com feriado', '2026-12-31', 1, ['2027-01-01'], '2027-01-04'],
    // segunda 16/11 - 1 dia útil: dom e sáb pulam -> sexta 13/11
    ['negativo volta para o dia útil anterior', '2026-11-16', -1, NO_HOLIDAYS, '2026-11-13'],
    // segunda 23/11 - 1 com feriado sexta 20/11: dom 22, sáb 21, sex 20 (feriado) pulam -> quinta 19/11
    ['negativo pula feriado', '2026-11-23', -1, FERIADO_20, '2026-11-19'],
    // feriado em fim de semana (sábado 14/11) não muda nada: sex 13 + 1 = seg 16
    ['feriado em sábado é irrelevante', '2026-11-13', 1, ['2026-11-14'], '2026-11-16'],
  ])('%s', (_nome, start, days, holidays, esperado) => {
    expect(addOk(start, days, holidays)).toBe(esperado);
  });

  it.each([
    ['data fora do formato', '2026-2-3', 1, NO_HOLIDAYS, /Data inválida/],
    ['data inexistente (30/02)', '2026-02-30', 1, NO_HOLIDAYS, /Data inválida/],
    ['dias fracionados', '2026-11-13', 1.5, NO_HOLIDAYS, /número inteiro/],
    ['dias NaN', '2026-11-13', Number.NaN, NO_HOLIDAYS, /número inteiro/],
    ['feriado inválido', '2026-11-13', 1, ['20/11/2026'], /Feriado com data inválida/],
  ])('devolve erro (sem lançar) para %s', (_nome, start, days, holidays, mensagem) => {
    const result = addBusinessDays(start, days, holidays);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issue.code).toBe('invalid_input');
      expect(result.issue.message).toMatch(mensagem);
    }
  });
});

describe('businessDaysBetween', () => {
  it.each([
    // (13/11, 20/11]: seg16 ter17 qua18 qui19 sex20 = 5
    ['semana inteira', '2026-11-13', '2026-11-20', NO_HOLIDAYS, 5],
    // com feriado 20/11: seg16 ter17 qua18 qui19 = 4
    ['feriado no fim do intervalo', '2026-11-13', '2026-11-20', FERIADO_20, 4],
    // (13/11, 23/11] com feriado 20/11: 16 17 18 19 23 = 5
    ['atravessa feriado e fim de semana', '2026-11-13', '2026-11-23', FERIADO_20, 5],
    // mesma data = 0
    ['mesma data', '2026-11-13', '2026-11-13', NO_HOLIDAYS, 0],
    // (sáb 14, seg 16]: só seg16 = 1
    ['partida em fim de semana', '2026-11-14', '2026-11-16', NO_HOLIDAYS, 1],
    // (sáb 14, dom 15]: nenhum dia útil = 0
    ['só fim de semana', '2026-11-14', '2026-11-15', NO_HOLIDAYS, 0],
    // fim anterior ao início: -(contagem de (13/11, 16/11]) = -(seg16) = -1
    ['intervalo invertido é negativo', '2026-11-16', '2026-11-13', NO_HOLIDAYS, -1],
    // (13/11, 20/11] invertido, 5 dias úteis -> -5 (simetria)
    ['simetria com a semana inteira', '2026-11-20', '2026-11-13', NO_HOLIDAYS, -5],
  ])('%s', (_nome, start, end, holidays, esperado) => {
    expect(betweenOk(start, end, holidays)).toBe(esperado);
  });

  it.each([
    ['início inválido', '2026-13-01', '2026-11-20', NO_HOLIDAYS, /Data inválida/],
    ['fim inválido', '2026-11-13', 'amanhã', NO_HOLIDAYS, /Data inválida/],
    ['feriado inválido', '2026-11-13', '2026-11-20', ['x'], /Feriado com data inválida/],
  ])('devolve erro (sem lançar) para %s', (_nome, start, end, holidays, mensagem) => {
    const result = businessDaysBetween(start, end, holidays);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issue.message).toMatch(mensagem);
  });
});

/** Gerador pseudoaleatório com semente fixa (mulberry32): a sequência é sempre a mesma. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dia da semana por contagem em UTC, independente de date-fns e do fuso da máquina. */
function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

function isoFromOffset(baseUtcMs: number, offsetDays: number): string {
  return new Date(baseUtcMs + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

describe('addBusinessDays (fuzz com semente fixa)', () => {
  const random = mulberry32(20261120);
  const base = Date.UTC(2026, 0, 1);
  const cases = Array.from({ length: 300 }, () => {
    const start = isoFromOffset(base, Math.floor(random() * 730));
    const holidays = Array.from({ length: 12 }, () =>
      isoFromOffset(base, Math.floor(random() * 800)),
    );
    const days = 1 + Math.floor(random() * 40);
    return { start, holidays, days };
  });

  const asDate = (value: string | null): string => value ?? 'ERRO';

  it.each(cases)('resultado é dia útil: $start +$days', ({ start, holidays, days }) => {
    const result = asDate(addOk(start, days, holidays));
    expect([0, 6]).not.toContain(weekdayOf(result));
    expect(holidays).not.toContain(result);
    expect(result > start).toBe(true);
  });

  it.each(cases)('monotonia: $start +$days <= +($days+1)', ({ start, holidays, days }) => {
    const smaller = asDate(addOk(start, days, holidays));
    const larger = asDate(addOk(start, days + 1, holidays));
    expect(larger > smaller).toBe(true);
  });

  it.each(cases)(
    'ida e volta: add(d, between(d, e)) == e para e útil ($start +$days)',
    ({ start, holidays, days }) => {
      const end = asDate(addOk(start, days, holidays));
      const between = betweenOk(start, end, holidays);
      expect(between).toBe(days);
      expect(addOk(start, between ?? Number.NaN, holidays)).toBe(end);
    },
  );
});

describe('teto de 3650 dias úteis e limites de data', () => {
  // sexta 13/11/2026 + 3650 úteis = 730 semanas x 5 úteis; 730 x 7 = 5110 dias corridos -> sexta 09/11/2040
  it('3650 dias úteis ainda calcula: sexta 13/11/2026 + 3650 = sexta 09/11/2040', () => {
    expect(addOk('2026-11-13', 3650, NO_HOLIDAYS)).toBe('2040-11-09');
    expect(addOk('2040-11-09', -3650, NO_HOLIDAYS)).toBe('2026-11-13');
  });

  it.each([3651, -3651, 3_000_000])('%i dias úteis passa do teto e vira invalid_input', (days) => {
    const result = addBusinessDays('2026-11-13', days, NO_HOLIDAYS);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issue.code).toBe('invalid_input');
  });

  it('businessDaysBetween: 3650 úteis passa; 3651 (segunda 12/11/2040) vira invalid_input', () => {
    expect(betweenOk('2026-11-13', '2040-11-09', NO_HOLIDAYS)).toBe(3650);
    expect(betweenOk('2026-11-13', '2040-11-12', NO_HOLIDAYS)).toBeNull();
    expect(betweenOk('2040-11-12', '2026-11-13', NO_HOLIDAYS)).toBeNull();
    expect(betweenOk('2026-11-13', '9999-12-31', NO_HOLIDAYS)).toBeNull();
  });

  it('resultado que sai do ano de 4 dígitos é invalid_input: 31/12/9999 (sexta) + 1 útil', () => {
    expect(addOk('9999-12-31', 1, NO_HOLIDAYS)).toBeNull();
    expect(addBusinessDays('9999-12-31', 1, NO_HOLIDAYS).ok).toBe(false);
  });

  it('feriados nulos ou indefinidos são invalid_input, não exceção', () => {
    // @ts-expect-error entrada fora do tipo, de propósito
    const withNull = addBusinessDays('2026-11-13', 1, null);
    // @ts-expect-error entrada fora do tipo, de propósito
    const withUndefined = businessDaysBetween('2026-11-13', '2026-11-16', undefined);
    expect(withNull.ok).toBe(false);
    expect(withUndefined.ok).toBe(false);
    expect(!withNull.ok && withNull.issue.code).toBe('invalid_input');
    expect(!withUndefined.ok && withUndefined.issue.code).toBe('invalid_input');
  });
});
