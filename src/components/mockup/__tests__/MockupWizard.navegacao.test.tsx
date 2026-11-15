/**
 * O "Voltar" move a etapa EM FOCO, não o progresso. Antes de `reachableStep`,
 * `currentStep` servia às duas coisas: voltar uma etapa derrubava o atalho da
 * etapa pendente que estava disponível, e o vendedor perdia o caminho de volta.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { MockupWizard } from '../MockupWizard';

const PREENCHIDO_ATE_LOGO = {
  hasClient: true,
  hasProduct: true,
  hasTechnique: true,
  hasLogo: true,
  hasPositioned: false,
  hasGenerated: false,
};

describe('MockupWizard — etapa em foco x etapa alcançável', () => {
  it('depois de voltar, a etapa pendente que estava disponível segue clicável', () => {
    const onStepClick = vi.fn();
    render(
      <MockupWizard
        currentStep={4}
        reachableStep={5}
        {...PREENCHIDO_ATE_LOGO}
        onStepClick={onStepClick}
      />,
    );

    expect(screen.getByLabelText('Ir para etapa 5: Posição')).toBeTruthy();
  });

  it('sem reachableStep, o limite continua sendo a etapa em foco', () => {
    const onStepClick = vi.fn();
    render(<MockupWizard currentStep={4} {...PREENCHIDO_ATE_LOGO} onStepClick={onStepClick} />);

    expect(screen.queryByLabelText('Ir para etapa 5: Posição')).toBeNull();
    expect(screen.getByLabelText('Ir para etapa 4: Logo')).toBeTruthy();
  });

  it('o Voltar aponta para a etapa anterior à que está em foco', () => {
    const onStepClick = vi.fn();
    render(
      <MockupWizard
        currentStep={4}
        reachableStep={5}
        {...PREENCHIDO_ATE_LOGO}
        onStepClick={onStepClick}
      />,
    );

    screen.getByLabelText('Voltar para a etapa anterior').click();
    expect(onStepClick).toHaveBeenCalledWith(3);
  });
});
