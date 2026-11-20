import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductionLeadTime } from '@/lib/lead-time';

const h = vi.hoisted(() => {
  const state: {
    leadTime: ProductionLeadTime | null;
    unlinkedItems: number;
    isLoading: boolean;
    isError: boolean;
  } = {
    leadTime: null,
    unlinkedItems: 0,
    isLoading: false,
    isError: false,
  };
  return { state, refetch: vi.fn() };
});

vi.mock('@/hooks/freight', () => ({
  useProductionLeadTime: () => ({ ...h.state, refetch: h.refetch }),
}));

import { ProductionLeadTimeCard } from '../ProductionLeadTimeCard';

const NOMES = new Map([
  ['caneta', 'Caneta Metal'],
  ['bloco', 'Bloco A5'],
]);

/** Caneta: 2 + 3 + 1 = 6. Bloco: 5 + 8 + 1 = 14 (crítico). Pronto em 14/12/2026. */
const PRONTO: ProductionLeadTime = {
  status: 'ok',
  totalDays: 14,
  readyDate: '2026-12-14',
  missing: [],
  perItem: [
    {
      productId: 'caneta',
      supplierDays: 2,
      supplierSource: 'supplier_default',
      personalizationDays: 3,
      personalizationSource: 'registered',
      bufferDays: 1,
      total: 6,
      isCritical: false,
    },
    {
      productId: 'bloco',
      supplierDays: 5,
      supplierSource: 'product_exception',
      personalizationDays: 8,
      personalizationSource: 'price_table',
      bufferDays: 1,
      total: 14,
      isCritical: true,
    },
  ],
};

interface HarnessProps {
  initial?: number | null;
  deliveryMode?: 'data' | 'prazo';
  requestedDate?: string | null;
}

function Harness({ initial = null, deliveryMode = 'prazo', requestedDate = null }: HarnessProps) {
  const [days, setDays] = useState<number | null>(initial);
  return (
    <ProductionLeadTimeCard
      items={[]}
      approvedOn={null}
      productNames={NOMES}
      deliveryMode={deliveryMode}
      requestedDate={requestedDate}
      estimatedDeliveryDays={days}
      onEstimatedDeliveryDaysChange={setDays}
    />
  );
}

const campo = () => screen.getByLabelText('Prazo de entrega estimado (dias úteis)');

beforeEach(() => {
  vi.clearAllMocks();
  h.state = { leadTime: PRONTO, unlinkedItems: 0, isLoading: false, isError: false };
});

describe('resumo e lista por item', () => {
  it('diz em quantos dias e quando fica pronto, e quem define o prazo', () => {
    render(<Harness />);
    expect(screen.getByTestId('production-lead-time-summary').textContent).toBe(
      'Pronto para envio em 14 dias úteis (14/12) — definido por Bloco A5 (fornecedor 5 + personalização 8 + folga 1)',
    );
  });

  it('lista cada item com a origem de cada prazo', () => {
    render(<Harness />);
    const itens = within(screen.getByRole('list', { name: 'Prazo por item' })).getAllByRole(
      'listitem',
    );
    expect(itens).toHaveLength(2);
    expect(itens[0]?.textContent).toContain('Caneta Metal');
    expect(itens[0]?.textContent).toContain('fornecedor 2 (padrão do fornecedor)');
    expect(itens[0]?.textContent).toContain('personalização 3 (prazo cadastrado na técnica)');
    expect(itens[1]?.textContent).toContain('define o prazo');
    expect(itens[1]?.textContent).toContain('fornecedor 5 (exceção do produto)');
    expect(itens[1]?.textContent).toContain('personalização 8 (tabela de preço)');
  });
});

