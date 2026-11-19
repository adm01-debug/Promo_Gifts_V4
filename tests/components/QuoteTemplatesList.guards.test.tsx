/**
 * Resgatado de `salvo/codex-fix-gate1-kit-pdf-types-261109-2252`
 * (`tests/components/QuoteTemplatePreservation.test.tsx`, casos L145-156 e
 * L192-240), adaptado ao contrato da main.
 *
 * A main não tinha NENHUM teste de componente das telas de template — só de
 * hook e de função pura. Por isso estes dois comportamentos podiam quebrar sem
 * nada ficar vermelho:
 *
 *   1. clique aplicava template com item ilegível no orçamento do cliente;
 *   2. a confirmação de exclusão sumia da tela mesmo quando o banco recusava,
 *      porque o `AlertDialogAction` do Radix fecha o diálogo sozinho.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteTemplatesList } from '@/components/quotes/QuoteTemplatesList';
import { TemplateDeleteDialog } from '@/components/quotes/AdminTemplateDialogs';
import type { QuoteTemplate } from '@/hooks/quotes/useQuoteTemplates';

const toastSpy = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/ui', async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  return { ...real, useToast: () => ({ toast: toastSpy }) };
});

const hook = vi.hoisted(() => ({
  templates: [] as QuoteTemplate[],
  allTemplates: [] as QuoteTemplate[],
  sellers: [] as unknown[],
  loading: false,
  isAdmin: false,
  error: null as string | null,
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  setDefaultTemplate: vi.fn(),
  duplicateTemplate: vi.fn(),
  cloneTemplateToSeller: vi.fn(),
  fetchTemplates: vi.fn(),
  fetchAllTemplates: vi.fn(),
}));
vi.mock('@/hooks/quotes/useQuoteTemplates', async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  return { ...real, useQuoteTemplates: () => hook };
});
vi.mock('@/utils/templateExport', () => ({
  exportTemplatesToJson: vi.fn(),
  exportSingleTemplate: vi.fn(),
}));

function template(over: Record<string, unknown> = {}): QuoteTemplate {
  return {
    id: 't1',
    seller_id: 'vendedora-1',
    name: 'Template de teste',
    description: null,
    is_default: false,
    items: [{ productId: 'p1', productName: 'Caneca', quantity: 2, unitPrice: 25 }],
    discount_percent: 0,
    discount_amount: 0,
    notes: null,
    internal_notes: null,
    payment_terms: null,
    delivery_time: null,
    validity_days: 30,
    created_at: '2026-11-10T00:00:00Z',
    updated_at: '2026-11-10T00:00:00Z',
    ...over,
  } as unknown as QuoteTemplate;
}

beforeEach(() => {
  vi.clearAllMocks();
  hook.templates = [template()];
});
afterEach(cleanup);

describe('QuoteTemplatesList não aplica template incompleto', () => {
  it('template com item ilegível não é aplicado e o vendedor é avisado', () => {
    hook.templates = [
      template({
        items: [
          { productId: 'p1', productName: 'Caneca', quantity: 2, unitPrice: 25 },
          // quantidade ilegível: é o que fazia o total virar NaN no orçamento
          { productId: 'p2', productName: 'Boné', quantity: 'dois', unitPrice: 30 },
        ],
      }),
    ];
    const onApplyTemplate = vi.fn();
    render(<QuoteTemplatesList selectionMode onApplyTemplate={onApplyTemplate} />);

    fireEvent.click(screen.getByText('Template de teste'));

    expect(onApplyTemplate).not.toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', title: 'Template incompleto' }),
    );
  });

  it('template íntegro continua sendo aplicado no clique', () => {
    const onApplyTemplate = vi.fn();
    render(<QuoteTemplatesList selectionMode onApplyTemplate={onApplyTemplate} />);

    fireEvent.click(screen.getByText('Template de teste'));

    // Guarda contra "consertar" bloqueando tudo: o caminho feliz tem de seguir.
    expect(onApplyTemplate).toHaveBeenCalledOnce();
    expect(toastSpy).not.toHaveBeenCalled();
  });
});

describe('TemplateDeleteDialog deixa quem chamou decidir se fecha', () => {
  it('confirmar dispara a exclusão e NÃO fecha o diálogo por conta própria', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<TemplateDeleteDialog open onClose={onClose} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    // Este é o ponto: sem o preventDefault, o Radix fecharia aqui e a guarda
    // de sucesso em handleDelete não adiantaria nada.
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cancelar continua fechando normalmente', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<TemplateDeleteDialog open onClose={onClose} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
