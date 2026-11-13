import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProductMarketingData } from '../productMarketingData';

const m = vi.hoisted(() => ({
  fetchProductMarketing: vi.fn(),
  fetchProductMarketingLinks: vi.fn(),
  selectMarketingOption: vi.fn(),
  unselectMarketingOption: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../productMarketingData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../productMarketingData')>();
  return {
    ...actual,
    fetchProductMarketing: m.fetchProductMarketing,
    fetchProductMarketingLinks: m.fetchProductMarketingLinks,
    selectMarketingOption: m.selectMarketingOption,
    unselectMarketingOption: m.unselectMarketingOption,
  };
});

vi.mock('sonner', () => ({ toast: { success: m.toastSuccess, error: m.toastError } }));

import { ProductMarketingSection } from '../ProductMarketingSection';

function data(): ProductMarketingData {
  return {
    publicoAlvo: { options: [{ id: 'ta1', name: 'MÉDICO' }], links: [], loadError: null },
    datasComemorativas: {
      options: [
        { id: 'cd1', name: 'NATAL' },
        { id: 'cd2', name: 'DIA DOS PAIS' },
      ],
      links: [{ id: 'l1', optionId: 'cd2', source: 'category', isActive: true }],
      loadError: null,
    },
    endomarketing: { options: [{ id: 'em1', name: 'CIPA | SIPAT' }], links: [], loadError: null },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.fetchProductMarketing.mockResolvedValue(data());
  m.fetchProductMarketingLinks.mockResolvedValue([]);
  m.selectMarketingOption.mockResolvedValue(undefined);
  m.unselectMarketingOption.mockResolvedValue(undefined);
});

async function openGroup(label: string) {
  const user = userEvent.setup();
  await screen.findByText(label);
  const header = screen.getByText(label).closest('div');
  await user.click(header!.querySelector('button')!);
  return user;
}

describe('ProductMarketingSection', () => {
  it('mostra opções dos cadastros e selo "da categoria" no vínculo herdado', async () => {
    render(<ProductMarketingSection productId="p1" />);
    await openGroup('Datas Comemorativas');
    expect(m.fetchProductMarketing).toHaveBeenCalledWith('p1');
    expect(screen.getByLabelText('NATAL')).toBeInTheDocument();
    expect(screen.getByText('da categoria')).toBeInTheDocument();
    expect(screen.getByText('1 selecionados')).toBeInTheDocument();
  });

  it('marcar chama selectMarketingOption com o vínculo existente (ou nenhum)', async () => {
    render(<ProductMarketingSection productId="p1" />);
    const user = await openGroup('Endomarketing');
    await user.click(screen.getByLabelText('CIPA | SIPAT'));
    await waitFor(() =>
      expect(m.selectMarketingOption).toHaveBeenCalledWith('p1', 'endomarketing', 'em1', undefined),
    );
    expect(m.fetchProductMarketingLinks).toHaveBeenCalledWith('p1', 'endomarketing');
    expect(m.toastSuccess).toHaveBeenCalledWith('Adicionado');
  });

  it('desmarcar herdado chama unselectMarketingOption com o vínculo', async () => {
    render(<ProductMarketingSection productId="p1" />);
    const user = await openGroup('Datas Comemorativas');
    await user.click(screen.getByLabelText('DIA DOS PAIS'));
    await waitFor(() =>
      expect(m.unselectMarketingOption).toHaveBeenCalledWith('datasComemorativas', {
        id: 'l1',
        optionId: 'cd2',
        source: 'category',
        isActive: true,
      }),
    );
  });

  it('erro de permissão aparece com a mensagem clara', async () => {
    const { MarketingPermissionError } = await import('../productMarketingData');
    m.selectMarketingOption.mockRejectedValue(new MarketingPermissionError());
    render(<ProductMarketingSection productId="p1" />);
    const user = await openGroup('Público-Alvo');
    await user.click(screen.getByLabelText('MÉDICO'));
    await waitFor(() =>
      expect(m.toastError).toHaveBeenCalledWith('Sem permissão para editar marketing deste produto'),
    );
  });

  it('categoria que não carregou mostra o motivo sem quebrar as outras', async () => {
    const d = data();
    d.endomarketing = { options: [], links: [], loadError: 'Erro ao carregar opções: x' };
    m.fetchProductMarketing.mockResolvedValue(d);
    render(<ProductMarketingSection productId="p1" />);
    await openGroup('Endomarketing');
    expect(screen.getByText('Erro ao carregar opções: x')).toBeInTheDocument();
  });
});
