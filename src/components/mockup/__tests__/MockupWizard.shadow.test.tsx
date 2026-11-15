/**
 * Contrato de aparência da linha de progresso do <MockupWizard />.
 *
 * A-15: o indicador de progresso usava `shadow-[0_0_8px_rgba(var(--primary),0.4)]`.
 * Os tokens do projeto são triplas HSL (`--primary: 217 91% 60%`), então
 * `rgba(var(--primary),0.4)` é inválido em CSS e a sombra simplesmente não
 * aparece. O padrão da casa é `hsl(var(--primary)/0.4)` (mesma forma usada em
 * WizardSteps.tsx, timeline.tsx, ReplenishmentToolbar.tsx).
 *
 * Estes testes renderizam o componente REAL — não replicam classes em um
 * harness — para que a prova dependa do código de produção.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MockupWizard } from '../MockupWizard';

const BASE_PROPS = {
  currentStep: 2,
  hasClient: true,
  hasProduct: false,
  hasTechnique: false,
  hasLogo: false,
  hasPositioned: false,
  hasGenerated: false,
};

const SHADOW_ESPERADA = 'shadow-[0_0_8px_hsl(var(--primary)/0.4)]';

describe('MockupWizard — sombra do indicador de progresso (A-15)', () => {
  it('nenhuma classe renderizada usa rgba(var(--...)) — token HSL não vira rgba', () => {
    const { container } = render(<MockupWizard {...BASE_PROPS} />);

    const classesInvalidas = Array.from(container.querySelectorAll<HTMLElement>('[class]'))
      .map((el) => el.getAttribute('class') ?? '')
      .filter((cls) => cls.includes('rgba(var(--'));

    expect(classesInvalidas).toEqual([]);
  });

  it('a barra de progresso preenchida usa shadow hsl(var(--primary)/0.4)', () => {
    const { container } = render(<MockupWizard {...BASE_PROPS} />);

    const barraPreenchida = Array.from(container.querySelectorAll<HTMLElement>('[class]')).find(
      (el) => el.className.includes('bg-gradient-to-r') && el.className.includes('shadow-'),
    );

    expect(barraPreenchida).toBeDefined();
    expect(barraPreenchida?.className).toContain(SHADOW_ESPERADA);
  });
});
