/**
 * RESGATE — teste escrito por outro agente de IA que nunca chegou a main.
 *
 * Fonte: origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252
 *        tests/pages/legacy-QuoteBuilder.partial-preservation.test.tsx
 *
 * Ficou fora porque a main moveu hooks e paginas para subpastas, entao os imports
 * `@/...` do original nao resolvem mais. Nenhum `.skip`/`.todo` foi usado para
 * fazer este arquivo passar: caso que nao cabe mais no codigo atual foi REMOVIDO,
 * com a evidencia medida registrada abaixo.
 *
 * Blocos `it` na fonte: 5 · neste arquivo: 4
 * Casos em runtime: 4 de 5 (omitidos: 1)
 *
 * DRIFT ADAPTADO:
 * 1) Caminhos: `@/pages/QuoteBuilderPage` -> `@/pages/quotes/QuoteBuilderPage`.
 * `@/hooks/useQuoteBuilderState` e `@/hooks/useUnsavedChangesGuard` não existem como
 * módulos próprios: a página consome os BARRIS `@/hooks/quotes` e `@/hooks/common`
 * (src/pages/quotes/QuoteBuilderPage.tsx:53-54), então o stub teve de ir para o
 * barril, não para o caminho da tabela de remapeamento.
 *
 * 2) A restauração de rascunho MIGROU da página para o hook. O `<QuoteAutoSave/>` não
 * tem mais prop `onRestore` (interface QuoteAutoSaveProps em
 * src/components/quotes/QuoteAutoSave.tsx:30-39 só tem quoteId, data, onChange,
 * debounceMs, className, serverSavedAt) e a página não passa nenhuma
 * (src/pages/quotes/QuoteBuilderPage.tsx:177-203). Hoje o restore é o callback
 * `onRestore` que o useQuoteBuilderState entrega ao useAutoSaveQuote
 * (src/hooks/quotes/useQuoteBuilderState.ts:276-315). Medido:
 * `captured.autoSave.onRestore` é undefined -> os 3 casos de restore falhavam com
 * "expected [Function] to throw"/"Number of calls: 0". Adaptei os casos 3 e 5 para
 * montar o hook REAL via harness (MemoryRouter + QueryClientProvider) e disparar o
 * `onRestore` capturado, assertando o estado retornado em vez de spies de setter.
 *
 * 3) Armadilha de mock (causa real que custou uma iteração): mockar só o barril
 * `@/hooks/quotes` NÃO intercepta o useAutoSaveQuote visto pelo useQuoteBuilderState —
 * o barril (src/hooks/quotes/index.ts:2-4) reexporta o próprio useQuoteBuilderState, e
 * esse ciclo faz o Vitest entregar o barril REAL a esse módulo (medido: typeof
 * captured.restore === 'object'/null). Precisei mockar os módulos profundos
 * `@/hooks/quotes/useAutoSaveQuote`, `useQuotes` e `useSellerDiscountLimits`.
 *
 * 4) `validityDays` deixou de ser restaurado do rascunho e passou a ser DERIVADO de
 * `validUntil` por syncValidityDaysFromDate, que só aceita os presets
 * ['1','3','7','15','30'] (src/hooks/quotes/useQuoteBuilderState.helpers.ts:26-37 e
 * useQuoteBuilderState.ts:309-313). O caso original enviava validityDays:'14' +
 * validUntil fixo '2026-11-24' e esperava '14'; adaptei para validUntil = hoje+15 dias
 * e espero '15' (também remove a dependência da data do sistema, que tornaria o caso
 * original flaky).
 *
 * 5) Mocks obsoletos removidos (módulos que a página não importa mais): MainLayout,
 * QuoteTemplateSelector, SaveAsTemplateButton, QuoteProductCustomization,
 * DraggableQuoteItems. Adicionados: `@/hooks/quotes/useNextQuoteNumberPreview`
 * (importado direto pela página, linha 59, faz query) e `@/contexts/AuthContext`.
 *
 * 6) Do caso 1 sobrevivia apenas a última asserção (campo "Forma | Pagamento").
 * Mantida, mas por `getByText(/Forma \| Pagamento/)` + testid `payment-method-select`:
 * o `<Label>` em src/pages/quotes/QuoteBuilderPage.tsx:390-401 não tem htmlFor nem
 * envolve o controle, então `getByLabelText` não acha.
 *
 * OMISSOES, COM EVIDENCIA MEDIDA:
 * Caso omitido (removido, sem skip): "rejects invalid known item fields before
 * modifying any current quote state".
 *
 * O que esperava: `onRestore({ notes:'Não aplicar', items:[{product_id:'p1',
 * quantity:'bad'}] })` LANÇAR erro com mensagem /incompatíveis/ e não tocar em nenhum
 * setter (setClientId/setNotes/setItems).
 *
 * O que o código faz hoje (medido com arquivo de prova temporário
 * tests/pages/__probe-drift.test.tsx, já removido, rodando o useQuoteBuilderState
 * real): não lança nada e aplica tudo —
 * PROBE threw= null
 * PROBE notes= "Nao aplicar"
 * PROBE items= [{"product_id":"p1","quantity":"bad"}]
 *
 * Evidência no código: o caminho de restore real
 * (src/hooks/quotes/useAutoSaveQuote.ts:104-129) só faz JSON.parse + migratePayload e
 * chama onRestore; não há validação de schema. E o onRestore
 * (src/hooks/quotes/useQuoteBuilderState.ts:282) é `if (saved.items)
 * setItems(saved.items)`, sem checar tipo. Não existe a string "incompatíveis" em
 * nenhum ponto do fluxo de orçamento (grep em src/: só comentários em
 * src/hooks/auth/useProfileRoles.ts:59,112). O único validador existente,
 * `quoteDraftRecoverySchema` (src/lib/quotes/quoteDraftRecovery.ts:88-116), é usado
 * apenas em src/components/quotes/QuoteAutoSave.tsx:400, dentro de `useQuoteAutoSave`
 * (QuoteAutoSave.tsx:370) — hook que NINGUÉM importa (grep "useQuoteAutoSave" em src/
 * só retorna a própria definição), ou seja, código morto; e mesmo lá o comportamento
 * seria logger.warn + return null, nunca throw. Já existe cobertura do schema isolado
 * em src/lib/quotes/__tests__/quoteDraftRecovery.test.ts, então não há perda de
 * cobertura do schema em si — a perda é da proteção no fluxo real, registrada abaixo
 * como bug.
 *
 * DEFEITO DE PRODUCAO QUE ESTE RESGATE REVELOU (nao corrigido aqui; src/ nao
 * foi alterado por esta PR):
 * Dois achados reais, ambos do fluxo de restauração de rascunho (não alterei nada em
 * src/):
 *
 * 1) Rascunho de orçamento entra no estado da tela SEM validação de schema.
 * src/hooks/quotes/useAutoSaveQuote.ts:104-129 lê a chave `quote_builder_autosave`,
 * faz JSON.parse + migratePayload e chama onRestore direto;
 * src/hooks/quotes/useQuoteBuilderState.ts:276-315 atribui os campos sem checar tipo
 * (ex.: linha 282 `if (saved.items) setItems(saved.items)`). Medido: um rascunho com
 * `items:[{product_id:'p1', quantity:'bad'}]` é restaurado como está, com quantity
 * string, alimentando os cálculos de total. O validador que existe para isso
 * (`quoteDraftRecoverySchema`, src/lib/quotes/quoteDraftRecovery.ts:88) está pendurado
 * só em `useQuoteAutoSave` (src/components/quotes/QuoteAutoSave.tsx:370-400), hook sem
 * nenhum importador — código morto. Correção provável: aplicar
 * quoteDraftRecoverySchema.safeParse em useAutoSaveQuote antes de chamar onRestore.
 *
 * 2) `shippingCost: 0` nunca é restaurado por guarda de falsy:
 * src/hooks/quotes/useQuoteBuilderState.ts:305 `if (saved.shippingCost)
 * setShippingCost(saved.shippingCost)`. Hoje é inofensivo porque o default do estado
 * já é 0, mas o padrão difere do resto do bloco (discountValue e negotiationMarkup
 * usam `typeof === 'number'`, linhas 284 e 286-287) e quebraria se o default mudar.
 * Mantive a asserção `shippingCost === 0` refletindo o contrato atual.
 *
 */
