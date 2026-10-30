/**
 * MockupResultCard — celebração (confete) alinhada ao Blue Premium.
 *
 * Prova do cartão A-14:
 *  1. as cores do confete são derivadas dos tokens do tema (nenhum hex);
 *  2. com `prefers-reduced-motion` o confete NÃO dispara;
 *  3. a celebração é discreta (poucas partículas, abertura curta).
 *
 * Execução: npx vitest run src/components/mockup/__tests__/MockupResultCard.confetti.test.tsx
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const confettiMock = vi.hoisted(() => vi.fn());
vi.mock('canvas-confetti', () => ({ default: confettiMock }));

import { MockupResultCard, getConfettiTokenColors } from '../MockupResultCard';

/** Valores dos tokens do tema (Blue Premium) — iguais aos de src/index.css. */
const TOKENS: Record<string, string> = {
  '--brand-primary': '217 91% 60%',
  '--brand-primary-glow': '217 91% 74%',
  '--success': '142 90% 48%',
};

const EXPECTED_COLORS = ['hsl(217 91% 60%)', 'hsl(217 91% 74%)', 'hsl(142 90% 48%)'];

const LEGACY_HEX = ['#7c3aed', '#a855f7', '#f97316', '#22c55e'];

function applyTokens() {
  for (const [name, value] of Object.entries(TOKENS)) {
    document.documentElement.style.setProperty(name, value);
  }
}

function clearTokens() {
  for (const name of Object.keys(TOKENS)) {
    document.documentElement.style.removeProperty(name);
  }
}

function renderResult() {
  return render(
    <MockupResultCard
      generatedMockup="https://example.com/mockup.png"
      isLoading={false}
      onDownload={vi.fn()}
    />,
  );
}

function lastConfettiOptions() {
  expect(confettiMock).toHaveBeenCalled();
  return confettiMock.mock.calls[0][0] as { colors?: string[]; particleCount?: number; spread?: number };
}

describe('MockupResultCard — confete sem cores fora do Blue Premium', () => {
  beforeEach(() => {
    confettiMock.mockClear();
    applyTokens();
  });

  afterEach(() => {
    clearTokens();
  });

  it('deriva as cores dos tokens do tema (nenhuma cor literal)', () => {
    expect(getConfettiTokenColors()).toEqual(EXPECTED_COLORS);
  });

  it('dispara o confete só com cores hsl vindas dos tokens', () => {
    renderResult();

    const { colors } = lastConfettiOptions();

    expect(colors).toEqual(EXPECTED_COLORS);
    expect(colors?.every((color) => color.startsWith('hsl('))).toBe(true);
    expect(colors?.some((color) => color.includes('#'))).toBe(false);
  });

  it('não usa as cores legadas (roxo/laranja) do confete antigo', () => {
    renderResult();

    const serialized = JSON.stringify(lastConfettiOptions().colors ?? []);
    for (const hex of LEGACY_HEX) {
      expect(serialized).not.toContain(hex);
    }
  });

  it('mantém a celebração discreta (poucas partículas, abertura curta)', () => {
    renderResult();

    const { particleCount, spread } = lastConfettiOptions();

    expect(particleCount).toBeLessThanOrEqual(30);
    expect(spread).toBeLessThanOrEqual(50);
  });

  it('não tem literal de cor hex no componente (fora do bloco de tokens)', () => {
    const src = readFileSync(resolve(__dirname, '..', 'MockupResultCard.tsx'), 'utf-8');
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe('MockupResultCard — confete respeita prefers-reduced-motion', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    confettiMock.mockClear();
    applyTokens();
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    clearTokens();
    window.matchMedia = originalMatchMedia;
  });

  it('não dispara o confete quando o SO pede movimento reduzido', () => {
    renderResult();

    expect(confettiMock).not.toHaveBeenCalled();
  });

  it('o sucesso continua indicado sem animação (estado, não movimento)', () => {
    renderResult();

    expect(screen.getByText('Mockup Criado!')).toBeInTheDocument();
  });
});
