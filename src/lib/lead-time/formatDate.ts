/**
 * Formatação de dia civil `AAAA-MM-DD` para a tela. Só texto: sem `Date`, então
 * o fuso da máquina não muda o dia mostrado.
 */
import type { IsoDate } from './types';

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `2026-11-20` vira `20/11/2026`; texto fora do formato volta como veio. */
export function formatIsoDate(day: IsoDate): string {
  const match = ISO_DAY.exec(day);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : day;
}

/** `2026-11-20` vira `20/11`; texto fora do formato volta como veio. */
export function formatIsoDayMonth(day: IsoDate): string {
  const match = ISO_DAY.exec(day);
  return match ? `${match[3]}/${match[2]}` : day;
}

const WEEKDAYS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

/** Dia da semana em português; `null` para data inválida. Calculado em UTC (sem fuso). */
export function weekdayNamePt(day: IsoDate): string | null {
  const match = ISO_DAY.exec(day);
  if (!match) return null;
  const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const utc = new Date(Date.UTC(year, month - 1, date));
  if (utc.getUTCMonth() !== month - 1) return null;
  return WEEKDAYS[utc.getUTCDay()] ?? null;
}

/** Dia civil de hoje em America/Sao_Paulo (`en-CA` formata como AAAA-MM-DD). */
export function todayInSaoPaulo(now: Date = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
