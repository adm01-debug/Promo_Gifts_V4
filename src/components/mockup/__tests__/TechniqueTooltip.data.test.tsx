/**
 * TechniqueTooltip.data.test.tsx
 *
 * Contrato: os limites e a durabilidade exibidos no tooltip vêm do CADASTRO
 * da técnica (props), nunca de texto fixo no componente. Quando o cadastro
 * não traz o dado, o valor aparece rotulado como "(estimativa)".
 *
 * Falha sem a correção: antes, textos como "Até 6 cores" / "500+ lavagens"
 * eram literais no código e ignoravam a prop `maxColors`.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// O HoverCard do Radix só monta o conteúdo quando aberto; mockamos para
// renderizar o conteúdo inline e inspecionar os dados exibidos de forma direta.
vi.mock('@/components/ui/hover-card', () => ({
  HoverCard: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  HoverCardTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  HoverCardContent: ({ children }: { children?: ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

import { TechniqueTooltip } from '../TechniqueTooltip';

type Tech = {
  id: string;
  name: string;
  code: string | null;
  maxColors?: number | null;
  chargesPerColor?: boolean;
  maxWidth?: number | null;
  maxHeight?: number | null;
  setupCost?: number | null;
  locationName?: string | null;
  isCurved?: boolean;
  variationLabel?: string | null;
  groupCode?: string | null;
};

function renderTooltip(overrides: Partial<Tech> = {}) {
  const technique: Tech = { id: 't1', name: 'Serigrafia', code: 'silk', ...overrides };
  return render(
    <TechniqueTooltip technique={technique}>
      <span>abrir</span>
    </TechniqueTooltip>,
  );
}

function tooltipContent() {
  return screen.getByTestId('tooltip-content');
}

describe('TechniqueTooltip — limites e durabilidade vêm do cadastro', () => {
  it('máximo de cores vem da prop maxColors, não de texto fixo', () => {
    renderTooltip({ code: 'silk', maxColors: 2 });

    const cores = screen.getByTestId('tooltip-cores-valor');
    expect(cores).toHaveTextContent('Até 2');
    // O número fixo antigo da serigrafia (6) não pode aparecer
    expect(within(tooltipContent()).queryByText(/Até\s*6/)).toBeNull();
  });

  it('sem maxColors no cadastro: cores aparece como estimativa rotulada e sem número de limite', () => {
    renderTooltip({ code: 'silk', maxColors: null });

    expect(screen.getByTestId('tooltip-cores-estimativa')).toHaveTextContent('estimativa');
    expect(screen.queryByTestId('tooltip-cores-valor')).toBeNull();
    expect(within(tooltipContent()).queryByText(/Até\s*\d+/)).toBeNull();
  });

  it('maxColors undefined (técnica sem cadastro) também cai na estimativa rotulada', () => {
    renderTooltip({ code: 'bordado', maxColors: undefined });

    expect(screen.getByTestId('tooltip-cores-estimativa')).toHaveTextContent('estimativa');
    expect(screen.queryByTestId('tooltip-cores-valor')).toBeNull();
  });

  it('durabilidade é estimativa rotulada, sem número fixo de lavagens', () => {
    renderTooltip({ code: 'bordado' });

    expect(screen.getByTestId('tooltip-durabilidade-estimativa')).toHaveTextContent('estimativa');
    expect(within(tooltipContent()).queryByText(/lavagens/i)).toBeNull();
  });

  it('dimensões e setup exibidos vêm das props do cadastro', () => {
    renderTooltip({ code: 'silk', maxWidth: 10, maxHeight: 5, setupCost: 45.5 });

    expect(screen.getByText(/10×5 cm/)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 45\.50/)).toBeInTheDocument();
  });
});

describe('TechniqueTooltip — nenhum número literal de limite no componente', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(resolve(here, '..', 'TechniqueTooltip.tsx'), 'utf-8');

  it('não contém durabilidade numérica fixa (ex.: "500+ lavagens")', () => {
    expect(source).not.toMatch(/\d+\s*\+?\s*lavagens/i);
  });

  it('não contém limite de cores fixo (ex.: "Até 6 cores")', () => {
    expect(source).not.toMatch(/Até\s*\d+\s*cores?/i);
  });
});
