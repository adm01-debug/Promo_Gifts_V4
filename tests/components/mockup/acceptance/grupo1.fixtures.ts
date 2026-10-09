/**
 * Fixtures FIXAS do grupo 1 da matriz de aceite do Mockup (A01–A02).
 * Nunca marca/cliente real: tudo é "FIXTURE-*" e determinístico
 * (sem relógio, rede ou catálogo).
 */
import type { GeneratedMockup } from '@/hooks/mockup/mockupGenerationService';
import type { MockupDraftData } from '@/hooks/mockup/useMockupDraft';

/** Cliente fictício do CRM, com a própria marca (logo) já hospedada. */
export const CLIENTE_FIXTURE = {
  id: 'fixture-cliente-marca',
  name: 'FIXTURE-CLIENTE-MARCA',
  razao_social: 'FIXTURE-CLIENTE-MARCA LTDA',
  logo_url: 'https://fixture.invalid/logos/marca-cliente.png',
} as const;

/** Produto fictício do catálogo. */
export const PRODUTO_FIXTURE = {
  id: 'fixture-produto-1',
  name: 'FIXTURE-PRODUTO-1',
  sku: 'FIXTURE-SKU-1',
  images: ['https://fixture.invalid/produtos/fixture-produto-1.png'],
} as const;

/** Técnica fictícia (código curto usado pelo adaptador do catálogo). */
export const TECNICA_FIXTURE = {
  id: 'fixture-tecnica-1',
  name: 'FIXTURE-TECNICA',
  code: 'fixture-tec',
} as const;

/** Marca (logo) do cliente, já hospedada em http — reabre sem novo upload. */
export const MARCA_CLIENTE_URL = 'https://fixture.invalid/logos/marca-cliente.png';

/** PNG válido persistido no histórico (mockup) e a logo associada (PNG). */
export const MOCKUP_PNG_URL = 'https://fixture.invalid/mockups/FIXTURE-MOCKUP.png';
export const LOGO_PNG_URL = 'https://fixture.invalid/logos/FIXTURE-LOGO.png';

/**
 * Rascunho salvo que carrega a marca do cliente (logo http), o cliente e o produto.
 * É o material que o `restoreDraft` de `useMockupGenerator` reabre.
 */
export const RASCUNHO_MARCA_CLIENTE: MockupDraftData = {
  productId: PRODUTO_FIXTURE.id,
  productName: PRODUTO_FIXTURE.name,
  techniqueId: TECNICA_FIXTURE.id,
  techniqueName: TECNICA_FIXTURE.name,
  clientId: CLIENTE_FIXTURE.id,
  clientName: CLIENTE_FIXTURE.name,
  personalizationAreas: [
    {
      id: 'fixture-area-frente',
      name: 'FIXTURE-FRENTE',
      positionX: 50,
      positionY: 40,
      logoWidth: 6,
      logoHeight: 4,
      logoRotation: 0,
      logoScale: 100,
      logoPreview: MARCA_CLIENTE_URL,
    },
  ],
  updatedAt: '2026-10-01T12:00:00.000Z',
};

/**
 * Mockup salvo (PNG válido) com logo, cliente e produto — material que o
 * `loadFromHistory` de `useMockupGenerator` recarrega do histórico.
 */
export const MOCKUP_SALVO_PNG: GeneratedMockup = {
  id: 'fixture-mockup-1',
  product_id: PRODUTO_FIXTURE.id,
  product_name: PRODUTO_FIXTURE.name,
  product_sku: PRODUTO_FIXTURE.sku,
  technique_id: null,
  technique_name: TECNICA_FIXTURE.name,
  mockup_url: MOCKUP_PNG_URL,
  layout_url: null,
  logo_url: LOGO_PNG_URL,
  position_x: 50,
  position_y: 42,
  logo_width_cm: 6,
  logo_height_cm: 4,
  logo_rotation: 0,
  logo_scale: 100,
  location_name: 'FIXTURE-FRENTE',
  colors_count: 2,
  annotations: null,
  client_name: CLIENTE_FIXTURE.name,
  client_id: CLIENTE_FIXTURE.id,
  created_at: '2026-10-01T12:00:00.000Z',
};
