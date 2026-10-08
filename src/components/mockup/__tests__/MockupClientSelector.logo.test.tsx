/**
 * MockupClientSelector.logo — ação "Usar logo do cliente"
 *
 * Escolher uma empresa COM logo do CRM oferece a ação; ao acioná-la a imagem baixada
 * vira um File e entra no MESMO caminho do upload manual (onLogoUpload →
 * handleAreaLogoUpload) na área ativa. Empresa sem logo não oferece a ação e falha ao
 * baixar não mexe no cliente nem no produto já escolhidos.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { toast } from 'sonner';
import { MockupConfigPanel, type MockupClient } from '@/components/mockup/MockupConfigPanel';
import type { MockupProductSelection } from '@/components/mockup/MockupProductSelector';
import type { PersonalizationArea } from '@/components/mockup/MultiAreaManager';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
vi.mock('@/lib/telemetry/structuredLogger', () => ({
  createClientLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
// ArtFileUpload (importado pelo painel) puxa o client Supabase real.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), functions: { invoke: vi.fn() }, storage: { from: vi.fn() } },
}));
vi.mock('@/components/mockup/MultiAreaManager', () => ({ MultiAreaManager: () => null }));
vi.mock('@/components/mockup/MockupProductSelector', () => ({
  MockupProductSelector: ({ selection }: { selection: MockupProductSelection | null }) =>
    selection ? <span data-testid="mocked-product">{selection.product.name}</span> : null,
}));

vi.mock('@/hooks/crm', () => ({
  useCrmInfiniteCompanySelector: () => ({
    data: {
      pages: [
        {
          records: [
            {
              id: 'company-1',
              name: 'Empresa Com Logo',
              razao_social: 'Empresa Com Logo Ltda',
              ramo: 'Brindes',
              cnpj: '12345678000199',
              logo_url: 'https://crm.example.com/logo.png',
            },
            { id: 'company-2', name: 'Empresa Sem Logo', logo_url: null },
          ],
        },
      ],
    },
    isLoading: false,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/hooks/common', () => ({
  useClientFuzzySearch: (clients: unknown[]) => ({ results: clients, hasSearch: false }),
}));

const AREA = {
  id: 'area-1',
  name: 'Frente',
  logoPreview: null,
  positionX: 50,
  positionY: 50,
  logoWidth: 5,
  logoHeight: 3,
  logoScale: 100,
} as PersonalizationArea;

const PRODUCT = { product: { name: 'Caneca 325ml' } } as MockupProductSelection;

function Harness({
  onLogoUpload,
  productSelection = null,
}: {
  onLogoUpload: (areaId: string, file: File) => void;
  productSelection?: MockupProductSelection | null;
}) {
  const [selectedClient, setSelectedClient] = useState<MockupClient | null>(null);
  return (
    <MockupConfigPanel
      techniques={[]}
      productSelection={productSelection}
      selectedTechnique={null}
      selectedClient={selectedClient}
      isLoadingData={false}
      personalizationAreas={[AREA]}
      onProductSelect={vi.fn()}
      onTechniqueSelect={vi.fn()}
      onClientSelect={setSelectedClient}
      onReset={vi.fn()}
      filteredTechniques={[]}
      activeAreaId="area-1"
      onAreasChange={vi.fn()}
      onActiveAreaChange={vi.fn()}
      onLogoUpload={onLogoUpload}
      productLocations={null}
      artAttachments={[]}
      onArtAttachmentsChange={vi.fn()}
    />
  );
}

function renderPanel(onLogoUpload: (areaId: string, file: File) => void, productSelection = null) {
  return render(
    <TooltipProvider>
      <Harness onLogoUpload={onLogoUpload} productSelection={productSelection} />
    </TooltipProvider>,
  );
}

/** Escolhe a empresa pelo id no seletor REAL, deixando o chip na tela. */
async function chooseCompany(companyId: string) {
  fireEvent.focus((await screen.findAllByTestId('mockup-client-search-input'))[0]);
  fireEvent.click((await screen.findAllByTestId(`mockup-client-option-${companyId}`))[0]);
}

const useLogoButtons = () => screen.findAllByTestId('mockup-client-use-logo');

describe('MockupClientSelector — usar logo do cliente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ao escolher empresa com logo do CRM aparece a ação "Usar logo do cliente"', async () => {
    renderPanel(vi.fn());

    await chooseCompany('company-1');

    expect((await useLogoButtons())[0]).toHaveTextContent('Usar logo do cliente');
  });

  it('ao acionar, baixa a logo e aplica na área ativa pelo caminho do upload (File validado)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(['x'], { type: 'image/png' })),
    });
    vi.stubGlobal('fetch', fetchMock);
    const onLogoUpload = vi.fn();
    renderPanel(onLogoUpload);

    await chooseCompany('company-1');
    fireEvent.click((await useLogoButtons())[0]);

    await waitFor(() => expect(onLogoUpload).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('https://crm.example.com/logo.png');

    const [areaId, file] = onLogoUpload.mock.calls.at(0) ?? [];
    expect(areaId).toBe('area-1');
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe('image/png');
  });

  it('empresa sem logo não oferece a ação e não dispara erro de upload', async () => {
    renderPanel(vi.fn());

    await chooseCompany('company-2');

    expect((await screen.findAllByTestId('mockup-client-chip')).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('mockup-client-use-logo')).not.toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('falha ao carregar a imagem mantém o cliente e o produto e não aplica nada', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const onLogoUpload = vi.fn();
    renderPanel(onLogoUpload, PRODUCT);

    await chooseCompany('company-1');
    fireEvent.click((await useLogoButtons())[0]);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));

    expect(onLogoUpload).not.toHaveBeenCalled();
    // Cliente e produto continuam intactos (nada foi limpo/alterado).
    expect(screen.getAllByTestId('mockup-client-chip')[0]).toHaveTextContent('Empresa Com Logo');
    expect(screen.getAllByTestId('mocked-product')[0]).toHaveTextContent('Caneca 325ml');
  });
});
