import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import type { ComponentProps } from 'react';
import type * as PainelReal from '@/components/freight-plan/FreightPlanPanel';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CADERNETA, CANETA } from '@/lib/freight/__tests__/fixtures/products';
import type { FreightPlanCardItem } from '../FreightPlanCard';
import {
  CardHost,
  fromSimulado,
  Providers,
  reiniciarSimulacao,
  simulacao,
} from './freightPlanCard.harness';

const painelRenderizado = vi.hoisted(() => vi.fn());
// O painel real, só com contagem de renders: prova que o card não redesenha à toa.
vi.mock('@/components/freight-plan/FreightPlanPanel', async (importOriginal) => {
  const real = await importOriginal<typeof PainelReal>();
  return {
    ...real,
    FreightPlanPanel: (props: ComponentProps<typeof real.FreightPlanPanel>) => {
      painelRenderizado();
      return <real.FreightPlanPanel {...props} />;
    },
  };
});
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (tabela: string) => fromSimulado(tabela) },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const CADERNETA_4: FreightPlanCardItem = {
  product_id: CADERNETA.id,
  product_name: CADERNETA.name,
  quantity: 4,
};
const CANETA_10: FreightPlanCardItem = {
  product_id: CANETA.id,
  product_name: CANETA.name,
  quantity: 10,
};

// 4 × 162 g + 10 × 6 g = 648 + 60 = 708 g (abaixo de 1 kg o motor mostra gramas). A caixa (M) é escolha do motor, coberta nos
// testes dele: 33 × 33 × 47 cm externos = 51.183 cm³ = 0,05 m³; cubado Correios 51.183 ÷ 6.000 = 8,53 kg.
const RESUMO_MISTURADO = '1× M · 708 g · 0,05 m³ · cubado 8,5 kg';
// Mesmas peças em caixas separadas: 2 × P externa 27 × 33 × 33 = 2 × 29.403 = 58.806 cm³ = 0,06 m³;
// cubado 58.806 ÷ 6.000 = 9,80 kg. Peso igual: 648 + 60 = 708 g.
const RESUMO_SEPARADO = '2× P · 708 g · 0,06 m³ · cubado 9,8 kg';

function renderCard(items: FreightPlanCardItem[], initialShow = false) {
  return render(
    <Providers>
      <CardHost initialItems={items} initialShow={initialShow} />
    </Providers>,
  );
}

