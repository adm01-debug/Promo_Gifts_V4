import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import type { ProductMeasureRow } from '@/lib/freight';
import { ProductSkuTag } from '../ProductSkuTag';

const BASE: ProductMeasureRow = {
  id: 'p-1',
  sku: 'SKU-1',
  name: 'Garrafa',
  height_cm: 10,
  width_cm: 5,
  length_cm: 3,
  diameter_cm: null,
  weight_g: 100,
};

function renderTag(product: ProductMeasureRow) {
  render(
    <TooltipProvider>
      <ProductSkuTag product={product} />
    </TooltipProvider>,
  );
}

describe('ProductSkuTag + indicador de dados de frete (etapa 37)', () => {
  it('produto completo: mostra o SKU e nenhum aviso', () => {
    renderTag(BASE);
    expect(screen.getByText('SKU-1')).toBeTruthy();
    expect(screen.queryByTestId('freight-readiness-indicator')).toBeNull();
  });

  it('produto sem peso: mostra o aviso dizendo que falta o peso', () => {
    renderTag({ ...BASE, weight_g: null });
    const aviso = screen.getByTestId('freight-readiness-indicator');
    expect(aviso.getAttribute('aria-label')).toBe('Sem dados de frete: falta peso.');
  });

  it('produto sem largura e comprimento: lista os dois campos', () => {
    renderTag({ ...BASE, width_cm: null, length_cm: null });
    expect(screen.getByTestId('freight-readiness-indicator').getAttribute('aria-label')).toBe(
      'Sem dados de frete: falta largura, comprimento.',
    );
  });

  it('o aviso recebe foco pelo teclado (tabIndex 0) para abrir o tooltip', () => {
    renderTag({ ...BASE, weight_g: null });
    expect(screen.getByTestId('freight-readiness-indicator').getAttribute('tabindex')).toBe('0');
  });
});
