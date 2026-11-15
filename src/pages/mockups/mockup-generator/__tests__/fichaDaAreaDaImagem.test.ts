/**
 * A ficha de aprovação imprime as medidas DA MESMA área da imagem que ela mostra.
 *
 * Num lote de várias áreas o card exibe a PRIMEIRA (useMockupGenerator.ts:600) e
 * `saveBatchResults` devolve a gravação dessa área — mas a captura da ficha lia
 * local e medidas da área ATIVA. Com a segunda área ativa na hora de gerar, a
 * ficha que vai ao cliente juntava a imagem da primeira com as medidas da
 * segunda. Aqui o par (imagem, medidas) é verificado junto, ponta a ponta.
 *
 * Execução: npx vitest run src/pages/mockups/mockup-generator/__tests__/fichaDaAreaDaImagem.test.ts
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { saveBatchResults, type BatchMockupResult } from '@/hooks/mockup/mockupGeneratorModel';
import type { PersonalizationArea } from '@/components/mockup/MultiAreaManager';
import type { Profile } from '@/contexts/AuthContext';
import { useLayoutCaptureRequest } from '../useLayoutCaptureRequest';

type CaptureArgs = Parameters<typeof useLayoutCaptureRequest>;

function area(over: Partial<PersonalizationArea> & { id: string }): PersonalizationArea {
  return {
    name: 'Frente',
    positionX: 50,
    positionY: 50,
    logoWidth: 1,
    logoHeight: 1,
    logoPreview: 'data:image/png;base64,LOGO',
    ...over,
  };
}

/** Duas áreas com medidas DIFERENTES — é a diferença que expõe a troca. */
const FRENTE = area({ id: 'a1', name: 'Frente', logoWidth: 10, logoHeight: 5 });
const COSTAS = area({ id: 'a2', name: 'Costas', logoWidth: 3, logoHeight: 2 });

const LOTE: BatchMockupResult[] = [
  { url: 'url-frente', areaName: 'Frente', areaId: 'a1' },
  { url: 'url-costas', areaName: 'Costas', areaId: 'a2' },
];

const PERFIL = { full_name: 'Vendedora', email: 'vendedora@exemplo.test' } as Profile;

function generatorState(over: Record<string, unknown>) {
  return {
    lastSavedLayoutMode: 'ai',
    selectedProduct: { name: 'Mochila', sku: 'MOC-1', materials: [], dimensions: null },
    // locationName nulo de propósito: assim o local da ficha vem da ÁREA.
    selectedTechnique: { name: 'Silk', code: 'SILK', locationName: null },
    selectedClient: { id: 'c1', name: 'Cliente' },
    productSelection: null,
    techniqueColorConfig: null,
    logoColorAnalysis: { colors: [] },
    getProductImage: () => 'https://exemplo.test/produto.png',
    ...over,
  } as unknown as CaptureArgs[0];
}

function pedidoDeCaptura(mg: CaptureArgs[0]) {
  const { result } = renderHook(() => useLayoutCaptureRequest(mg, PERFIL, 'user-1'));
  return result.current;
}

describe('ficha de aprovação — medidas da área da imagem escolhida', () => {
  it('a gravação devolvida pelo lote traz a identidade da área da imagem exibida', async () => {
    const salvo = await saveBatchResults(LOTE, [FRENTE, COSTAS], (_url, a) =>
      Promise.resolve(`rec-${a.id}`),
    );

    expect(salvo).toMatchObject({ recordId: 'rec-a1', url: 'url-frente' });
    // Sem a identidade da área não há como a ficha saber de quem são as medidas.
    expect(salvo?.area).toBe(FRENTE);
  });

  it('lote com a SEGUNDA área ativa: a ficha leva local e medidas da área da imagem exibida', async () => {
    const salvo = await saveBatchResults(LOTE, [FRENTE, COSTAS], (_url, a) =>
      Promise.resolve(`rec-${a.id}`),
    );

    const pedido = pedidoDeCaptura(
      generatorState({
        lastSavedRecordId: salvo?.recordId ?? 'rec-a1',
        lastSavedMockupUrl: salvo?.url ?? 'url-frente',
        // A área da imagem gravada é a "Frente" (10×5 cm)...
        lastSavedArea: FRENTE,
        generatedMockup: 'url-frente',
        // ...e a área ATIVA é a outra (3×2 cm): o vendedor estava em "Costas"
        // quando mandou gerar. A ficha NÃO pode imprimir 3×2 sobre a imagem da frente.
        activeArea: COSTAS,
      }),
    );

    expect(pedido?.data.mockupImageUrl).toBe('url-frente');
    expect(pedido?.data.personalization.locationName).toBe('Frente');
    expect(pedido?.data.personalization.widthCm).toBe(10);
    expect(pedido?.data.personalization.heightCm).toBe(5);
  });

  it('layout estático: a ficha leva as medidas da área que gerou aquele PNG', () => {
    const pedido = pedidoDeCaptura(
      generatorState({
        lastSavedRecordId: 'rec-a2',
        lastSavedMockupUrl: 'png-costas',
        lastSavedArea: COSTAS,
        lastSavedLayoutMode: 'static',
        generatedMockup: 'url-frente',
        activeArea: COSTAS,
      }),
    );

    expect(pedido?.data.mockupImageUrl).toBe('png-costas');
    expect(pedido?.data.personalization.locationName).toBe('Costas');
    expect(pedido?.data.personalization.widthCm).toBe(3);
    expect(pedido?.data.personalization.heightCm).toBe(2);
  });
});
