import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MixModeSelector, type MixModeProduct } from '../MixModeSelector';

const CADERNETA: MixModeProduct = { id: 'caderneta', name: 'Caderneta A5', shipsSeparately: false };
const SQUEEZE: MixModeProduct = { id: 'squeeze', name: 'Squeeze 500 ml', shipsSeparately: false };
const GARRAFA: MixModeProduct = { id: 'garrafa', name: 'Garrafa térmica', shipsSeparately: true };

describe('MixModeSelector', () => {
  it('2 produtos que aceitam dividir caixa: mostra as duas opções e troca o modo', async () => {
    const onChange = vi.fn();
    render(
      <MixModeSelector value="misturar" onChange={onChange} products={[CADERNETA, SQUEEZE]} />,
    );

    expect(screen.getByRole('radio', { name: 'Misturar produtos na mesma caixa' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Caixas separadas por produto' }));

    expect(onChange).toHaveBeenCalledWith('separar');
  });

  it('menos de 2 produtos que aceitam dividir caixa: sem seletor, mas com a nota de caixa própria', () => {
    // 1 misturável + 1 de caixa própria = 1 < 2
    render(<MixModeSelector value="misturar" onChange={vi.fn()} products={[CADERNETA, GARRAFA]} />);

    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(
      screen.getByText('Garrafa térmica vai em caixa própria (cadastro).'),
    ).toBeInTheDocument();
  });

  it('sem seletor e sem produto de caixa própria: não renderiza nada', () => {
    const { container } = render(
      <MixModeSelector value="misturar" onChange={vi.fn()} products={[CADERNETA]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('a mesma linha de produto repetida conta como 1 produto, não 2', () => {
    // ids distintos misturáveis: {caderneta} = 1 < 2
    const { container } = render(
      <MixModeSelector value="misturar" onChange={vi.fn()} products={[CADERNETA, CADERNETA]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('produto de caixa própria ganha a nota do cadastro', () => {
    render(
      <MixModeSelector
        value="separar"
        onChange={vi.fn()}
        products={[CADERNETA, SQUEEZE, GARRAFA]}
      />,
    );

    expect(
      screen.getByText('Garrafa térmica vai em caixa própria (cadastro).'),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Caixas separadas por produto' })).toBeChecked();
  });
});
