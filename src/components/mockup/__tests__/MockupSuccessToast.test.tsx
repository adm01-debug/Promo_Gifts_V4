/**
 * Contrato do toast de sucesso do mockup (MockupSuccessToast).
 *
 * Prova os critérios do cartão:
 *  - com `prefers-reduced-motion` não há animação (o toast fica estático);
 *  - não existe animação contínua (pulso/loop infinito);
 *  - a mensagem é anunciada por `aria-live` (role=status polido e atômico);
 *  - o toast some sozinho (dismiss automático com duração finita).
 *
 * O conteúdo do toast é renderizado diretamente (sem o Toaster do sonner) para
 * isolar a apresentação; o modo "some sozinho" é verificado no contrato de
 * `showMockupSuccessToast` com o módulo sonner mockado.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { MockupSuccessToast, showMockupSuccessToast } from '../MockupSuccessToast';

vi.mock('sonner', () => ({
  toast: {
    custom: vi.fn(() => 'mockup-success-id'),
    dismiss: vi.fn(),
  },
}));

const ORIGINAL_MATCH_MEDIA = window.matchMedia;

/** Força o resultado de `matchMedia('(prefers-reduced-motion: reduce)')`. */
function mockReducedMotion(reduce: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: reduce && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    }),
  });
}

function renderToast() {
  return render(
    <MockupSuccessToast
      mockupUrl="data:image/png;base64,AAAA"
      productName="Caneca personalizada"
      techniqueName="Serigrafia"
      onDownload={() => {}}
      onDismiss={() => {}}
    />,
  );
}

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: ORIGINAL_MATCH_MEDIA,
  });
});

describe('MockupSuccessToast — movimento e apresentação', () => {
  beforeEach(() => {
    mockReducedMotion(false);
  });

  it('com movimento normal aplica apenas a animação de entrada discreta', () => {
    renderToast();
    const root = screen.getByTestId('mockup-success-toast');
    expect(root.getAttribute('data-reduced-motion')).toBe('false');
    expect(root.className).toContain('animate-in');
    expect(root.className).toContain('slide-in-from-top-2');
    // Rede de segurança CSS caso o JS não rode antes do primeiro paint.
    expect(root.className).toContain('motion-reduce:animate-none');
  });

  it('com prefers-reduced-motion não aplica nenhuma animação', () => {
    mockReducedMotion(true);
    renderToast();
    const root = screen.getByTestId('mockup-success-toast');
    expect(root.getAttribute('data-reduced-motion')).toBe('true');
    expect(root.className).not.toContain('animate-in');
    expect(root.className).not.toContain('slide-in-from-top-2');
  });

  it('não usa animação contínua (sem pulso/loop infinito)', () => {
    renderToast();
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/animate-(pulse|spin|bounce|ping)/);
    expect(html).not.toMatch(/\binfinite\b/);
  });

  it('anuncia a mensagem por aria-live (role=status, polite e atômico)', () => {
    renderToast();
    const message = screen.getByTestId('mockup-success-message');
    expect(message.getAttribute('role')).toBe('status');
    expect(message.getAttribute('aria-live')).toBe('polite');
    expect(message.getAttribute('aria-atomic')).toBe('true');
    expect(message.textContent).toContain('Mockup gerado com sucesso!');
    expect(message.textContent).toContain('Caneca personalizada');
    expect(message.textContent).toContain('Serigrafia');
  });
});

describe('showMockupSuccessToast — dismiss automático', () => {
  it('agenda o toast custom com duração finita (some sozinho)', () => {
    vi.mocked(toast.custom).mockClear();
    showMockupSuccessToast({ mockupUrl: 'https://cdn/exemplo.png', onDownload: () => {} });

    expect(toast.custom).toHaveBeenCalledTimes(1);
    const options = vi.mocked(toast.custom).mock.calls[0][1];
    expect(typeof options?.duration).toBe('number');
    expect(Number.isFinite(options?.duration)).toBe(true);
    expect(options?.duration).toBeGreaterThan(0);
  });
});
