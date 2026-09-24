import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PersonalizationConfig } from '@/components/kit-builder/PersonalizationConfig';
import type { KitItem, KitItemPersonalization } from '@/lib/kit-builder';

const REAL_LOCATIONS = {
  locations: [
    {
      location_name: 'Frente',
      location_code: 'front',
      options: [
        {
          technique_id: 'laser',
          tecnica_nome: 'Laser',
          grupo_tecnica: 'Gravação',
          codigo_tabela: 'LASER',
          max_cores: 2,
          usa_dimensao: false,
          efetiva_largura_max: 5,
          efetiva_altura_max: 5,
        },
      ],
    },
    {
      location_name: 'Lateral',
      location_code: 'side',
      options: [
        {
          technique_id: 'silk',
          tecnica_nome: 'Silk-screen',
          grupo_tecnica: 'Impressão',
          codigo_tabela: 'SILK',
          max_cores: 3,
          usa_dimensao: false,
          efetiva_largura_max: 4,
          efetiva_altura_max: 4,
        },
      ],
    },
  ],
};

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  price: vi.fn(),
  productCustomizationOptions: vi.fn(),
  kitComponentPrintAreas: vi.fn(),
}));

vi.mock('@/hooks/products', () => ({
  useProductCustomizationOptions: (...args: unknown[]) => mocks.productCustomizationOptions(...args),
}));

vi.mock('@/hooks/simulation', () => ({
  useCustomizationPriceReactive: (...args: unknown[]) => mocks.price(...args),
}));

vi.mock('@/hooks/mockup/mockupGenerationService', () => ({
  generateMockupApi: (...args: unknown[]) => mocks.generate(...args),
}));

