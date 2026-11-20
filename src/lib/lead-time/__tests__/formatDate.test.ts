import { describe, expect, it } from 'vitest';
import { formatIsoDate, formatIsoDayMonth, todayInSaoPaulo, weekdayNamePt } from '../formatDate';

describe('formatIsoDate / formatIsoDayMonth', () => {
  it('inverte a ordem dos campos', () => {
    expect(formatIsoDate('2026-11-20')).toBe('20/11/2026');
    expect(formatIsoDayMonth('2026-11-20')).toBe('20/11');
  });

  it.each(['', '20/11/2026', '2026-1-2'])('devolve "%s" como veio', (texto) => {
    expect(formatIsoDate(texto)).toBe(texto);
    expect(formatIsoDayMonth(texto)).toBe(texto);
  });
});

describe('weekdayNamePt', () => {
  it.each([
    // 20/11/2026 é sexta-feira (Consciência Negra, citado na migration)
    ['2026-11-20', 'sexta-feira'],
    // 25/12/2026 também é sexta-feira (20/11 + 35 dias = 5 semanas)
    ['2026-12-25', 'sexta-feira'],
    // 01/01/2027 é sexta-feira (25/12 + 7 dias)
    ['2027-01-01', 'sexta-feira'],
    // 02/01/2027 = sábado
    ['2027-01-02', 'sábado'],
    // 03/01/2027 = domingo
    ['2027-01-03', 'domingo'],
  ])('%s é %s', (dia, esperado) => {
    expect(weekdayNamePt(dia)).toBe(esperado);
  });

  it.each(['2026-02-30', 'abc', ''])('%s é inválida', (dia) => {
    expect(weekdayNamePt(dia)).toBeNull();
  });
});

describe('todayInSaoPaulo', () => {
  it.each([
    // 21/11 02:30 UTC = 20/11 23:30 em Brasília (UTC-3): ainda é dia 20
    ['2026-11-21T02:30:00Z', '2026-11-20'],
    // 21/11 03:00 UTC = 21/11 00:00 em Brasília: virou o dia
    ['2026-11-21T03:00:00Z', '2026-11-21'],
    // 20/11 15:00 UTC = 20/11 12:00 em Brasília
    ['2026-11-20T15:00:00Z', '2026-11-20'],
  ])('%s em Brasília é %s', (instante, esperado) => {
    expect(todayInSaoPaulo(new Date(instante))).toBe(esperado);
  });
});
