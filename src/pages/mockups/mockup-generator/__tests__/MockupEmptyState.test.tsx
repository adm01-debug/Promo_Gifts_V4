/**
 * Estado vazio da página do gerador (MockupEmptyState).
 *
 * Prova que o estado vazio ORIENTA a busca e a seleção: título e instrução
 * corretos, os quatro passos do fluxo na ordem, o passo atual destacado,
 * o selo "OK" só nos passos preenchidos e o selo de produto pronto só
 * quando há produto escolhido. Se qualquer regra quebrar, o teste fica vermelho.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockupEmptyState } from '../MockupEmptyState';

const STEP_LABELS = [
  'Selecione a empresa',
  'Escolha o produto',
  'Defina a técnica',
  'Faça upload do logo',
];

/** Localiza a linha do passo pelo rótulo visível (o span do rótulo é filho direto da linha). */
function stepRow(label: string): HTMLElement {
  const span = screen.getByText(label);
  const row = span.closest('div');
  if (!row) throw new Error(`linha do passo "${label}" não encontrada`);
  return row as HTMLElement;
}

describe('MockupEmptyState — orienta a busca e a seleção', () => {
  it('sem produto, orienta a escolher empresa e produto no painel de configuração', () => {
    render(<MockupEmptyState />);

    expect(screen.getByRole('heading', { name: 'Selecione um produto' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Escolha uma empresa e um produto no painel de configuração para começar a criar seu mockup.',
      ),
    ).toBeInTheDocument();
  });

  it('com produto escolhido, troca a orientação para definir técnica e enviar logo', () => {
    render(<MockupEmptyState hasProduct />);

    expect(screen.getByRole('heading', { name: 'Quase pronto!' })).toBeInTheDocument();
    expect(
      screen.getByText('Agora defina a técnica e envie o logo para visualizar o resultado aqui.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Selecione um produto' })).not.toBeInTheDocument();
  });

  it('lista os quatro passos do fluxo, na ordem', () => {
    const { container } = render(<MockupEmptyState />);

    const rows = Array.from(container.querySelectorAll('div.rounded-xl'));
    const labels = rows.map((row) => row.querySelector('span')?.textContent);

    expect(labels).toEqual(STEP_LABELS);
  });

  it('destaca só o passo atual (currentStep) e não os demais', () => {
    render(<MockupEmptyState currentStep={3} />);

    const active = stepRow('Defina a técnica');
    expect(active.className).toContain('ring-1');
    expect(active.className).toContain('ring-primary/10');

    expect(stepRow('Selecione a empresa').className).not.toContain('ring-1');
    expect(stepRow('Escolha o produto').className).not.toContain('ring-1');
    expect(stepRow('Faça upload do logo').className).not.toContain('ring-1');
  });

  it('marca com OK somente os passos já preenchidos', () => {
    render(<MockupEmptyState hasClient hasProduct />);

    const clientRow = stepRow('Selecione a empresa');
    const productRow = stepRow('Escolha o produto');

    expect(clientRow).toHaveTextContent('OK');
    expect(productRow).toHaveTextContent('OK');
    expect(stepRow('Defina a técnica')).not.toHaveTextContent('OK');
    expect(stepRow('Faça upload do logo')).not.toHaveTextContent('OK');

    // O selo "OK" anda junto do tratamento de sucesso do passo concluído.
    expect(clientRow.className).toContain('bg-success/10');
    expect(stepRow('Defina a técnica').className).not.toContain('bg-success/10');
  });

  it('mostra o selo de produto pronto apenas quando há produto escolhido', () => {
    const { container } = render(<MockupEmptyState hasProduct />);
    expect(container.querySelector('.animate-bounce-subtle')).not.toBeNull();
  });

  it('sem produto, não mostra o selo de produto pronto', () => {
    const { container } = render(<MockupEmptyState />);
    expect(container.querySelector('.animate-bounce-subtle')).toBeNull();
  });
});
