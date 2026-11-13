import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteTemplateForm } from '@/components/quotes/QuoteTemplateForm';
import { QuoteTemplatesList } from '@/components/quotes/QuoteTemplatesList';
import { AdminTemplatesManager } from '@/components/quotes/AdminTemplatesManager';
import type {
  CreateTemplateInput,
  QuoteTemplate,
  QuoteTemplateItem,
} from '@/hooks/useQuoteTemplates';

const hook = vi.hoisted(() => ({
  templates: [] as QuoteTemplate[],
  allTemplates: [] as QuoteTemplate[],
  sellers: [{ id: 'seller', full_name: 'Vendedora', email: 'seller@example.com' }],
  loading: false,
  isAdmin: true,
  createTemplate: vi.fn<(input: CreateTemplateInput) => Promise<QuoteTemplate | null>>(),
  updateTemplate:
    vi.fn<(id: string, input: Partial<CreateTemplateInput>) => Promise<QuoteTemplate | null>>(),
  deleteTemplate: vi.fn(),
  setDefaultTemplate: vi.fn(),
  duplicateTemplate: vi.fn(),
  cloneTemplateToSeller: vi.fn(),
}));
vi.mock('@/hooks/useQuoteTemplates', () => ({ useQuoteTemplates: () => hook }));
vi.mock('@/utils/templateExport', () => ({
  exportTemplatesToJson: vi.fn(),
  exportSingleTemplate: vi.fn(),
}));
const validItem: QuoteTemplateItem = {
  productId: 'p1',
  productName: 'Caneca',
  quantity: 2,
  unitPrice: 25,
};
function template(valid = true): QuoteTemplate {
  const fields = {
    id: 't1',
    seller_id: 'seller',
    name: 'Trabalho parcial',
    is_default: false,
    template_data: { futureMetadata: true },
    discount_percent: 0,
    discount_amount: 0,
    validity_days: 30,
    description: null,
    notes: null,
    internal_notes: null,
    payment_terms: null,
    delivery_time: null,
    created_at: '2026-11-10T00:00:00Z',
    updated_at: '2026-11-10T00:00:00Z',
  };
  return valid
    ? { ...fields, items: [validItem], items_data: [validItem], items_error: null }
    : {
        ...fields,
        items: [validItem, { productName: 'Planejado', futurePrice: true }],
        items_data: null,
        items_error:
          'O item 2 contém dados incompletos ou inválidos. Os dados originais foram preservados.',
      };
}
beforeEach(() => {
  vi.clearAllMocks();
  hook.templates = [];
  hook.allTemplates = [];
  hook.createTemplate.mockResolvedValue(template());
  hook.updateTemplate.mockResolvedValue(template());
});
afterEach(cleanup);

describe('template form preserves incomplete work and failure state', () => {
  it('shows the original error, blocks both normal and direct form submission, and does not invent a zero total', async () => {
    const saved = vi.fn();
    const raw = template(false);
    const view = render(
      <QuoteTemplateForm template={raw} initialItems={[validItem]} onSave={saved} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(raw.items_error!);
    expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toBeDisabled();
    await act(async () => fireEvent.submit(view.container.querySelector('form')!));
    expect(hook.updateTemplate).not.toHaveBeenCalled();
    expect(hook.createTemplate).not.toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();
    expect(screen.queryByText(/^R\$\s*0,00$/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nome do Template *')).toHaveValue('Trabalho parcial');
    expect(raw.items).toHaveLength(2);
  });
  it.each(['create', 'update'] as const)(
    'keeps the form and notes when the %s backend returns null',
    async (operation) => {
      hook.createTemplate.mockResolvedValue(null);
      hook.updateTemplate.mockResolvedValue(null);
      const saved = vi.fn();
      const view = render(
        <QuoteTemplateForm
          template={operation === 'update' ? template() : undefined}
          initialItems={[validItem]}
          onSave={saved}
        />,
      );
      fireEvent.change(screen.getByLabelText('Nome do Template *'), {
        target: { value: 'Nome ainda editando' },
      });
      fireEvent.change(screen.getByLabelText('Observações para o Cliente'), {
        target: { value: 'Texto parcial importante' },
      });
      await act(async () => fireEvent.submit(view.container.querySelector('form')!));
      await waitFor(() =>
        expect(
          operation === 'create' ? hook.createTemplate : hook.updateTemplate,
        ).toHaveBeenCalledOnce(),
      );
      expect(saved).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Nome do Template *')).toHaveValue('Nome ainda editando');
      expect(screen.getByLabelText('Observações para o Cliente')).toHaveValue(
        'Texto parcial importante',
      );
      expect(
        screen.getByRole('button', {
          name: operation === 'create' ? 'Criar Template' : 'Salvar Alterações',
        }),
      ).toBeEnabled();
    },
  );
  it('saves a valid template with the original payload and returns the real saved result', async () => {
    const saved = vi.fn();
    const result = template();
    hook.createTemplate.mockResolvedValue(result);
    const view = render(<QuoteTemplateForm initialItems={[validItem]} onSave={saved} />);
    fireEvent.change(screen.getByLabelText('Nome do Template *'), {
      target: { value: 'Template válido' },
    });
    await act(async () => fireEvent.submit(view.container.querySelector('form')!));
    expect(hook.createTemplate).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ name: 'Template válido', items_data: [validItem] }),
    );
    expect(saved).toHaveBeenCalledExactlyOnceWith(result);
  });
});

