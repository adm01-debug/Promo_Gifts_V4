/**
 * Integração do "Salvar como Template" dentro do construtor de orçamento.
 *
 * O card de Observações do QuoteBuilderPage é este componente — ele é o ponto
 * em que `SaveAsTemplateButton` passou a ser consumido de verdade.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { QuoteItem } from '@/hooks/quotes/quoteTypes';

vi.mock('@/hooks/quotes/useQuoteTemplates', () => ({
  useQuoteTemplates: () => ({
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
  }),
}));

import { QuoteBuilderNotesCard, toTemplateItems } from '../QuoteBuilderNotesCard';

const item: QuoteItem = {
  product_id: 'p1',
  product_name: 'Caneca',
  product_sku: 'SKU1',
  product_image_url: 'https://example.com/a.png',
  quantity: 10,
  unit_price: 25.5,
  color_name: 'Azul',
  color_hex: '#0000ff',
  personalizations: [
    {
      technique_id: 't1',
      technique_name: 'Silk',
      colors_count: 2,
      positions_count: 1,
      unit_cost: 3,
      setup_cost: 50,
    },
  ],
};

function renderCard(items: QuoteItem[], usarTemplate?: React.ReactNode) {
  return render(
    <QuoteBuilderNotesCard
      notes=""
      setNotes={vi.fn()}
      items={items}
      discountType="percent"
      discountValue={5}
      usarTemplate={usarTemplate}
    />,
  );
}

describe('QuoteBuilderNotesCard', () => {
  // A acao "Usar template" (QuoteTemplateSelector) entra por slot: o card e o
  // unico ponto do construtor que a monta (QuoteBuilderPage.tsx:693). Sem este
  // caso, remover o slot passaria despercebido — foi exatamente o que aconteceu
  // com o guarda e2e que ainda afirmava que o botao nao existia.
  it('monta a acao "Usar template" mesmo com o orcamento vazio', () => {
    renderCard([], <button data-testid="quote-use-template">Usar template</button>);
    expect(screen.getByTestId('quote-use-template')).toBeInTheDocument();
    // Com zero itens nao ha o que salvar: so a acao de usar aparece.
    expect(screen.queryByRole('button', { name: /salvar como template/i })).toBeNull();
  });

  it('oferece "Salvar como Template" quando o orçamento tem itens', () => {
    renderCard([item]);
    expect(screen.getByTestId('quote-notes-input')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar como template/i })).toBeInTheDocument();
  });

  it('não oferece a ação com orçamento vazio (nada a salvar)', () => {
    renderCard([]);
    expect(screen.getByTestId('quote-notes-input')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /salvar como template/i })).not.toBeInTheDocument();
  });

  it('converte itens do construtor para o formato persistido em quote_templates', () => {
    expect(toTemplateItems([item])).toEqual([
      {
        productId: 'p1',
        productSku: 'SKU1',
        productName: 'Caneca',
        productImageUrl: 'https://example.com/a.png',
        quantity: 10,
        unitPrice: 25.5,
        colorName: 'Azul',
        colorHex: '#0000ff',
        personalizations: [
          {
            techniqueId: 't1',
            techniqueName: 'Silk',
            colorsCount: 2,
            positionsCount: 1,
            unitCost: 3,
            setupCost: 50,
          },
        ],
      },
    ]);
  });
});
