import { describe, expect, it } from 'vitest';
import {
  reconcilePersonalizationForTechnique,
  reconcilePersonalizationForArea,
  buildKitMockupRequest,
  type FlatTechnique,
} from '@/components/kit-builder/PersonalizationConfig';
import {
  medidasAutoritativas,
  recusaPorMedidasAusentes,
} from '@/components/kit-builder/kitMockupDimensions';
import {
  MISSING_DIMENSIONS_MESSAGE,
  MISSING_DIMENSIONS_STATUS,
} from '@/hooks/mockup/mockupGeneratorModel';

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

  it('atualiza a área de aplicação e preserva a técnica quando ela já pertence à área escolhida', () => {
    const result = reconcilePersonalizationForArea(
      { enabled: true, techniqueId: 'tech-laser', estimatedPrice: 9.9, positionCode: 'front' },
      { code: 'front', name: 'Frente' },
      'front',
    );

    expect(result).toMatchObject({
      positionCode: 'front',
      positionName: 'Frente',
      position: 'Frente',
      techniqueId: 'tech-laser',
      estimatedPrice: 9.9,
    });
  });

  it('limpa a técnica e o preço obsoleto ao trocar para uma área onde a técnica atual não existe', () => {
    const result = reconcilePersonalizationForArea(
      {
        enabled: true,
        techniqueId: 'tech-laser',
        techniqueName: 'Laser',
        estimatedPrice: 9.9,
        totalPrice: 99,
        positionCode: 'front',
      },
      { code: 'side', name: 'Lateral' },
      'front',
    );

    expect(result).toMatchObject({
      positionCode: 'side',
      positionName: 'Lateral',
      position: 'Lateral',
      techniqueId: undefined,
      techniqueName: undefined,
      estimatedPrice: undefined,
      totalPrice: undefined,
    });
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

  describe('medidas reais do produto no payload do mockup', () => {
    const completo = {
        enabled: true,
        techniqueId: 'laser',
        techniqueName: 'Laser',
        techniqueCode: 'LASER',
        positionName: 'Frente',
        width: 4,
        height: 2,
        artworkUrl: 'https://cdn.test/logo.png',
    };

    it('leva as medidas do produto para a edge, em cm', () => {
      const req = buildKitMockupRequest('Caneca', 'https://cdn.test/caneca.jpg', completo, {
        widthCm: 8.5,
        heightCm: 9.5,
      });
      expect(req).toMatchObject({ productWidthCm: 8.5, productHeightCm: 9.5 });
    });

    it('sem medidas, manda null explicito em vez de omitir o campo', () => {
      // A edge distingue "nao informado" de "informado como zero/invalido"; o cliente
      // ja recusa antes de chamar (mockupGeneratorModel.ts MISSING_DIMENSIONS_REFUSAL).
      const req = buildKitMockupRequest('Caneca', 'https://cdn.test/caneca.jpg', completo);
      expect(req).toMatchObject({ productWidthCm: null, productHeightCm: null });
    });

    it('uma dimensao sozinha e preservada (a outra a edge infere)', () => {
      const soLargura = buildKitMockupRequest(
        'Caneca',
        'https://cdn.test/caneca.jpg',
        completo,
        { widthCm: 8.5 },
      );
      expect(soLargura).toMatchObject({ productWidthCm: 8.5, productHeightCm: null });
    });

    it('estimativa da UI (dimensionsKnown false) NAO vira medida real', () => {
      // O mockup sairia em escala errada com cara de certo — pior que nao sair.
      expect(medidasAutoritativas({ dimensionsKnown: false }, 8.5, 9.5)).toBeUndefined();
    });

    it('medida autoritativa passa; dimensionsKnown ausente conta como autoritativa', () => {
      expect(medidasAutoritativas({ dimensionsKnown: true }, 8.5, 9.5)).toEqual({
        widthCm: 8.5,
        heightCm: 9.5,
      });
      expect(medidasAutoritativas({}, 8.5, 9.5)).toEqual({ widthCm: 8.5, heightCm: 9.5 });
    });

    it('nao inventa medida quando o chamador passa objeto vazio', () => {
      const req = buildKitMockupRequest('Caneca', 'https://cdn.test/caneca.jpg', completo, {});
      expect(req).toMatchObject({ productWidthCm: null, productHeightCm: null });
    });
  });
});

describe('recusaPorMedidasAusentes — o kit-builder recusa antes de chamar a edge', () => {
  it('sem medida nenhuma: recusa com a mensagem do vendedor e status 422', () => {
    // A edge devolveria 422 missing_dimensions com texto de API
    // (geometry.ts -> checkProductDimensions). Aqui o vendedor recebe a instrucao.
    for (const entrada of [undefined, {}, { widthCm: null, heightCm: null }]) {
      const recusa = recusaPorMedidasAusentes(entrada);
      expect(recusa).not.toBeNull();
      expect(recusa?.status).toBe(MISSING_DIMENSIONS_STATUS);
      expect(recusa?.status).toBe(422);
      expect(recusa?.message).toBe(MISSING_DIMENSIONS_MESSAGE);
    }
  });

  it('zero, negativo e NaN nao contam como medida', () => {
    expect(recusaPorMedidasAusentes({ widthCm: 0, heightCm: 0 })).not.toBeNull();
    expect(recusaPorMedidasAusentes({ widthCm: -5, heightCm: -1 })).not.toBeNull();
    expect(recusaPorMedidasAusentes({ widthCm: Number.NaN, heightCm: Number.NaN })).not.toBeNull();
  });

  it('uma medida valida basta para liberar a geracao', () => {
    expect(recusaPorMedidasAusentes({ widthCm: 8.5, heightCm: null })).toBeNull();
    expect(recusaPorMedidasAusentes({ widthCm: null, heightCm: 9.5 })).toBeNull();
    expect(recusaPorMedidasAusentes({ widthCm: 8.5, heightCm: 9.5 })).toBeNull();
  });

  it('estimativa da UI nao libera: medidasAutoritativas devolve undefined e a recusa dispara', () => {
    const dimensoes = medidasAutoritativas({ dimensionsKnown: false }, 8.5, 9.5);
    expect(dimensoes).toBeUndefined();
    expect(recusaPorMedidasAusentes(dimensoes)).not.toBeNull();
  });
});
