import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GeneratingOverlay } from '../GeneratingOverlay';

describe('GeneratingOverlay', () => {
  it('não renderiza quando não está gerando (fim ou falha)', () => {
    const { rerender } = render(<GeneratingOverlay isVisible />);
    expect(screen.getByTestId('generating-overlay')).toBeInTheDocument();
    rerender(<GeneratingOverlay isVisible={false} />);
    expect(screen.queryByTestId('generating-overlay')).toBeNull();
  });

  it('mostra estado indeterminado, sem percentual inventado', () => {
    render(<GeneratingOverlay isVisible />);
    const bar = screen.getByRole('progressbar');
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(screen.getByTestId('generating-overlay').textContent).not.toMatch(/\d+\s*%/);
  });

  it('não menciona IA nem etapas fictícias', () => {
    render(<GeneratingOverlay isVisible productName="Caneta" techniqueName="Laser" />);
    const text = screen.getByTestId('generating-overlay').textContent ?? '';
    expect(text).not.toMatch(
      /\bIA\b|intelig|Analisando|Aplicando técnica|Posicionando|Finalizando/i,
    );
    expect(text).toContain('Caneta com Laser');
  });

  it('não avança por cronômetro: texto idêntico após o tempo passar', async () => {
    const { container } = render(<GeneratingOverlay isVisible />);
    const before = container.textContent;
    await new Promise((r) => {
      setTimeout(r, 300);
    });
    expect(container.textContent).toBe(before);
  });

  it('animações só com motion-safe (respeita prefers-reduced-motion)', () => {
    render(<GeneratingOverlay isVisible />);
    const root = screen.getByTestId('generating-overlay');
    const all = [root, ...Array.from(root.querySelectorAll('*'))];
    for (const el of all) {
      const classes = (el.getAttribute('class') ?? '').split(/\s+/);
      for (const c of classes) {
        if (/(^|:)animate-/.test(c)) expect(c.startsWith('motion-safe:')).toBe(true);
      }
    }
  });
});
