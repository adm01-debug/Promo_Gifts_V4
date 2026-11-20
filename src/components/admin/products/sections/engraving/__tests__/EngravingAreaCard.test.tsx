import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('@/hooks/freight', () => ({
  usePriceTableBands: () => [
    { tabelaPrecoId: 'tab-1', minQuantity: 1, maxQuantity: 99, leadTimeDays: 4 },
    { tabelaPrecoId: 'tab-1', minQuantity: 100, maxQuantity: null, leadTimeDays: 8 },
  ],
}));

import { EngravingAreaCard } from '../EngravingAreaCard';
import type { EnrichedArea } from '../types';

function area(productionDays: number | null): EnrichedArea {
  return {
    id: 'pat-1',
    product_id: 'p1',
    tabela_preco_id: 'tab-1',
    location_code: 'CORPO-FRENTE',
    location_name: 'Corpo > Frente',
    location_order: 0,
    max_width: 10,
    max_height: 5,
    is_curved: false,
    shape: 'rectangle',
    technique_order: 1,
    is_active: true,
    notes: null,
    unit_cost: null,
    production_days: productionDays,
    technique_name: 'Laser',
    technique_code: 'LASER',
    technique_group: 'Laser',
    max_colors: null,
    setup_cost: null,
    charges_per_color: false,
  };
}

function renderCard(productionDays: number | null, onSave = vi.fn()) {
  render(
    <EngravingAreaCard
      area={area(productionDays)}
      isExpanded
      onToggleExpand={vi.fn()}
      onToggleActive={vi.fn()}
      onDelete={vi.fn()}
      onSaveProductionDays={onSave}
    />,
  );
  return onSave;
}

const campo = () => screen.getByLabelText('Prazo (dias úteis)');
const salvar = () => screen.getByRole('button', { name: 'Salvar prazo' });

describe('prazo de personalização no cartão da técnica', () => {
  it('vazio mostra a sugestão da tabela e o botão fica desligado', () => {
    renderCard(null);
    expect(campo()).toHaveValue('');
    expect(campo()).toHaveAttribute('placeholder', 'tabela: 4 a 8');
    expect(salvar()).toBeDisabled();
  });

  it('digitar 6 e salvar grava 6', async () => {
    const onSave = renderCard(null);
    await userEvent.type(campo(), '6');
    await userEvent.click(salvar());
    expect(onSave).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'pat-1' }), 6);
  });

  it('apagar o valor salvo e salvar grava null (volta a usar a tabela)', async () => {
    const onSave = renderCard(6);
    expect(campo()).toHaveValue('6');
    await userEvent.clear(campo());
    await userEvent.click(salvar());
    expect(onSave).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'pat-1' }), null);
  });

  it('valor inválido avisa e não deixa salvar', async () => {
    const onSave = renderCard(null);
    await userEvent.type(campo(), '-3');
    expect(screen.getByRole('alert').textContent).toBe('Use um número inteiro de 0 a 365.');
    expect(salvar()).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