vi.mock('@/components/admin/ImageUploadButton', () => ({
  ImageUploadButton: (props: {
    deleteOnRemove?: boolean;
    onUpload: (url: string) => void;
    onRemove: () => void;
  }) => (
    <div data-testid="artwork-control" data-delete-on-remove={String(props.deleteOnRemove)}>
      <button type="button" onClick={() => props.onUpload('https://cdn.test/new-logo.png')}>
        Trocar arte durante geração
      </button>
      <button type="button" onClick={props.onRemove}>
        Remover arte
      </button>
    </div>
  ),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

// Sem isto, o hook real dispara dbInvoke contra localhost neste harness — o
// QueryClientProvider sozinho não basta, ele só evita o crash do useQuery.
// Espiável (vi.fn) para provar o gate needsPrintAreaFallback — ver testes
// "não dispara"/"dispara" abaixo.
vi.mock('@/hooks/kit-builder/useKitBuilderQueries', () => ({
  useKitComponentPrintAreas: (...args: unknown[]) => mocks.kitComponentPrintAreas(...args),
}));

const ITEMS: KitItem[] = [
  {
    id: 'p1',
    lineId: 'line-1',
    name: 'Garrafa',
    sku: 'GAR',
    imageUrl: 'https://cdn.test/garrafa.png',
    price: 20,
    quantity: 1,
    width: 1,
    height: 1,
    depth: 1,
    volume: 1,
  },
  {
    id: 'p2',
    lineId: 'line-2',
    name: 'Caderno',
    sku: 'CAD',
    imageUrl: 'https://cdn.test/caderno.png',
    price: 30,
    quantity: 2,
    width: 1,
    height: 1,
    depth: 1,
    volume: 1,
  },
];

const CONFIG: KitItemPersonalization = {
  enabled: true,
  techniqueId: 'laser',
  techniqueName: 'Laser',
  techniqueCode: 'LASER',
  position: 'Frente',
  positionCode: 'front',
  positionName: 'Frente',
  artworkUrl: 'https://cdn.test/logo.png',
  colors: 1,
};

function Harness({ quantity = 50 }: { quantity?: number }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  const [personalizations, setPersonalizations] = useState<Record<string, KitItemPersonalization>>({
    'line-1': CONFIG,
    'line-2': CONFIG,
  });
  return (
    <QueryClientProvider client={queryClient}>
      <PersonalizationConfig
        box={null}
        items={ITEMS}
        kitQuantity={quantity}
        boxPersonalization={{ enabled: false }}
        itemPersonalizations={personalizations}
        onBoxPersonalizationChange={() => undefined}
        onItemPersonalizationChange={(id, value) =>
          setPersonalizations((current) => ({ ...current, [id]: value }))
        }
      />
      <output data-testid="personalization-state">{JSON.stringify(personalizations)}</output>
    </QueryClientProvider>
  );
}

describe('PersonalizationConfig async behavior', () => {
  beforeEach(() => {
    mocks.generate.mockReset();
    mocks.price.mockReset();
    mocks.price.mockImplementation((_technique, quantity: number) => ({
      loading: false,
      price: {
        success: true,
        preco_unitario: 2,
        setup_total: 10,
        total_cobrado: quantity * 2 + 10,
      },
    }));
    mocks.productCustomizationOptions.mockReset();
    mocks.productCustomizationOptions.mockReturnValue({ data: REAL_LOCATIONS, isLoading: false });
    mocks.kitComponentPrintAreas.mockReset();
    mocks.kitComponentPrintAreas.mockReturnValue({ data: [], isLoading: false });
  });

  it('não dispara o fallback de áreas quando a fonte primária já resolveu com locations', async () => {
    render(<Harness />);
    await screen.findAllByRole('combobox', { name: /área de aplicação/i });

    // needsPrintAreaFallback = !loadingTechniques && !options?.locations?.length —
    // com locations presentes, o hook deve ser chamado com productId=null (query
    // desabilitada), nunca com o productId real (o que geraria uma requisição
    // PostgREST redundante — achado do Codex review na PR #1891).
    expect(mocks.kitComponentPrintAreas).toHaveBeenCalledWith(null);
    expect(mocks.kitComponentPrintAreas).not.toHaveBeenCalledWith('p1');
  });

  it('dispara o fallback com o productId real quando a fonte primária resolve vazia', async () => {
    mocks.productCustomizationOptions.mockReturnValue({
      data: { locations: [] },
      isLoading: false,
    });
    render(<Harness />);

    await waitFor(() => {
      expect(mocks.kitComponentPrintAreas).toHaveBeenCalledWith('p1');
    });
  });

  it('reprices active and hidden personalized targets for the current kit quantity', async () => {
    render(<Harness quantity={50} />);

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('personalization-state').textContent || '{}');
      expect(state['line-1']).toMatchObject({ pricedQuantity: 50, totalPrice: 110 });
      expect(state['line-2']).toMatchObject({ pricedQuantity: 100, totalPrice: 210 });
    });
    expect(screen.getAllByText('Personalização concluída')).toHaveLength(2);
  });

  it('discards a mockup response when artwork changes while generation is in flight', async () => {
    let resolveGeneration: ((value: unknown) => void) | undefined;
    mocks.generate.mockReturnValue(
      new Promise((resolve) => {
        resolveGeneration = resolve;
      }),
    );
    render(<Harness />);

    fireEvent.click(await screen.findByRole('button', { name: 'Gerar personalização' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trocar arte durante geração' }));
    await act(async () => {
      resolveGeneration?.({ singleUrl: 'https://cdn.test/stale-mockup.png', batchResults: [] });
      await Promise.resolve();
    });

    const state = JSON.parse(screen.getByTestId('personalization-state').textContent || '{}');
    expect(state['line-1'].artworkUrl).toBe('https://cdn.test/new-logo.png');
    expect(state['line-1'].generatedMockupUrl).toBeUndefined();
  });

  it('detaches Kit Maker artwork without deleting a potentially shared storage object', () => {
    render(<Harness />);
    expect(screen.getByTestId('artwork-control')).toHaveAttribute('data-delete-on-remove', 'false');
  });

  it('mostra o seletor de área de aplicação com as áreas reais do produto', async () => {
    render(<Harness />);
    const areaSelects = await screen.findAllByRole('combobox', { name: /área de aplicação/i });
    expect(areaSelects.length).toBeGreaterThan(0);
    expect(areaSelects[0]).toHaveTextContent('Frente');
  });

  it('espelha somente o produto no verso e mantém a arte legível', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Verso' }));

    const product = screen.getByAltText('Verso de Garrafa');
    const artwork = screen.getByAltText('Arte enviada para personalização');
    expect(product).toHaveStyle({ transform: 'scaleX(-1)' });
    expect(artwork).not.toHaveStyle({ transform: 'scaleX(-1)' });
    expect(product.parentElement).toHaveStyle({ transform: 'scale(1)' });
  });
});