describe('alerta de data pedida', () => {
  it.each([
    // pronto em 14/12; pedida 10/12 < 14/12 -> alerta
    { modo: 'data' as const, pedida: '2026-12-10', alerta: true },
    // pedida igual ao pronto: dá tempo de produzir (o transporte é outra conta)
    { modo: 'data' as const, pedida: '2026-12-14', alerta: false },
    { modo: 'data' as const, pedida: '2026-12-20', alerta: false },
    // modo por prazo ignora a data
    { modo: 'prazo' as const, pedida: '2026-12-10', alerta: false },
    { modo: 'data' as const, pedida: null, alerta: false },
  ])('modo $modo, pedida $pedida: alerta = $alerta', ({ modo, pedida, alerta }) => {
    render(<Harness deliveryMode={modo} requestedDate={pedida} />);
    const aviso = screen.queryByRole('alert');
    expect(aviso !== null).toBe(alerta);
    if (alerta) expect(aviso?.textContent).toContain('10/12/2026');
  });
});

describe('prazo de entrega estimado', () => {
  it('vazio é preenchido com o calculado, sem marca de ajuste', () => {
    render(<Harness initial={null} />);
    expect(campo()).toHaveValue(14);
    expect(screen.queryByText('ajustado manualmente')).toBeNull();
  });

  it('digitar outro valor marca "ajustado manualmente"; "Usar o calculado" desfaz', async () => {
    render(<Harness initial={14} />);
    await userEvent.clear(campo());
    await userEvent.type(campo(), '20');
    expect(campo()).toHaveValue(20);
    expect(screen.getByText('ajustado manualmente')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Usar o calculado (14)' }));
    expect(campo()).toHaveValue(14);
    expect(screen.queryByText('ajustado manualmente')).toBeNull();
  });

  it('valor salvo diferente do calculado já abre como ajustado e não é sobrescrito', () => {
    render(<Harness initial={30} />);
    expect(campo()).toHaveValue(30);
    expect(screen.getByText('ajustado manualmente')).toBeTruthy();
  });

  it('apagar o campo não mostra "ajustado manualmente", mas o botão para usar o calculado continua', async () => {
    render(<Harness initial={14} />);
    await userEvent.clear(campo());
    expect(campo()).toHaveValue(null);
    expect(screen.queryByText('ajustado manualmente')).toBeNull();
    const botao = screen.getByRole('button', { name: 'Usar o calculado (14)' });
    await userEvent.click(botao);
    expect(campo()).toHaveValue(14);
  });
});

describe('outros estados', () => {
  it('dados insuficientes lista o que falta, com o nome do produto', () => {
    h.state.leadTime = {
      status: 'dados_insuficientes',
      perItem: [],
      totalDays: null,
      readyDate: null,
      missing: [
        { code: 'supplier_lead_time', message: 'Falta o prazo do fornecedor.', productId: 'bloco' },
      ],
    };
    render(<Harness />);
    expect(screen.getByRole('alert').textContent).toContain(
      'Bloco A5: Falta o prazo do fornecedor.',
    );
    expect(screen.queryByTestId('production-lead-time-summary')).toBeNull();
    expect(campo()).toHaveValue(null);
  });

  it('carregando', () => {
    h.state = { leadTime: null, unlinkedItems: 0, isLoading: true, isError: false };
    render(<Harness />);
    expect(screen.getByRole('status').textContent).toContain('Calculando o prazo');
  });

  it('erro com nova tentativa', async () => {
    h.state = { leadTime: null, unlinkedItems: 0, isLoading: false, isError: true };
    render(<Harness />);
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível calcular');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(h.refetch).toHaveBeenCalledOnce();
  });

  it('sem produtos vinculados pede para adicionar itens', () => {
    h.state = { leadTime: null, unlinkedItems: 0, isLoading: false, isError: false };
    render(<Harness />);
    expect(screen.getByText(/Adicione produtos ao orçamento/)).toBeTruthy();
  });

  it.each([
    [1, '1 item sem produto do catálogo ficou fora do cálculo.'],
    [3, '3 itens sem produto do catálogo ficaram fora do cálculo.'],
  ])('%s item(ns) sem produto avisa', (quantos, texto) => {
    h.state.unlinkedItems = quantos;
    render(<Harness />);
    expect(screen.getByText(texto)).toBeTruthy();
  });
});
