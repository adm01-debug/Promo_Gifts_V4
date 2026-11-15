/**
 * A11y do cartão "Empresa" do Magic Up (E-22) — contrato travado:
 *  1. o botão que remove a empresa selecionada tem nome acessível
 *     "Remover empresa" (antes: "Fechar", que não diz o que fecha);
 *  2. clicar NÃO limpa a seleção: abre confirmação antes de limpar;
 *  3. só o "Remover" da confirmação limpa (volta o campo de busca);
 *     "Cancelar" mantém a empresa selecionada.
 *
 * Integração real: MagicUpConfigPanel com o estado real do useMagicUpState
 * (searchCrm mockado) — sem stub de props e sem mock do próprio componente.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { renderWithProviders } from './render-helpers';

// Empresa do CRM devolvida pela busca (searchCrm) — o nome exibido vem de
// getCompanyDisplayName (title > nome_fantasia > razao_social).
vi.mock('@/lib/crm-db', () => ({
  searchCrm: vi.fn().mockResolvedValue([
    {
      id: 'crm-empresa-1',
      razao_social: 'ACME BRINDES LTDA',
      nome_fantasia: 'Acme Brindes',
      ramo_atividade: 'Brindes corporativos',
      logo_url: null,
    },
  ]),
  selectCrmById: vi.fn().mockResolvedValue(null),
}));

// useMagicUpState chama useAriaLive transitivamente; o wrapper padrão não
// envolve com AriaLiveProvider (mesmo mock de pages/MagicUp.test.tsx).
vi.mock('@/components/a11y/AriaLive', async () => {
  const actual = await vi.importActual<typeof import('@/components/a11y/AriaLive')>(
    '@/components/a11y/AriaLive',
  );
  return {
    ...actual,
    useAriaLive: () => ({
      announce: vi.fn(),
      announceStatus: vi.fn(),
      announceAlert: vi.fn(),
      announceProgress: vi.fn(),
    }),
  };
});

vi.mock('@/hooks/mockup/useMockupTechniques', () => ({
  useProductCustomizationOptionsForMockup: vi.fn().mockReturnValue({
    techniques: [],
    loading: false,
  }),
}));

// Filhos pesados: não fazem parte do contrato deste teste.
vi.mock('@/components/mockup/ProductSearchCombobox', () => ({
  ProductSearchCombobox: () => <div data-testid="product-search" />,
}));
vi.mock('@/components/magic-up/PromptBank', () => ({
  PromptBank: () => <div data-testid="prompt-bank" />,
}));
vi.mock('@/components/magic-up/PromptGenerator', () => ({
  PromptGenerator: () => <div data-testid="prompt-generator" />,
}));

import { MagicUpConfigPanel } from '@/pages/magic-up/MagicUpConfigPanel';
import { useMagicUpState } from '@/hooks/intelligence';

function ConfigPanelHarness() {
  const m = useMagicUpState();
  return <MagicUpConfigPanel m={m} />;
}

/** Busca e seleciona a empresa do CRM mockado, como o usuário faz na tela. */
async function selectCompany() {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText('Buscar empresa por nome...'), 'acme');
  const option = await screen.findByRole('button', { name: /Acme Brindes/ }, { timeout: 3000 });
  await user.click(option);
  return { user };
}

describe('MagicUpConfigPanel — remover empresa selecionada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dá ao botão o nome acessível 'Remover empresa' e exige confirmação antes de limpar", async () => {
    renderWithProviders(<ConfigPanelHarness />);
    const { user } = await selectCompany();

    // (1) nome acessível correto — e o rótulo antigo "Fechar" não existe mais.
    const removeButton = screen.getByRole('button', { name: 'Remover empresa' });
    expect(screen.queryByRole('button', { name: 'Fechar' })).toBeNull();

    // (2) clicar abre a confirmação e AINDA NÃO limpa a empresa selecionada.
    await user.click(removeButton);
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByTestId('magic-up-remove-client-title')).toHaveTextContent(
      'Remover empresa?',
    );
    expect(
      screen.getByRole('button', { name: 'Remover empresa', hidden: true }),
    ).toBeInTheDocument();

    // (3) só o "Remover" da confirmação limpa: volta o campo de busca.
    await user.click(within(dialog).getByRole('button', { name: 'Remover' }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Remover empresa', hidden: true })).toBeNull();
    });
    expect(screen.getByPlaceholderText('Buscar empresa por nome...')).toBeInTheDocument();
  });

  it('cancelar a confirmação mantém a empresa selecionada', async () => {
    renderWithProviders(<ConfigPanelHarness />);
    const { user } = await selectCompany();

    await user.click(screen.getByRole('button', { name: 'Remover empresa' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());

    const removeButton = screen.getByRole('button', { name: 'Remover empresa' });
    expect(removeButton.parentElement).toHaveTextContent('Acme Brindes');
  });
});
