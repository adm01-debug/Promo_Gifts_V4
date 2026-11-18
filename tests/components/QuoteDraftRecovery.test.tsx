/**
 * RESGATE — cobertura de comportamento do QuoteDraftRecovery.
 *
 * Origem do contrato: `tests/components/QuoteAutoSave.recovery.test.tsx` escrito por
 * outro agente de IA na branch `claude/feat-restauracao-rascunho-orcamento-261117-1620`
 * (PR #3788, fechada sem merge). Aquele arquivo tinha 13 casos; a versão que entrou em
 * main tem 7, porque 6 falavam de um `QuoteAutoSave` com botão "Restaurar rascunho"
 * embutido — UI que a main nunca teve.
 *
 * A main implementou a feature em `src/components/quotes/QuoteDraftRecovery.tsx`, cujo
 * cabeçalho DIZ honrar 4 daquelas especificações. Medido em 2026-11-18: a lógica de
 * módulo está coberta (33 casos em `src/hooks/quotes/__tests__/quoteDraftApply.test.ts`),
 * mas o COMPONENTE não tinha nenhum teste — então as 4 promessas do cabeçalho não eram
 * verificadas por ninguém. Este arquivo cobre exatamente essas, mais as duas decisões
 * próprias da main ("Agora não" preserva, "Descartar" apaga).
 *
 * Mapa caso de origem -> caso aqui:
 *  - "does not restore automatically, submit the form, or write storage on recovery"
 *  - "keeps a rejected snapshot available and displays the real error"
 *  - "invokes an asynchronous recovery once even with duplicate clicks"
 *  - "reads each quote independently and does not reuse the previous snapshot"
 *  - "supports StrictMode"            -> montagem dupla não duplica a oferta
 *  - "settles a pending recovery after unmount without starting another action"
 */
