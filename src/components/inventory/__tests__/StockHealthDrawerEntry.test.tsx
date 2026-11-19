/**
 * O drawer de detalhamento já existia, montado e testado — e mesmo assim
 * ninguém conseguia abrir: `setHealthDrawerOpen(true)` não era chamado em lugar
 * nenhum (`StockDashboard.tsx:125` era a única outra menção). O gatilho morava
 * no chip "Saúde: %" do cabeçalho "Visão Geral", removido de propósito.
 *
 * Esse é o modo de falha que se repete neste repo: a função volta, o teste
 * unitário volta, e o PONTO DE ENTRADA fica para trás. Estes casos travam a
 * entrada, não só o componente.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { StockHealthDrawerEntry } from '../StockHealthDrawerEntry';
import type { ProductStockSummary } from '@/types/stock';

const produtos = [
  {
    productId: 'p1',
    productName: 'Caneca Cerâmica',
    productSku: 'CAN-001',
    totalStock: 120,
    status: 'healthy',
  },
  {
    productId: 'p2',
    productName: 'Boné Trucker',
    productSku: 'BON-002',
    totalStock: 0,
    status: 'out',
  },
] as unknown as ProductStockSummary[];

afterEach(cleanup);

describe('StockHealthDrawerEntry — a porta de entrada do drawer', () => {
  it('mostra um botão nomeado, fechado por padrão', () => {
    render(<StockHealthDrawerEntry products={produtos} />);
    expect(screen.getByTestId('stock-breakdown-trigger')).toHaveTextContent('Detalhar por faixa');
    expect(screen.queryByTestId('stock-breakdown-drawer')).not.toBeInTheDocument();
  });

  it('clicar abre o drawer que estava inalcançável', async () => {
    render(<StockHealthDrawerEntry products={produtos} />);
    fireEvent.click(screen.getByTestId('stock-breakdown-trigger'));
    await waitFor(() => expect(screen.getByTestId('stock-breakdown-drawer')).toBeInTheDocument());
  });

  it('não reintroduz nenhum dos três testids proibidos pelo cabeçalho removido', () => {
    const src = readFileSync(resolve(__dirname, '../StockHealthDrawerEntry.tsx'), 'utf-8');
    // Procura o ATRIBUTO, não a palavra solta: o doc-block deste componente cita
    // os três nomes de propósito, para explicar por que não voltam.
    for (const proibido of [
      'health-score-badge',
      'critical-alerts-badge',
      'health-score-info-trigger',
    ]) {
      expect(src).not.toContain(`data-testid="${proibido}"`);
    }
    expect(src).not.toMatch(/<HealthScoreInfoDialog\b/);
  });
});

describe('StockDashboard monta a entrada', () => {
  const SRC = readFileSync(resolve(__dirname, '../StockDashboard.tsx'), 'utf-8');

  it('renderiza <StockHealthDrawerEntry> com a base completa de produtos', () => {
    expect(SRC).toMatch(/<StockHealthDrawerEntry\s+products=\{allProductStocks \?\? productStocks\}/);
  });

  it('não sobrou estado morto do gatilho antigo', () => {
    // Era isto que deixava o drawer inalcançável: estado existia, ninguém ligava.
    expect(SRC).not.toContain('healthDrawerOpen');
  });
});
