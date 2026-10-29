/**
 * MockupBeforeAfter — acessibilidade do comparador antes/depois.
 *
 * Prova que o divisor é operável por teclado e exposto como role="slider"
 * (WCAG 2.1.1, 4.1.2 e 2.4.7), sem perder o arrasto por ponteiro.
 * Sem a correção (antes o contêiner não tinha role, tabIndex nem onKeyDown)
 * os casos 1 a 6 falham; o caso 7 protege o comportamento de mouse.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MockupBeforeAfter } from '../MockupBeforeAfter';

const BEFORE_IMAGE = 'https://example.com/antes.png';
const AFTER_IMAGE = 'https://example.com/depois.png';
const LABEL = 'Comparação antes e depois';

/** jsdom não calcula layout: fixa a caixa do comparador em 200px para o arrasto. */
function renderComparator() {
  const utils = render(<MockupBeforeAfter beforeImage={BEFORE_IMAGE} afterImage={AFTER_IMAGE} />);
  const slider = utils.getByRole('slider', { name: LABEL });
  Object.defineProperty(slider, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      right: 200,
      bottom: 200,
      width: 200,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
  return { ...utils, slider };
}

beforeEach(() => {
  // jsdom não implementa captura de ponteiro (o arrasto usa setPointerCapture).
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => undefined;
  }
});

describe('MockupBeforeAfter — teclado e leitor de tela', () => {
  it('expõe o divisor como slider com nome acessível e valores mínimo/máximo/atual', () => {
    const { slider } = renderComparator();

    expect(slider).toHaveAttribute('aria-valuemin', '2');
    expect(slider).toHaveAttribute('aria-valuemax', '98');
    expect(slider).toHaveAttribute('aria-valuenow', '50');
    expect(slider).toHaveAttribute('aria-valuetext', '50% de posicionamento');
  });

  it('setas movem o divisor um ponto e atualizam aria-valuenow e aria-valuetext', () => {
    const { slider } = renderComparator();

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '51');
    expect(slider).toHaveAttribute('aria-valuetext', '51% de posicionamento');

    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(slider).toHaveAttribute('aria-valuenow', '52');

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider).toHaveAttribute('aria-valuenow', '51');

    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });

  it('Home vai ao mínimo e End ao máximo', () => {
    const { slider } = renderComparator();

    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider).toHaveAttribute('aria-valuenow', '98');

    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider).toHaveAttribute('aria-valuenow', '2');
  });

  it('não passa dos limites ao insistir na seta depois de Home/End', () => {
    const { slider } = renderComparator();

    fireEvent.keyDown(slider, { key: 'End' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '98');

    fireEvent.keyDown(slider, { key: 'Home' });
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider).toHaveAttribute('aria-valuenow', '2');
  });

  it('consome as teclas que trata (preventDefault) e ignora as demais', () => {
    const { slider } = renderComparator();

    // fireEvent retorna false quando o handler chama preventDefault.
    expect(fireEvent.keyDown(slider, { key: 'ArrowRight' })).toBe(false);
    expect(slider).toHaveAttribute('aria-valuenow', '51');

    expect(fireEvent.keyDown(slider, { key: 'Tab' })).toBe(true);
    expect(slider).toHaveAttribute('aria-valuenow', '51');
  });

  it('é alcançável pelo teclado e mostra foco visível', () => {
    const { slider } = renderComparator();

    slider.focus();
    expect(document.activeElement).toBe(slider);
    expect(slider.className).toContain('focus-visible:ring-2');
  });

  it('mantém o arrasto por ponteiro movendo o divisor (sem regressão de mouse)', () => {
    const { slider } = renderComparator();

    fireEvent.pointerDown(slider, { clientX: 100, pointerId: 1 });
    expect(slider).toHaveAttribute('aria-valuenow', '50');

    fireEvent.pointerMove(slider, { clientX: 150, pointerId: 1 });
    expect(slider).toHaveAttribute('aria-valuenow', '75');

    fireEvent.pointerUp(slider, { pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 20, pointerId: 1 });
    expect(slider).toHaveAttribute('aria-valuenow', '75');
  });
});