import { StrictMode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { QuoteDraftRecovery } from '@/components/quotes/QuoteDraftRecovery';
import { quoteDraftKey } from '@/hooks/quotes/quoteDraftApply';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const QUOTE_ID = 'quote-1';
const KEY = quoteDraftKey(QUOTE_ID);

/** Item mínimo que passa pelo schema de recuperação (product_id + nome + números). */
const item = {
  product_id: 'p1',
  product_name: 'Caneta',
  quantity: 2,
  unit_price: 10,
};

function alvo() {
  const chamadas: string[] = [];
  const spy = (nome: string) =>
    vi.fn(() => {
      chamadas.push(nome);
    });
  return {
    chamadas,
    s: {
      quoteId: QUOTE_ID,
      isEditMode: true,
      // snapshot da tela: vazio, para que o rascunho sempre difira
      clientId: '',
      contactId: '',
      deliveryTime: '',
      discountType: 'amount' as const,
      discountValue: 0,
      items: [],
      negotiationMarkup: 0,
      notes: '',
      paymentMethod: '',
      paymentTerms: '',
      shippingCost: 0,
      shippingType: '',
      validUntil: '',
      // setters
      setClientId: spy('setClientId'),
      setContactId: spy('setContactId'),
      setCompanyInfo: spy('setCompanyInfo'),
      setContactInfo: spy('setContactInfo'),
      setItems: spy('setItems'),
      setDiscountType: spy('setDiscountType'),
      setDiscountValue: spy('setDiscountValue'),
      setNegotiationMarkup: spy('setNegotiationMarkup'),
      setPaymentMethod: spy('setPaymentMethod'),
      setPaymentTerms: spy('setPaymentTerms'),
      setDeliveryTime: spy('setDeliveryTime'),
      setShippingType: spy('setShippingType'),
      setShippingCost: spy('setShippingCost'),
      setValidUntil: spy('setValidUntil'),
      setValidityDays: spy('setValidityDays'),
      setNotes: spy('setNotes'),
      handleDeliveryModeChange: spy('handleDeliveryModeChange'),
      handleDeliveryDateChange: spy('handleDeliveryDateChange'),
    },
  };
}

/** Grava um rascunho ANTES desta montagem (o componente só oferece rascunho antigo). */
function gravaRascunho(data: unknown, key = KEY) {
  localStorage.setItem(
    key,
    JSON.stringify({ id: QUOTE_ID, data, savedAt: '2026-11-17T10:00:00.000Z', version: 1 }),
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('QuoteDraftRecovery — não restaura por conta própria', () => {
  it('oferece, mas não aplica nada antes do clique do vendedor', async () => {
    gravaRascunho({ clientId: 'c-9', items: [item] });
    const { chamadas, s } = alvo();

    render(<QuoteDraftRecovery s={s} />);

    // A oferta aparece...
    await waitFor(() =>
      expect(screen.getByText('Alterações não salvas deste orçamento')).toBeInTheDocument(),
    );
    // ...e nenhum setter foi chamado: sobrescrever dado do servidor sem perguntar
    // é pior que não recuperar.
    expect(chamadas).toEqual([]);
    // O rascunho segue no storage.
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });

  it('não oferece nada fora do modo de edição', () => {
    gravaRascunho({ clientId: 'c-9', items: [item] });
    const { s } = alvo();

    render(<QuoteDraftRecovery s={{ ...s, isEditMode: false }} />);

    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});

describe('QuoteDraftRecovery — rascunho ilegível é DITO e NÃO apagado', () => {
  it('mostra o motivo real e preserva o arquivo para investigação', async () => {
    localStorage.setItem(KEY, '{ isto nao e json');
    const { chamadas, s } = alvo();

    render(<QuoteDraftRecovery s={s} />);

    await waitFor(() =>
      expect(
        screen.getByText('Há um rascunho deste orçamento que não pôde ser lido'),
      ).toBeInTheDocument(),
    );
    // Motivo real, não mensagem genérica.
    expect(screen.getByText(/arquivo do rascunho está corrompido/)).toBeInTheDocument();
    // GUARD: o rascunho é a única cópia do trabalho do vendedor.
    expect(localStorage.getItem(KEY)).toBe('{ isto nao e json');
    expect(chamadas).toEqual([]);
    // Sem conteúdo legível não há o que restaurar: o botão não existe.
    expect(screen.queryByRole('button', { name: 'Restaurar alterações' })).toBeNull();
  });

  it('envelope em formato desconhecido também é dito, com outro motivo', async () => {
    localStorage.setItem(KEY, JSON.stringify('uma string, não um objeto'));
    const { s } = alvo();

    render(<QuoteDraftRecovery s={s} />);

    await waitFor(() =>
      expect(screen.getByText(/formato desconhecido/)).toBeInTheDocument(),
    );
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });
});

describe('QuoteDraftRecovery — idempotência do clique', () => {
  it('clique duplo em Restaurar aplica uma única vez', async () => {
    gravaRascunho({ clientId: 'c-9', items: [item] });
    const { chamadas, s } = alvo();
    const user = userEvent.setup();

    render(<QuoteDraftRecovery s={s} />);
    const botao = await screen.findByRole('button', { name: 'Restaurar alterações' });

    // Dois cliques imediatos: aplicar duas vezes duplicaria os itens do orçamento.
    await user.dblClick(botao);

    expect(chamadas.filter((c) => c === 'setItems')).toHaveLength(1);
    expect(chamadas.filter((c) => c === 'setClientId')).toHaveLength(1);
  });
});

describe('QuoteDraftRecovery — um rascunho por orçamento', () => {
  it('não reaproveita o rascunho de outro orçamento', async () => {
    // Rascunho gravado para OUTRO orçamento.
    gravaRascunho({ clientId: 'c-9', items: [item] }, quoteDraftKey('quote-2'));
    const { chamadas, s } = alvo();

    render(<QuoteDraftRecovery s={s} />);

    // Nada para este quoteId.
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(chamadas).toEqual([]);
    // E o rascunho do outro orçamento segue intacto.
    expect(localStorage.getItem(quoteDraftKey('quote-2'))).not.toBeNull();
  });
});

describe('QuoteDraftRecovery — montagem dupla (StrictMode)', () => {
  it('oferece uma única vez e não aplica nada sozinho', async () => {
    gravaRascunho({ clientId: 'c-9', items: [item] });
    const { chamadas, s } = alvo();

    render(
      <StrictMode>
        <QuoteDraftRecovery s={s} />
      </StrictMode>,
    );

    await waitFor(() =>
      expect(screen.getByText('Alterações não salvas deste orçamento')).toBeInTheDocument(),
    );
    expect(screen.getAllByText('Alterações não salvas deste orçamento')).toHaveLength(1);
    expect(chamadas).toEqual([]);
  });
});

describe('QuoteDraftRecovery — desmontar não dispara ação', () => {
  it('desmontar com a oferta aberta não aplica nem apaga nada', async () => {
    gravaRascunho({ clientId: 'c-9', items: [item] });
    const { chamadas, s } = alvo();

    const { unmount } = render(<QuoteDraftRecovery s={s} />);
    await screen.findByRole('button', { name: 'Restaurar alterações' });

    unmount();

    expect(chamadas).toEqual([]);
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });
});

describe('QuoteDraftRecovery — decisões próprias da main', () => {
  it('"Agora não" fecha sem apagar o rascunho', async () => {
    gravaRascunho({ clientId: 'c-9', items: [item] });
    const { chamadas, s } = alvo();
    const user = userEvent.setup();

    render(<QuoteDraftRecovery s={s} />);
    await user.click(await screen.findByRole('button', { name: 'Agora não' }));

    expect(localStorage.getItem(KEY)).not.toBeNull();
    expect(chamadas).toEqual([]);
  });

  it('"Descartar" remove o rascunho e não aplica nada', async () => {
    gravaRascunho({ clientId: 'c-9', items: [item] });
    const { chamadas, s } = alvo();
    const user = userEvent.setup();

    render(<QuoteDraftRecovery s={s} />);
    await user.click(await screen.findByRole('button', { name: 'Descartar' }));

    expect(localStorage.getItem(KEY)).toBeNull();
    expect(chamadas).toEqual([]);
  });
});
