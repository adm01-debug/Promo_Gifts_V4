import { describe, expect, it } from 'vitest';
import {
  reconcilePersonalizationForTechnique,
  buildKitMockupRequest,
  type FlatTechnique,
} from '@/components/kit-builder/PersonalizationConfig';

const limitedTechnique: FlatTechnique = {
  technique_id: 'tech-laser',
  tecnica_nome: 'Laser',
  grupo_tecnica: 'Gravação',
  codigo_tabela: 'LASER',
  location_name: 'Frente',
  location_code: 'front',
  max_cores: 1,
  usa_dimensao: true,
  efetiva_largura_max: 5,
  efetiva_altura_max: 3,
};

describe('PersonalizationConfig price inputs', () => {
  it('clamps an old technique configuration and invalidates its stale quote price', () => {
    const result = reconcilePersonalizationForTechnique(
      {
        enabled: true,
        colors: 4,
        width: 12,
        height: 8,
        estimatedPrice: 9.9,
      },
      limitedTechnique,
    );

    expect(result).toMatchObject({
      techniqueId: 'tech-laser',
      positionCode: 'front',
      colors: 1,
      width: 5,
      height: 3,
      estimatedPrice: undefined,
    });
  });

  it('removes dimensions when the selected technique does not price an area', () => {
    const result = reconcilePersonalizationForTechnique(
      { enabled: true, width: 4, height: 2, estimatedPrice: 5 },
      { ...limitedTechnique, usa_dimensao: false },
    );

    expect(result.width).toBeUndefined();
    expect(result.height).toBeUndefined();
    expect(result.estimatedPrice).toBeUndefined();
  });

  it('só constrói uma geração real quando produto, técnica e arte estão completos', () => {
    expect(buildKitMockupRequest('Caneca', null, { enabled: true })).toBeNull();
    expect(
      buildKitMockupRequest('Caneca', 'https://cdn.test/caneca.jpg', {
        enabled: true,
        techniqueId: 'laser',
        techniqueName: 'Laser',
        techniqueCode: 'LASER',
        positionName: 'Frente',
        width: 4,
        height: 2,
        artworkUrl: 'https://cdn.test/logo.png',
      }),
    ).toMatchObject({
      productName: 'Caneca',
      technique: { id: 'laser', name: 'Laser', code: 'LASER' },
      areas: [
        {
          name: 'Frente',
          logoWidth: 4,
          logoHeight: 2,
          logoPreview: 'https://cdn.test/logo.png',
        },
      ],
    });
  });
});
