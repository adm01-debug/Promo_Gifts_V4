import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { planFreight, type FreightPlan, type PlanOptions } from '@/lib/freight';
import { CAIXAS_PADRAO, SETTINGS_PADRAO } from '@/lib/freight/__tests__/fixtures/boxes';
import {
  LINHA_BARRA_61,
  LINHA_CADERNETA,
  LINHA_SEM_PESO,
} from '@/lib/freight/__tests__/fixtures/items';
import { FreightPlanPanel } from '../FreightPlanPanel';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const OPCOES: PlanOptions = {
  mixMode: 'misturar',
  computedAt: '2026-11-20T12:00:00.000Z',
  itemsHash: 'hash-de-teste',
};

const PRODUTOS = new Map([
  ['caderneta', { name: 'Caderneta A5', sku: 'SKU-caderneta' }],
  ['sem-peso', { name: 'Peça sem peso', sku: 'SKU-sem-peso' }],
]);

function plano(inputs: Parameters<typeof planFreight>[0]): FreightPlan {
  return planFreight(inputs, CAIXAS_PADRAO, OPCOES, SETTINGS_PADRAO);
}

function renderPanel(props: Parameters<typeof FreightPlanPanel>[0]) {
  return render(
    <MemoryRouter>
      <FreightPlanPanel {...props} />
    </MemoryRouter>,
  );
}

/** Plano ok de 1 volume (250 cadernetas na GG) repetido `quantidade` vezes, com um aviso. */
function planoComVolumes(quantidade: number): FreightPlan {
  const base = plano([{ row: LINHA_CADERNETA, quantity: 250 }]);
  return {
    ...base,
    volumes: Array.from({ length: quantidade }, () => base.volumes[0]),
    warnings: ['Aviso de teste do plano'],
  };
}

