import { addDays, differenceInCalendarDays, format, getDay } from 'date-fns';
import type { IsoDate, LeadTimeIssue, LeadTimeResult } from './types';

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const NOON = 12;
/** Teto técnico (dias úteis): acima disso o pedido é erro de digitação, não prazo. */
const MAX_BUSINESS_DAYS = 3650;

/**
 * Data civil como `Date` ao meio-dia local. Só os campos locais (ano, mês, dia)
 * são usados, então o resultado não depende do fuso da máquina; o meio-dia
 * evita a meia-noite inexistente de horários de verão.
 */
function toCivilDate(value: IsoDate): Date | null {
  const match = ISO_PATTERN.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day, NOON);
  const valid =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return valid ? date : null;
}

function fromCivilDate(date: Date): IsoDate {
  return format(date, 'yyyy-MM-dd');
}

function invalid(message: string): { ok: false; issue: LeadTimeIssue } {
  return { ok: false, issue: { code: 'invalid_input', message, productId: null } };
}

function isWeekend(date: Date): boolean {
  const weekday = getDay(date);
  return weekday === 0 || weekday === 6;
}

function buildHolidaySet(holidays: readonly IsoDate[]): LeadTimeResult<Set<IsoDate>> {
  if (!Array.isArray(holidays))
    return invalid('A lista de feriados é obrigatória (use lista vazia quando não há feriados).');
  const set = new Set<IsoDate>();
  for (const holiday of holidays) {
    if (toCivilDate(holiday) === null) {
      return invalid(`Feriado com data inválida: "${holiday}". Use o formato AAAA-MM-DD.`);
    }
    set.add(holiday);
  }
  return { ok: true, value: set };
}

function isBusinessDay(date: Date, holidays: ReadonlySet<IsoDate>): boolean {
  return !isWeekend(date) && !holidays.has(fromCivilDate(date));
}

/**
 * Soma `days` dias úteis (sáb, dom e feriados não contam) a `start`.
 * `days = 0` devolve o mesmo dia, mesmo que seja fim de semana. Negativo anda
 * para trás. Para `days > 0` o resultado é sempre dia útil.
 */
export function addBusinessDays(
  start: IsoDate,
  days: number,
  holidays: readonly IsoDate[],
): LeadTimeResult<IsoDate> {
  const startDate = toCivilDate(start);
  if (startDate === null) return invalid(`Data inválida: "${start}". Use o formato AAAA-MM-DD.`);
  if (!Number.isInteger(days))
    return invalid('A quantidade de dias úteis precisa ser um número inteiro.');
  if (Math.abs(days) > MAX_BUSINESS_DAYS) {
    return invalid(
      `A quantidade de dias úteis passa do limite de ${MAX_BUSINESS_DAYS}: confira o prazo cadastrado.`,
    );
  }
  const holidaySet = buildHolidaySet(holidays);
  if (!holidaySet.ok) return holidaySet;

  const step = days < 0 ? -1 : 1;
  let current = startDate;
  let remaining = Math.abs(days);
  while (remaining > 0) {
    current = addDays(current, step);
    if (isBusinessDay(current, holidaySet.value)) remaining -= 1;
  }
  const result = fromCivilDate(current);
  if (!ISO_PATTERN.test(result))
    return invalid(
      `O resultado "${result}" sai do intervalo de datas suportado (ano de 4 dígitos).`,
    );
  return { ok: true, value: result };
}

/**
 * Dias úteis no intervalo (start, end]: o dia de partida não conta, o de
 * chegada conta se for útil. Negativo quando `end` é anterior a `start`.
 * Vale `addBusinessDays(d, businessDaysBetween(d, e)) == e` para `e` dia útil
 * (com `e >= d`, ou com `d` e `e` ambos úteis).
 */
export function businessDaysBetween(
  start: IsoDate,
  end: IsoDate,
  holidays: readonly IsoDate[],
): LeadTimeResult<number> {
  const startDate = toCivilDate(start);
  if (startDate === null) return invalid(`Data inválida: "${start}". Use o formato AAAA-MM-DD.`);
  const endDate = toCivilDate(end);
  if (endDate === null) return invalid(`Data inválida: "${end}". Use o formato AAAA-MM-DD.`);
  const holidaySet = buildHolidaySet(holidays);
  if (!holidaySet.ok) return holidaySet;

  const sign = endDate < startDate ? -1 : 1;
  const [from, to] = sign === 1 ? [startDate, endDate] : [endDate, startDate];
  const span = differenceInCalendarDays(to, from);
  let count = 0;
  for (let offset = 1; offset <= span; offset += 1) {
    if (isBusinessDay(addDays(from, offset), holidaySet.value)) count += 1;
    if (count > MAX_BUSINESS_DAYS) {
      return invalid(
        `O intervalo passa do limite de ${MAX_BUSINESS_DAYS} dias úteis: confira o intervalo.`,
      );
    }
  }
  return { ok: true, value: sign * count };
}
