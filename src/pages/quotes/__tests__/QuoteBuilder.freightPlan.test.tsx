/**
 * Plano de volumes no construtor de orçamento: estado real (`useQuoteBuilderState`)
 * ligado ao `FreightPlanCard` do mesmo jeito que a página liga, com 2 produtos da
 * fixture e o Supabase simulado. Mais um contrato de posição: o card é irmão do bloco
 * de frete e não entra no elemento que os guardas de layout medem.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FreightPlanCard } from '@/components/freight-plan/FreightPlanCard';
import {
  fromSimulado,
  Providers,
} from '@/components/freight-plan/__tests__/freightPlanCard.harness';
import { useQuoteBuilderState } from '@/hooks/quotes/useQuoteBuilderState';
import type { QuoteItem } from '@/hooks/quotes/quoteTypes';
import { CADERNETA, CANETA } from '@/lib/freight/__tests__/fixtures/products';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (tabela: string) => fromSimulado(tabela) },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-teste' }, isAdmin: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<object>('react-router-dom')),
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: undefined }),
  useSearchParams: () => [new URLSearchParams()],
}));
vi.mock('@/hooks/quotes', async () => ({
  ...(await vi.importActual<object>('@/hooks/quotes')),
  useQuotes: () => ({
    createQuote: vi.fn(),
    updateQuote: vi.fn(),
    fetchQuote: vi.fn(),
    isLoading: false,
  }),
  useSellerDiscountLimits: () => ({ myLimit: 10 }),
  useDiscountApproval: () => ({ requestApproval: vi.fn() }),
}));

const ITENS: QuoteItem[] = [
  {
    product_id: CADERNETA.id,
    product_name: CADERNETA.name,
    quantity: 4,
    unit_price: 20,
    personalizations: [],
  },
  {
    product_id: CANETA.id,
    product_name: CANETA.name,
    quantity: 10,
    unit_price: 2,
    personalizations: [],
  },
];

// 4 × 162 g + 10 × 6 g = 708 g; caixa M externa 33 × 33 × 47 = 51.183 cm³ = 0,05 m³.
const TOTAL_CLIENTE = '1 volume · 708 g · 0,05 m³';

/** O que a página faz: passa itens, estado e setters do builder ao card. */
function BuilderComCard() {
  const s = useQuoteBuilderState();
  return (
    <>
      <button type="button" onClick={() => s.setItems(ITENS)}>
        Carregar 2 produtos
      </button>
      <button type="button" onClick={s.resetQuote}>
        Limpar orçamento
      </button>
      <FreightPlanCard
        items={s.items}
        mixMode={s.freightMixMode}
        onMixModeChange={s.setFreightMixMode}
        showToClient={s.showFreightPlanToClient}
        onShowToClientChange={s.setShowFreightPlanToClient}
      />
    </>
  );
}

function renderBuilder() {
  return render(
    <Providers>
      <BuilderComCard />
    </Providers>,
  );
}

describe('Construtor de orçamento: plano de volumes', () => {
  it('sem itens o card não aparece; com 2 produtos mostra o plano e a prévia do cliente', async () => {
    renderBuilder();
    expect(screen.queryByTestId('freight-plan-card')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Carregar 2 produtos' }));
    expect(await screen.findByText(/^1× M · 708 g/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('switch', { name: 'Mostrar volumes ao cliente' }));
    expect(screen.getByText(TOTAL_CLIENTE)).toBeInTheDocument();
  });

  it('o estado do builder guarda o modo de mistura e o switch; limpar o orçamento devolve o padrão', async () => {
    renderBuilder();
    await userEvent.click(screen.getByRole('button', { name: 'Carregar 2 produtos' }));
    await screen.findByText(/^1× M · 708 g/);

    await userEvent.click(screen.getByRole('radio', { name: 'Caixas separadas por produto' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Mostrar volumes ao cliente' }));
    // 2 volumes · 708 g · 2 × P externa 27 × 33 × 33 = 58.806 cm³ = 0,06 m³
    expect(await screen.findByText('2 volumes · 708 g · 0,06 m³')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Limpar orçamento' }));

    expect(screen.queryByTestId('freight-plan-card')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Carregar 2 produtos' }));
    expect(
      await screen.findByRole('radio', { name: 'Misturar produtos na mesma caixa' }),
    ).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Mostrar volumes ao cliente' })).not.toBeChecked();
  });

  it.each([
    [
      'página (QuoteAutoSave)',
      join('..', '..', '..', 'pages', 'quotes', 'QuoteBuilderPage.tsx'),
      '<QuoteAutoSave',
    ],
    [
      'estado (useAutoSaveQuote)',
      join('..', '..', '..', 'hooks', 'quotes', 'useQuoteBuilderState.ts'),
      'useAutoSaveQuote({',
    ],
  ])('o estado do plano entra no objeto de rascunho: %s', (_nome, caminho, ancora) => {
    const texto = readFileSync(join(import.meta.dirname, caminho), 'utf8');
    const inicio = texto.indexOf(ancora);
    expect(inicio).toBeGreaterThan(-1);
    const rascunho = texto.slice(inicio, texto.indexOf('notes', inicio));
    expect(rascunho).toContain('freightMixMode');
    expect(rascunho).toContain('showFreightPlanToClient');
  });
});

describe('Página do orçamento: posição do card de volumes', () => {
  const fonte = readFileSync(join(import.meta.dirname, '..', 'QuoteBuilderPage.tsx'), 'utf8');
  const inicioFrete = fonte.indexOf('{/* Frete */}');
  const posCard = fonte.indexOf('<FreightPlanCard');
  const proximoIrmao = fonte.indexOf('{s.companyInfo?.id', inicioFrete);
  const blocoFrete = fonte.slice(inicioFrete, posCard);

  it('o card vem logo depois do bloco de frete e antes do próximo irmão', () => {
    expect(inicioFrete).toBeGreaterThan(-1);
    expect(posCard).toBeGreaterThan(inicioFrete);
    expect(posCard).toBeLessThan(proximoIrmao);
  });

  it('o card fica fora do bloco de frete: os divs do bloco fecham antes dele', () => {
    const abre = (blocoFrete.match(/<div\b/g) ?? []).length;
    const fecha = (blocoFrete.match(/<\/div>/g) ?? []).length;
    expect(abre).toBe(fecha);
  });

  it.each([
    'freight-grid',
    'freight-grid-col-1',
    'freight-grid-col-2',
    'shipping-type-select',
    'shipping-cost-input',
  ])('o data-testid "%s" continua uma vez só, dentro do bloco de frete', (testid) => {
    expect(blocoFrete.split(`data-testid="${testid}"`).length - 1).toBe(1);
    expect(fonte.split(`data-testid="${testid}"`).length - 1).toBe(1);
  });
});