describe('FreightPlanCard', () => {
  beforeEach(reiniciarSimulacao);

  it('produto marcado "não mistura" gera volume separado no modo misturar', async () => {
    simulacao.separados.add(CANETA.id);
    renderCard([CADERNETA_4, CANETA_10]);

    // Caderneta e caneta ficam em caixas próprias: 2 volumes, não o "1× M" do modo misturado.
    expect(await screen.findByText(/^2× /)).toBeInTheDocument();
    expect(screen.queryByText(RESUMO_MISTURADO)).not.toBeInTheDocument();
    // Só a caderneta ainda pode misturar: sem 2 produtos misturáveis não há o que escolher.
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('sem nenhuma caixa cadastrada (e sem erro de rede) o card não aparece', async () => {
    simulacao.semCaixas = true;
    renderCard([CADERNETA_4, CANETA_10]);

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(screen.queryByTestId('freight-plan-card')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('digitar em outro campo da página não redesenha o card (React.memo)', async () => {
    renderCard([CADERNETA_4, CANETA_10]);
    await screen.findByText(RESUMO_MISTURADO);
    const antes = painelRenderizado.mock.calls.length;

    await userEvent.type(screen.getByLabelText('Observações'), 'abc');

    // 3 teclas = 3 renders do hospedeiro; o card, com as mesmas props, fica de fora.
    expect(painelRenderizado.mock.calls.length).toBe(antes);
  });

  it('2 produtos: mostra o seletor de mistura e o plano calculado com os hooks reais', async () => {
    renderCard([CADERNETA_4, CANETA_10]);

    expect(await screen.findByText(RESUMO_MISTURADO)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Misturar produtos na mesma caixa' })).toBeChecked();
    expect(
      screen.getByText('4× Caderneta kraft B6 com porta caneta, 10× Caneta reciclavel'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('freight-plan-client-preview')).not.toBeInTheDocument();
  });

  it('trocar para caixas separadas recalcula o plano', async () => {
    renderCard([CADERNETA_4, CANETA_10]);
    await screen.findByText(RESUMO_MISTURADO);

    await userEvent.click(screen.getByRole('radio', { name: 'Caixas separadas por produto' }));

    expect(await screen.findByText(RESUMO_SEPARADO)).toBeInTheDocument();
  });

  it('switch "Mostrar volumes ao cliente": prévia só com os totais, sem ocupação nem caixa', async () => {
    renderCard([CADERNETA_4, CANETA_10]);
    await screen.findByText(RESUMO_MISTURADO);

    await userEvent.click(screen.getByRole('switch', { name: 'Mostrar volumes ao cliente' }));

    // 1 volume · 708 g (4 × 162 + 10 × 6) · 0,05 m³ (caixa M externa, 51.183 cm³)
    const previa = screen.getByTestId('freight-plan-client-preview');
    expect(within(previa).getByText('Como o cliente verá')).toBeInTheDocument();
    expect(within(previa).getByText('1 volume · 708 g · 0,05 m³')).toBeInTheDocument();
    expect(previa).not.toHaveTextContent(/ocupação|fator|caixa|cubado/i);
  });

  it('item avulso sem product_id entra pelo nome e deixa o plano sem dados suficientes', async () => {
    renderCard([
      { product_id: '', product_name: 'Brinde avulso do evento', quantity: 3 },
      CANETA_10,
    ]);

    expect(await screen.findByText(/Faltam medidas ou peso no cadastro/)).toBeInTheDocument();
    expect(screen.getByText(/Brinde avulso do evento/)).toBeInTheDocument();
  });

  it('prévia ligada sem plano calculado explica que o resumo ainda não existe', async () => {
    renderCard([{ product_id: '', product_name: 'Brinde avulso do evento', quantity: 3 }], true);

    await screen.findByText(/Faltam medidas ou peso no cadastro/);
    expect(
      within(screen.getByTestId('freight-plan-client-preview')).getByText(
        'O resumo aparece quando os volumes estiverem calculados.',
      ),
    ).toBeInTheDocument();
  });

  it.each([
    ['sem itens', []],
    ['só itens com quantidade 0', [{ ...CADERNETA_4, quantity: 0 }]],
  ])('%s: não renderiza o card', (_nome, items) => {
    renderCard(items);

    expect(screen.queryByTestId('freight-plan-card')).not.toBeInTheDocument();
  });

  it('1 produto só: sem seletor de mistura (não há o que decidir)', async () => {
    renderCard([CADERNETA_4]);

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('trocar a quantidade atualiza o painel em menos de 300 ms', async () => {
    renderCard([CADERNETA_4, CANETA_10]);
    await screen.findByText(RESUMO_MISTURADO);

    // Dobrar as cadernetas: 8 × 162 + 10 × 6 = 1.296 + 60 = 1.356 g = 1,4 kg; caixa G externa
    // 36 × 36 × 54 = 69.984 cm³ = 0,07 m³; cubado 69.984 ÷ 6.000 = 11,66 kg.
    const inicio = performance.now();
    await userEvent.click(screen.getByRole('button', { name: 'Dobrar quantidade' }));
    await screen.findByText('1× G · 1,4 kg · 0,07 m³ · cubado 11,7 kg');
    const decorrido = performance.now() - inicio;

    expect(decorrido).toBeLessThan(300);
  });

  it('teclado: o volume abre e fecha com Enter e o switch liga com Espaço', async () => {
    renderCard([CADERNETA_4, CANETA_10]);
    await screen.findByText(RESUMO_MISTURADO);

    const volume = screen.getByRole('button', { name: /Volume 1 · Caixa M/ });
    expect(volume).toHaveAttribute('aria-expanded', 'false');
    volume.focus();
    await userEvent.keyboard('{Enter}');
    expect(volume).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Enter}');
    expect(volume).toHaveAttribute('aria-expanded', 'false');

    const alternar = screen.getByRole('switch', { name: 'Mostrar volumes ao cliente' });
    alternar.focus();
    await userEvent.keyboard(' ');
    expect(alternar).toBeChecked();
  });

  it('acessibilidade (axe): sem violações com a prévia ligada', async () => {
    const { container } = renderCard([CADERNETA_4, CANETA_10], true);
    await screen.findByText(RESUMO_MISTURADO);

    expect(await axe(container)).toHaveNoViolations();
  });

  it('1 coluna em celular e linha a partir de sm: no rodapé do card', async () => {
    renderCard([CADERNETA_4, CANETA_10]);
    await screen.findByText(RESUMO_MISTURADO);

    const rodape = screen.getByRole('switch').closest('div')?.parentElement;
    expect(rodape).toHaveClass('flex-col', 'sm:flex-row');
  });

  it('snapshot do card com 2 produtos e a prévia ligada', async () => {
    const { container } = renderCard([CADERNETA_4, CANETA_10], true);
    await screen.findByText(RESUMO_MISTURADO);

    // Os ids do React/Radix dependem da ordem dos testes no processo: saem normalizados.
    const html = container.innerHTML.replace(
      /\b(id|for|aria-controls|aria-labelledby|aria-describedby)="[^"]*"/g,
      '$1="ID"',
    );
    expect(html).toMatchSnapshot();
  });
});
