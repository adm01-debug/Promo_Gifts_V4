/**
 * Resgatado de `salvo/codex-fix-gate1-kit-pdf-types-261109-2252`
 * (`tests/components/QuoteTemplatePreservation.test.tsx`), adaptado ao contrato
 * que a main tem hoje.
 *
 * O arquivo original exercitava também `items_error`/`items_data`, campos de um
 * adaptador de validação que existe só naquela branch e que a main nunca teve.
 * Aquela parte NÃO foi portada aqui — está registrada como pendência separada
 * em `docs/agentes/resgates/`. O que foi portado é o caso que bate com a main e
 * que apontava um defeito real:
 *
 *   quando `createTemplate`/`updateTemplate` falham e devolvem `null`,
 *   o vendedor NÃO pode perder o que digitou.
 *
 * Antes da correção, `QuoteTemplateForm` chamava `onSave?.(result)` solto, com
 * `result` nulo. Os dois consumidores ignoram o argumento e fecham a tela
 * (`QuoteTemplatesPage.tsx:139` volta para a lista, `SaveAsTemplateButton.tsx:38`
 * fecha o diálogo), então nome e observações iam embora e a única pista era um
 * toast que sumia.
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteTemplateForm } from '@/components/quotes/QuoteTemplateForm';
import type {
  CreateTemplateInput,
  QuoteTemplate,
  QuoteTemplateItem,
} from '@/hooks/quotes/useQuoteTemplates';

const hook = vi.hoisted(() => ({
  templates: [] as QuoteTemplate[],
  allTemplates: [] as QuoteTemplate[],
  sellers: [] as unknown[],
  loading: false,
  isAdmin: false,
  error: null as string | null,
  createTemplate: vi.fn<(input: CreateTemplateInput) => Promise<QuoteTemplate | null>>(),
  updateTemplate:
    vi.fn<(id: string, input: Partial<CreateTemplateInput>) => Promise<QuoteTemplate | null>>(),
  deleteTemplate: vi.fn(),
  setDefaultTemplate: vi.fn(),
  duplicateTemplate: vi.fn(),
  cloneTemplateToSeller: vi.fn(),
  fetchTemplates: vi.fn(),
}));
vi.mock('@/hooks/quotes/useQuoteTemplates', async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  return { ...real, useQuoteTemplates: () => hook };
});

const validItem: QuoteTemplateItem = {
  productId: 'p1',
  productName: 'Caneca',
  quantity: 2,
  unitPrice: 25,
} as QuoteTemplateItem;

function template(): QuoteTemplate {
  return {
    id: 't1',
    seller_id: 'seller',
    name: 'Trabalho parcial',
    is_default: false,
    discount_percent: 0,
    discount_amount: 0,
    validity_days: 30,
    description: null,
    notes: null,
    internal_notes: null,
    payment_terms: null,
    delivery_time: null,
    items: [validItem],
    created_at: '2026-11-10T00:00:00Z',
    updated_at: '2026-11-10T00:00:00Z',
  } as unknown as QuoteTemplate;
}

beforeEach(() => {
  vi.clearAllMocks();
  hook.createTemplate.mockResolvedValue(template());
  hook.updateTemplate.mockResolvedValue(template());
});
afterEach(cleanup);

describe('QuoteTemplateForm preserva o trabalho digitado quando a gravação falha', () => {
  it.each(['create', 'update'] as const)(
    'mantém nome e observações na tela quando o %s devolve null',
    async (operacao) => {
      hook.createTemplate.mockResolvedValue(null);
      hook.updateTemplate.mockResolvedValue(null);
      const onSave = vi.fn();

      const view = render(
        <QuoteTemplateForm
          template={operacao === 'update' ? template() : undefined}
          initialItems={[validItem]}
          onSave={onSave}
        />,
      );

      fireEvent.change(screen.getByLabelText('Nome do Template *'), {
        target: { value: 'Nome ainda editando' },
      });
      fireEvent.change(screen.getByLabelText('Observações para o Cliente'), {
        target: { value: 'Texto parcial importante' },
      });

      await act(async () => {
        fireEvent.submit(view.container.querySelector('form')!);
      });

      await waitFor(() =>
        expect(
          operacao === 'create' ? hook.createTemplate : hook.updateTemplate,
        ).toHaveBeenCalledOnce(),
      );

      // O ponto do teste: a falha NÃO pode fechar a tela.
      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Nome do Template *')).toHaveValue('Nome ainda editando');
      expect(screen.getByLabelText('Observações para o Cliente')).toHaveValue(
        'Texto parcial importante',
      );
      // E dá para tentar de novo sem redigitar.
      expect(
        screen.getByRole('button', {
          name: operacao === 'create' ? 'Criar Template' : 'Salvar Alterações',
        }),
      ).toBeEnabled();
    },
  );

  it('chama onSave com o template salvo quando a gravação dá certo', async () => {
    const salvo = template();
    hook.createTemplate.mockResolvedValue(salvo);
    const onSave = vi.fn();

    const view = render(<QuoteTemplateForm initialItems={[validItem]} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Nome do Template *'), {
      target: { value: 'Template válido' },
    });

    await act(async () => {
      fireEvent.submit(view.container.querySelector('form')!);
    });

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(salvo));
    // Guarda contra "consertar" o bug deixando de chamar onSave sempre: o
    // caminho feliz TEM de continuar fechando a tela.
    expect(onSave).toHaveBeenCalledOnce();
  });
});