describe('template list and admin preserve raw partial collections', () => {
  it('keeps the incomplete template visible, reports its raw count/value, and never applies it', () => {
    hook.templates = [template(false)];
    const apply = vi.fn();
    render(<QuoteTemplatesList selectionMode onApplyTemplate={apply} />);
    expect(screen.getByText('Trabalho parcial')).toBeInTheDocument();
    expect(screen.getByText(/dados incompletos ou inválidos/)).toBeInTheDocument();
    expect(screen.getByText(/2 itens/)).toBeInTheDocument();
    expect(screen.getByText('Valor indisponível')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Trabalho parcial'));
    expect(apply).not.toHaveBeenCalled();
    expect(screen.queryByText(/^R\$\s*0,00$/)).not.toBeInTheDocument();
  });
  it('preserves applying a valid template once', () => {
    const data = template();
    hook.templates = [data];
    const apply = vi.fn();
    render(<QuoteTemplatesList selectionMode onApplyTemplate={apply} />);
    fireEvent.click(screen.getByText('Trabalho parcial'));
    expect(apply).toHaveBeenCalledExactlyOnceWith(data);
  });
  it('shows raw count and an unavailable value for incomplete templates in both admin views', () => {
    hook.allTemplates = [template(false)];
    render(<AdminTemplatesManager />);
    expect(screen.getByText('Trabalho parcial')).toBeInTheDocument();
    expect(screen.getByText('Valor indisponível')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Grid' }));
    expect(screen.getByText(/2 itens/)).toBeInTheDocument();
    expect(screen.getByText('Valor indisponível')).toBeInTheDocument();
    expect(screen.queryByText(/^R\$\s*0,00$/)).not.toBeInTheDocument();
  });
});

describe.each([{ view: 'list' }, { view: 'admin' }])(
  '$view action failure preserves dialog state',
  ({ view }) => {
    function renderView() {
      hook.templates = [template()];
      hook.allTemplates = [template()];
      return render(view === 'list' ? <QuoteTemplatesList /> : <AdminTemplatesManager />);
    }

    async function openMenuAction(name: string) {
      fireEvent.keyDown(screen.getByRole('button', { name: 'Mais opções' }), { key: 'Enter' });
      fireEvent.click(await screen.findByRole('menuitem', { name }));
    }

    it('retains the selected seller and open clone dialog after a refused copy', async () => {
      hook.cloneTemplateToSeller.mockResolvedValue(null);
      renderView();
      await openMenuAction('Clonar para Vendedor');
      const dialog = await screen.findByRole('dialog');
      fireEvent.keyDown(within(dialog).getByRole('combobox'), { key: 'Enter' });
      fireEvent.keyDown(await screen.findByRole('option', { name: 'Vendedora' }), { key: 'Enter' });
      const confirm = within(dialog).getByRole('button', { name: /^Clonar(?: Template)?$/ });
      expect(confirm).toBeEnabled();
      await act(async () => {
        fireEvent.click(confirm);
        await Promise.resolve();
      });
      expect(hook.cloneTemplateToSeller).toHaveBeenCalledWith('t1', 'seller');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(within(screen.getByRole('dialog')).getByRole('combobox')).toHaveTextContent(
        'Vendedora',
      );
    });

    it('keeps the delete confirmation open when no row was deleted', async () => {
      hook.deleteTemplate.mockResolvedValue(false);
      renderView();
      await openMenuAction('Excluir');
      const dialog = await screen.findByRole('alertdialog');
      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: /^Excluir(?: Template)?$/ }));
        await Promise.resolve();
      });
      expect(hook.deleteTemplate).toHaveBeenCalledWith('t1');
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      fireEvent.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }),
      );
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('closes the delete confirmation after a confirmed deletion', async () => {
      hook.deleteTemplate.mockResolvedValue(true);
      renderView();
      await openMenuAction('Excluir');
      const dialog = await screen.findByRole('alertdialog');
      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: /^Excluir(?: Template)?$/ }));
        await Promise.resolve();
      });
      expect(hook.deleteTemplate).toHaveBeenCalledWith('t1');
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  },
);