describe('FreightPlanPanel', () => {
  it('mais de 5 volumes: lista recolhida, resumo e aviso à vista, botão abre e fecha', async () => {
    renderPanel({ plan: planoComVolumes(6), products: PRODUTOS });

    // Resumo: 6 volumes na GG; os totais vêm do plano base (250 × 120 g = 30,0 kg). Não dependem da lista.
    expect(screen.getByText('6× GG · 30,0 kg · 0,12 m³ · cubado 20,0 kg')).toBeInTheDocument();
    expect(screen.getByText('Aviso de teste do plano')).toBeInTheDocument();
    expect(screen.queryByText(/Volume 1 ·/)).not.toBeInTheDocument();

    const abrir = screen.getByRole('button', { name: 'Ver 6 volumes' });
    expect(abrir).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(abrir);

    const ocultar = screen.getByRole('button', { name: 'Ocultar' });
    expect(ocultar).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Volume 6 · Caixa GG')).toBeInTheDocument();
    expect(screen.getAllByText(/^Volume \d · Caixa GG$/)).toHaveLength(6);

    await userEvent.click(ocultar);
    expect(screen.queryByText(/Volume 1 ·/)).not.toBeInTheDocument();
    expect(screen.getByText('Aviso de teste do plano')).toBeInTheDocument();
  });

  it('até 5 volumes: lista aberta e sem botão de recolher', () => {
    renderPanel({ plan: planoComVolumes(5), products: PRODUTOS });

    expect(screen.getAllByText(/^Volume \d · Caixa GG$/)).toHaveLength(5);
    expect(screen.queryByRole('button', { name: /Ver \d+ volumes|Ocultar/ })).toBeNull();
  });

  it('plano ok: resumo, volume com conteúdo e detalhes ao expandir', async () => {
    // 250 cadernetas: 1× GG · 250 × 120 g = 30,0 kg · 0,12 m³ · cubado Correios 20.000 g = 20,0 kg
    // cubado rodoviário 36.003,6 g = 36,0 kg · ocupação 0,7064 = 71%
    renderPanel({ plan: plano([{ row: LINHA_CADERNETA, quantity: 250 }]), products: PRODUTOS });

    expect(screen.getByText('1× GG · 30,0 kg · 0,12 m³ · cubado 20,0 kg')).toBeInTheDocument();
    expect(screen.getByText('250× Caderneta A5')).toBeInTheDocument();
    expect(screen.getByText(/fechou no peso máximo/)).toBeInTheDocument();
    expect(screen.getByText(/Estimativa para transporte/)).toBeInTheDocument();

    const gatilho = screen.getByRole('button', { name: /Volume 1 · Caixa GG/ });
    expect(gatilho).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(gatilho);

    expect(gatilho).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('71%')).toBeInTheDocument();
    expect(screen.getByText('Peso cubado (Correios)').nextSibling).toHaveTextContent('20,0 kg');
    expect(screen.getByText('Peso cubado (rodoviário)').nextSibling).toHaveTextContent('36,0 kg');
  });

  it('carregando: esqueleto, sem volumes', () => {
    renderPanel({ plan: null, isLoading: true });

    expect(screen.getByRole('status', { name: 'Calculando volumes' })).toBeInTheDocument();
    expect(screen.queryByText(/Volume 1/)).not.toBeInTheDocument();
  });

  it('dados insuficientes: lista o produto e o que falta', () => {
    renderPanel({ plan: plano([{ row: LINHA_SEM_PESO, quantity: 2 }]), products: PRODUTOS });

    expect(screen.getByText(/Faltam medidas ou peso no cadastro/)).toBeInTheDocument();
    expect(screen.getByText('Peça sem peso')).toBeInTheDocument();
    expect(screen.getByText(/falta peso/)).toBeInTheDocument();
    expect(screen.queryByText(/Volume 1/)).not.toBeInTheDocument();
  });

  it('não cabe: nomeia o produto e a maior caixa', () => {
    renderPanel({ plan: plano([{ row: LINHA_BARRA_61, quantity: 1 }]) });

    const alerta = screen.getByRole('alert');
    expect(within(alerta).getByText(/Barra de 61 cm/)).toBeInTheDocument();
    expect(within(alerta).getByText(/maior caixa ativa \(GG\)/)).toBeInTheDocument();
  });

  it('erro e "não cabe" usam ícone e div (a regra global pinta p/span/li de branco no tema escuro)', () => {
    const { unmount } = renderPanel({ plan: null, error: 'Falhou.' });
    const erro = screen.getByRole('alert');
    expect(erro.tagName).toBe('DIV');
    expect(erro.querySelector('svg')).not.toBeNull();
    expect(erro.querySelectorAll('p, span, label, td, th, li')).toHaveLength(0);
    unmount();

    renderPanel({ plan: plano([{ row: LINHA_BARRA_61, quantity: 1 }]) });
    const naoCabe = screen.getByRole('alert');
    expect(naoCabe.tagName).toBe('DIV');
    expect(naoCabe.querySelector('svg')).not.toBeNull();
    expect(naoCabe.querySelectorAll('p, span, label, td, th, li')).toHaveLength(0);
  });

  it('o ícone de "faltam medidas" não encolhe', () => {
    renderPanel({ plan: plano([{ row: LINHA_SEM_PESO, quantity: 2 }]), products: PRODUTOS });

    const frase = screen.getByText(/Faltam medidas ou peso no cadastro/);
    expect(frase.querySelector('svg')).toHaveClass('shrink-0');
  });

  it('plano ok com carregando ou erro: sem resumo de totais no cabeçalho', () => {
    const ok = plano([{ row: LINHA_CADERNETA, quantity: 250 }]);
    const resumo = '1× GG · 30,0 kg · 0,12 m³ · cubado 20,0 kg';

    const { unmount } = renderPanel({ plan: ok, isLoading: true });
    expect(screen.queryByText(resumo)).not.toBeInTheDocument();
    unmount();

    renderPanel({ plan: ok, error: 'Falhou.' });
    expect(screen.queryByText(resumo)).not.toBeInTheDocument();
  });

  it('produto indisponível: texto próprio, sem lista de campos', () => {
    renderPanel({
      plan: plano([{ row: LINHA_SEM_PESO, quantity: 2 }]),
      products: PRODUTOS,
      unavailable: [{ productId: 'apagado', name: 'Caneta Azul' }],
    });

    expect(screen.getByText('Caneta Azul')).toBeInTheDocument();
    expect(screen.getByText(/Produto indisponível ou inativo/)).toBeInTheDocument();
  });

  it('vazio: pede para adicionar produtos', () => {
    renderPanel({ plan: null });

    expect(
      screen.getByText('Adicione produtos com quantidade para ver os volumes.'),
    ).toBeInTheDocument();
  });

  it('erro: mostra a mensagem recebida', () => {
    renderPanel({ plan: null, error: 'Os parâmetros de frete não estão disponíveis.' });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Os parâmetros de frete não estão disponíveis.',
    );
  });
});
