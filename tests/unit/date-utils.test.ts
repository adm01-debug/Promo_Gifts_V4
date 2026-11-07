/**
 * Unit tests for src/lib/date-utils.ts
 *
 * formatDate, formatDateTime, formatTime, formatDateRelative,
 * formatDateRelativeFull, formatDateCompact, formatDateLong,
 * formatWeekday, formatMonthYear, isToday, isYesterday, isTomorrow,
 * formatDateSmart
 */
import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatDateRelative,
  formatDateRelativeFull,
  formatDateCompact,
  formatDateLong,
  formatWeekday,
  formatMonthYear,
  isToday,
  isYesterday,
  isTomorrow,
  formatDateSmart,
} from '@/lib/date-utils';

// Fixed reference: 2025-12-25 14:30 (Christmas Day, São Paulo local time)
// Dec 25, 2025 = Thursday (quinta-feira)
const XMAS = new Date('2025-12-25T14:30:00');
const XMAS_ISO = '2025-12-25T17:30:00.000Z'; // same instant in UTC (BRT = UTC-3)
const XMAS_TS = XMAS.getTime();

// Fixed base for relative tests (noon on Christmas)
const BASE = new Date('2025-12-25T12:00:00');

// ============================================
// formatDate
// ============================================

describe('formatDate', () => {
  it('formats Date object with default pattern dd/MM/yyyy', () => {
    expect(formatDate(XMAS)).toBe('25/12/2025');
  });

  it('formats ISO string with default pattern', () => {
    // 2025-06-15T03:00:00Z = 2025-06-15T00:00:00 BRT
    expect(formatDate('2025-06-15T03:00:00.000Z')).toBe('15/06/2025');
  });

  it('formats numeric timestamp with default pattern', () => {
    // 2025-01-01T03:00:00Z = 2025-01-01T00:00:00 BRT
    const ts = new Date('2025-01-01T03:00:00.000Z').getTime();
    expect(formatDate(ts)).toBe('01/01/2025');
  });

  it('respects custom pattern', () => {
    expect(formatDate(XMAS, 'yyyy/MM/dd')).toBe('2025/12/25');
  });

  it('custom pattern HH:mm extracts time from Date', () => {
    expect(formatDate(XMAS, 'HH:mm')).toBe('14:30');
  });

  it('returns single-digit days zero-padded', () => {
    expect(formatDate(new Date('2025-06-01T03:00:00.000Z'))).toBe('01/06/2025');
  });
});

// ============================================
// formatDateTime
// ============================================

describe('formatDateTime', () => {
  it('returns dd/MM/yyyy HH:mm for Date object', () => {
    expect(formatDateTime(XMAS)).toBe('25/12/2025 14:30');
  });

  it('returns dd/MM/yyyy HH:mm for ISO string', () => {
    // Build ISO string from local time — timezone-independent
    const d = new Date(2025, 5, 15, 12, 45, 0);
    expect(formatDateTime(d.toISOString())).toBe('15/06/2025 12:45');
  });

  it('returns dd/MM/yyyy HH:mm for timestamp', () => {
    expect(formatDateTime(XMAS_TS)).toBe('25/12/2025 14:30');
  });
});

// ============================================
// formatTime
// ============================================

describe('formatTime', () => {
  it('returns HH:mm for Date object', () => {
    expect(formatTime(XMAS)).toBe('14:30');
  });

  it('returns HH:mm for ISO string', () => {
    // Build ISO string from local time — timezone-independent
    const d = new Date(2025, 2, 10, 10, 5, 0);
    expect(formatTime(d.toISOString())).toBe('10:05');
  });

  it('returns HH:mm for timestamp', () => {
    expect(formatTime(XMAS_TS)).toBe('14:30');
  });

  it('zero-pads hours and minutes', () => {
    // Build ISO string from local time — timezone-independent
    const d = new Date(2025, 0, 1, 2, 5, 0);
    expect(formatTime(d.toISOString())).toBe('02:05');
  });
});

// ============================================
// formatDateRelative
// ============================================
