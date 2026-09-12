import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PersonalizationConfig } from '@/components/kit-builder/PersonalizationConfig';
import type { KitItem, KitItemPersonalization } from '@/lib/kit-builder';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  price: vi.fn(),
}));

vi.mock('@/hooks/products', () => ({
  useProductCustomizationOptions: () => ({
    data: {
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
      ],
    },
    isLoading: false,
  }),
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
  const [personalizations, setPersonalizations] = useState<Record<string, KitItemPersonalization>>({
    'line-1': CONFIG,
    'line-2': CONFIG,
  });
  return (
    <>
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
    </>
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
});
