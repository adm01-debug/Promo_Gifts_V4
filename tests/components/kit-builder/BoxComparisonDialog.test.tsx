import { render, screen } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { BoxComparisonDialog } from '@/components/kit-builder/BoxComparisonDialog';
import type { BoxRecommendation } from '@/lib/kit-builder';

const recommendation = (id: string, status: BoxRecommendation['status']): BoxRecommendation => ({
  box: {
    id,
    name: `Caixa ${id}`,
    sku: `CX-${id}`,
    imageUrl: null,
    price: 20,
    internalWidth: 20,
    internalHeight: 20,
    internalDepth: 20,
    internalVolume: 8000,
  },
  status,
  usagePercent: 70,
  availableVolume: 2400,
  compatibility: { fits: status !== 'incompatible', confidence: 'verified' },
});

describe('BoxComparisonDialog', () => {
  it('identifies the deterministic winner without inventing a commercial badge', () => {
    render(
      <BoxComparisonDialog
        open
        onOpenChange={vi.fn()}
        recommendations={[recommendation('A', 'compatible'), recommendation('B', 'compatible')]}
        recommendedBoxId="B"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Caixa B, melhor ajuste estimado')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Prioriza compatibilidade verificada, ocupação equilibrada e menor preço no desempate.',
      ),
    ).toBeInTheDocument();
  });
});
