/**
 * Etapa 078 (ACH-029): as telas de template precisam MOSTRAR a falha.
 *
 * `useQuoteTemplates` ja expunha `error` (`useQuoteTemplates.ts:110-111`) e
 * nenhum consumidor lia: com o banco recusando, as duas telas caiam no vazio
 * legitimo ("Nenhum template encontrado" / "Não há templates cadastrados"),
 * que sugere ausencia de dados em vez de falha de leitura.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuoteTemplatesList } from '../QuoteTemplatesList';
import { AdminTemplatesManager } from '../AdminTemplatesManager';

const h = vi.hoisted(() => ({ error: null as string | null }));

vi.mock('@/hooks/quotes/useQuoteTemplates', () => ({
  useQuoteTemplates: () => ({
    templates: [],
    allTemplates: [],
    sellers: [],
    loading: false,
    error: h.error,
    deleteTemplate: vi.fn(),
    setDefaultTemplate: vi.fn(),
    duplicateTemplate: vi.fn(),
    cloneTemplateToSeller: vi.fn(),
    isAdmin: true,
    fetchTemplates: vi.fn(),
    fetchAllTemplates: vi.fn(),
  }),
}));

vi.mock('@/hooks/ui', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('telas de template — erro não pode virar lista vazia', () => {
  beforeEach(() => {
    h.error = null;
  });

  it('QuoteTemplatesList mostra falha quando o hook tem error', () => {
    h.error = 'Erro ao carregar templates';
    render(<QuoteTemplatesList />);
    expect(screen.getByText('Não foi possível carregar os templates')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum template encontrado')).not.toBeInTheDocument();
  });

  it('QuoteTemplatesList mantem o vazio legitimo quando nao ha error', () => {
    render(<QuoteTemplatesList />);
    expect(screen.getByText('Nenhum template encontrado')).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível carregar os templates')).not.toBeInTheDocument();
  });

  it('AdminTemplatesManager mostra falha quando o hook tem error', () => {
    h.error = 'Erro ao carregar templates';
    render(<AdminTemplatesManager />);
    expect(screen.getByText('Não foi possível carregar os templates')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum template encontrado')).not.toBeInTheDocument();
  });

  it('AdminTemplatesManager mantem o vazio legitimo quando nao ha error', () => {
    render(<AdminTemplatesManager />);
    expect(screen.getByText('Nenhum template encontrado')).toBeInTheDocument();
  });
});