/**
 * Resgate de cobertura escrita por outro agente (branch salvo/codex-fix-gate1-kit-pdf-types).
 *
 * Adaptado ao código atual: a restauração de rascunho parcial saiu do QuoteBuilderPage
 * (prop `onRestore` do <QuoteAutoSave/>, que não existe mais — src/components/quotes/
 * QuoteAutoSave.tsx:30-39) e passou para o `onRestore` que o useQuoteBuilderState entrega
 * ao useAutoSaveQuote (src/hooks/quotes/useQuoteBuilderState.ts:276-315). Por isso o arquivo
 * cobre os dois níveis: a fiação que sobrou na página e o contrato de restauração no hook.
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { addDays, format, startOfDay } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuoteBuilderPage from '@/pages/quotes/QuoteBuilderPage';
import type { QuoteAutoSave } from '@/components/quotes/QuoteAutoSave';

const state = vi.hoisted(() => ({
  loadingQuote: false,
  quoteId: undefined,
  isEditMode: false,
  items: [],
  validationErrors: [],
  completedSteps: [],
  activeStep: 'client',
  clientId: '',
  contactId: '',
  validityDays: '7',
  validUntil: '2026-11-17',
  notes: '',
  internalNotes: '',
  paymentMethod: 'boleto',
  paymentTerms: '',
  deliveryTime: '',
  deliveryMode: 'prazo',
  shippingType: 'cif',
  shippingCost: 0,
  discountType: 'percent',
  discountValue: 0,
  navigate: vi.fn(),
  setClientId: vi.fn(),
  setValidUntil: vi.fn(),
  setDiscountType: vi.fn(),
  setDiscountValue: vi.fn(),
  setNotes: vi.fn(),
  setInternalNotes: vi.fn(),
  setItems: vi.fn(),
  setContactId: vi.fn(),
  setCompanyInfo: vi.fn(),
  setContactInfo: vi.fn(),
  setValidityDays: vi.fn(),
  setNegotiationMarkup: vi.fn(),
  setDeliveryMode: vi.fn(),
  setDeliveryDate: vi.fn(),
  setPaymentMethod: vi.fn(),
  setPaymentTerms: vi.fn(),
  setDeliveryTime: vi.fn(),
  setShippingType: vi.fn(),
  setShippingCost: vi.fn(),
}));
const captured = vi.hoisted(() => ({
  autoSave: null as ComponentProps<typeof QuoteAutoSave> | null,
  guard: vi.fn(),
  restore: null as ((saved: Record<string, unknown>) => void) | null,
}));

// O QuoteBuilderPage consome os hooks pelos barris `@/hooks/quotes` e `@/hooks/common`
// (src/pages/quotes/QuoteBuilderPage.tsx:53-54), então o stub precisa ser no barril.
vi.mock('@/hooks/quotes', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return {
    ...actual,
    useQuoteBuilderState: () => state,
    useQuotes: () => ({
      createQuote: vi.fn(),
      updateQuote: vi.fn(),
      fetchQuote: vi.fn(),
      isLoading: false,
    }),
    useSellerDiscountLimits: () => ({ myLimit: 50 }),
  };
});
// O useQuoteBuilderState importa useAutoSaveQuote/useQuotes PELO barril
// (useQuoteBuilderState.ts:8-15); como o barril reexporta o próprio hook, o ciclo faz o
// Vitest entregar o barril REAL a esse módulo. Por isso o stub tem de ser nos módulos
// profundos, que o barril real reexporta.
vi.mock('@/hooks/quotes/useAutoSaveQuote', () => ({
  useAutoSaveQuote: (options: { onRestore?: (saved: Record<string, unknown>) => void }) => {
    captured.restore = options.onRestore ?? null;
    return { clearAutoSave: vi.fn() };
  },
  migratePayload: vi.fn(() => null),
  cleanOldQuoteDrafts: vi.fn(() => 0),
}));
vi.mock('@/hooks/quotes/useQuotes', () => ({
  useQuotes: () => ({
    createQuote: vi.fn(),
    updateQuote: vi.fn(),
    fetchQuote: vi.fn(),
    isLoading: false,
  }),
}));
vi.mock('@/hooks/quotes/useSellerDiscountLimits', () => ({
  useSellerDiscountLimits: () => ({ myLimit: 50 }),
}));
vi.mock('@/hooks/quotes/useNextQuoteNumberPreview', () => ({
  useNextQuoteNumberPreview: () => null,
}));
vi.mock('@/hooks/common', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useUnsavedChangesGuard: (options: { hasUnsavedChanges: boolean }) => {
    captured.guard(options);
    return {
      showDialog: false,
      guardNavigation: (callback: () => void) => callback(),
      confirmLeave: vi.fn(),
      cancelLeave: vi.fn(),
      message: '',
    };
  },
}));
vi.mock('@/contexts/AuthContext', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useAuth: () => ({ user: { id: 'u1' } }),
}));
vi.mock('@/lib/telemetry/quoteHandoffTelemetry', () => ({ trackQuoteHandoff: vi.fn() }));
vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('@/components/quotes/QuoteAutoSave', () => ({
  QuoteAutoSave: (props: ComponentProps<typeof QuoteAutoSave>) => {
    captured.autoSave = props;
    return null;
  },
}));
vi.mock('@/components/common/UnsavedChangesDialog', () => ({ UnsavedChangesDialog: () => null }));
vi.mock('@/components/quotes/CompanyContactSelector', () => ({
  CompanyContactSelector: () => null,
}));
vi.mock('@/components/quotes/QuoteBuilderStepper', () => ({ QuoteBuilderStepper: () => null }));
vi.mock('@/components/quotes/QuoteBuilderSummaryColumn', () => ({
  QuoteBuilderSummaryColumn: () => null,
}));
vi.mock('@/components/quotes/QuoteBuilderProductSearch', () => ({
  QuoteBuilderProductSearch: () => null,
}));

// Hook real (caminho profundo) — o barril acima está mockado só para a página.
const { useQuoteBuilderState } = await import('@/hooks/quotes/useQuoteBuilderState');

let latest: ReturnType<typeof useQuoteBuilderState> | null = null;
let pathname = '';

function Harness() {
  latest = useQuoteBuilderState();
  pathname = useLocation().pathname;
  return null;
}

function mountHook() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/orcamentos/novo']}>
        <Harness />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  Object.values(state).forEach((value) => {
    if (vi.isMockFunction(value)) value.mockClear();
  });
  captured.guard.mockClear();
  captured.autoSave = null;
  captured.restore = null;
  latest = null;
  pathname = '';
  localStorage.clear();
});
afterEach(cleanup);

describe('legacy QuoteBuilder — fiação que permanece na página', () => {
  it('keeps the commercial payment-method field wired to the builder state', () => {
    render(<QuoteBuilderPage />);
    expect(screen.getByText(/Forma \| Pagamento/)).toBeInTheDocument();
    expect(screen.getByTestId('payment-method-select')).toBeInTheDocument();
  });

  it('connects autosave dirty changes to the existing navigation guard', () => {
    render(<QuoteBuilderPage />);
    act(() => captured.autoSave?.onChange?.(true));
    expect(captured.guard).toHaveBeenLastCalledWith({ hasUnsavedChanges: true });
    act(() => captured.autoSave?.onChange?.(false));
    expect(captured.guard).toHaveBeenLastCalledWith({ hasUnsavedChanges: false });
  });
});

describe('legacy QuoteBuilder — restauração de rascunho parcial (useQuoteBuilderState)', () => {
  it('restores real item metadata and payment fields without navigating away', () => {
    mountHook();
    const item = {
      product_id: 'p1',
      product_name: 'Produto',
      quantity: 2,
      unit_price: 5,
      partialMetadata: { preserved: true },
      personalizations: [{ technique_id: 't1', colorNote: 'Parcial' }],
    };
    expect(captured.restore).toBeTypeOf('function');
    act(() => {
      captured.restore?.({
        notes: 'Recuperado',
        items: [item],
        paymentMethod: 'pix_transferencia',
        shippingCost: 0,
      });
    });
    expect(latest!.items).toEqual([item]);
    expect(latest!.notes).toBe('Recuperado');
    expect(latest!.paymentMethod).toBe('pix_transferencia');
    expect(latest!.shippingCost).toBe(0);
    expect(pathname).toBe('/orcamentos/novo');
  });

  it('restores contact metadata, commercial margin and the visible dated-delivery mode', () => {
    mountHook();
    const companyInfo = { id: 'company-1', name: 'Empresa', cnpj: 'cnpj', partialColor: '#123456' };
    const contactInfo = {
      id: 'contact-1',
      name: 'Contato',
      email: 'a@example.com',
      partialCargo: 'Compras',
    };
    // validityDays é derivado de validUntil (useQuoteBuilderState.ts:309-313) e só aceita
    // os presets ['1','3','7','15','30'] — daí a data relativa a hoje + 15 dias.
    const validUntil = format(addDays(startOfDay(new Date()), 15), 'yyyy-MM-dd');
    act(() => {
      captured.restore?.({
        clientId: 'company-1',
        contactId: 'contact-1',
        companyInfo,
        contactInfo,
        negotiationMarkup: 12,
        validUntil,
        deliveryTime: 'date:2026-12-10',
        items: [],
      });
    });
    expect(latest!.companyInfo).toEqual(companyInfo);
    expect(latest!.contactInfo).toEqual(contactInfo);
    expect(latest!.clientId).toBe('company-1');
    expect(latest!.contactId).toBe('contact-1');
    expect(latest!.negotiationMarkup).toBe(12);
    expect(latest!.validUntil).toBe(validUntil);
    expect(latest!.validityDays).toBe('15');
    expect(latest!.deliveryMode).toBe('data');
    expect(latest!.deliveryDate).toEqual(new Date('2026-12-10T12:00:00'));
  });
});
