import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({ padrao: 3 as number | null }));

vi.mock('@/hooks/products/useSupplierDefaultLeadTime', () => ({
  useSupplierDefaultLeadTime: () => ({ data: hoisted.padrao }),
}));

import { ProductInfoSection } from '../sections/ProductInfoSection';
import { ProductPackagingSection } from '../sections/ProductPackagingSection';
import { TooltipProvider } from '@/components/ui/tooltip';

type Valores = Record<string, unknown>;

function propsDeFormulario(valores: Valores, setValue = vi.fn()) {
  return {
    register: () => ({ name: 'x', onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() }),
    setValue,
    watch: (campo: string) => valores[campo],
    errors: {},
    numericProps: () => ({ type: 'number' }),
  };
}

describe('Prazo de liberação do fornecedor (etapa 38)', () => {
  const infoProps = {
    skuStatus: 'idle' as const,
    duplicateName: '',
    skuManuallyEdited: false,
    onSkuManualEdit: vi.fn(),
  };

  it('mostra o rótulo novo, o padrão do fornecedor e o selo "padrão" quando o produto está vazio', () => {
    hoisted.padrao = 3;
    render(
      <TooltipProvider>
        <ProductInfoSection
          {...infoProps}
          {...propsDeFormulario({ supplier_id: 'f1', lead_time_days: null })}
        />
      </TooltipProvider>,
    );
    expect(screen.getByText('Prazo de liberação do fornecedor (dias úteis)')).toBeTruthy();
    expect(screen.getByText(/Padrão do fornecedor: 3 dias úteis/)).toBeTruthy();
    expect(screen.getByText('padrão')).toBeTruthy();
  });

  it('mostra o selo "exceção" quando o prazo do produto difere do padrão (7 ≠ 3)', () => {
    hoisted.padrao = 3;
    render(
      <TooltipProvider>
        <ProductInfoSection
          {...infoProps}
          {...propsDeFormulario({ supplier_id: 'f1', lead_time_days: 7 })}
        />
      </TooltipProvider>,
    );
    expect(screen.getByText('exceção')).toBeTruthy();
  });

  it('na exceção, "Usar padrão do fornecedor" limpa o prazo do produto (vira null)', () => {
    hoisted.padrao = 3;
    const setValue = vi.fn();
    render(
      <TooltipProvider>
        <ProductInfoSection
          {...infoProps}
          {...propsDeFormulario({ supplier_id: 'f1', lead_time_days: 7 }, setValue)}
        />
      </TooltipProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Usar padrão do fornecedor' }));
    expect(setValue).toHaveBeenCalledWith('lead_time_days', null, {
      shouldDirty: true,
      shouldValidate: true,
    });
  });

  it.each([
    { prazo: null, descricao: 'vazio (herda o padrão)' },
    { prazo: 3, descricao: 'igual ao padrão de 3 dias' },
  ])('sem exceção ($descricao) o botão não aparece', ({ prazo }) => {
    hoisted.padrao = 3;
    render(
      <TooltipProvider>
        <ProductInfoSection
          {...infoProps}
          {...propsDeFormulario({ supplier_id: 'f1', lead_time_days: prazo })}
        />
      </TooltipProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Usar padrão do fornecedor' })).toBeNull();
  });

  it('não mostra a linha do padrão quando o fornecedor não tem prazo cadastrado', () => {
    hoisted.padrao = null;
    render(
      <TooltipProvider>
        <ProductInfoSection
          {...infoProps}
          {...propsDeFormulario({ supplier_id: 'f1', lead_time_days: null })}
        />
      </TooltipProvider>,
    );
    expect(screen.queryByText(/Padrão do fornecedor/)).toBeNull();
  });
});

describe('Switch "Não mistura com outros itens" (etapa 33)', () => {
  it.each([
    { atual: false, esperado: true },
    { atual: true, esperado: false },
  ])('com ships_separately=$atual, clicar grava $esperado', ({ atual, esperado }) => {
    const setValue = vi.fn();
    render(
      <TooltipProvider>
        <ProductPackagingSection {...propsDeFormulario({ ships_separately: atual }, setValue)} />
      </TooltipProvider>,
    );
    const chave = screen
      .getAllByRole('switch')
      .find((el) => el.textContent?.includes('Não mistura com outros itens'));
    if (!chave) throw new Error('chave "Não mistura" não encontrada');
    expect(chave.getAttribute('aria-checked')).toBe(String(atual));
    fireEvent.click(chave);
    expect(setValue).toHaveBeenCalledWith('ships_separately', esperado);
  });
});
