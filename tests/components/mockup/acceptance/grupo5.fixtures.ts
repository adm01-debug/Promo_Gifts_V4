/**
 * Fixtures FIXAS do grupo 5 da matriz de aceite do Mockup (A11–A13).
 * Nunca marca/cliente real: tudo é "FIXTURE-*" e determinístico.
 */
import type { PersonalizationArea } from '@/components/mockup/MultiAreaManager';
import type { MockupDraftData } from '@/hooks/mockup/useMockupDraft';
import type { GeneratedMockup } from '@/hooks/mockup/mockupGenerationService';

/** Marca (logo) já hospedada em http — reabre sem novo upload. */
export const MARCA_FIXTURE_URL = 'https://fixture.invalid/logos/FIXTURE-MARCA.png';

/** Mockup fictício exibido na camada ampliada (lightbox). */
export const MOCKUP_LIGHTBOX: GeneratedMockup = {
  id: 'fixture-mockup-lightbox',
  product_id: 'fixture-produto-lightbox',
  product_name: 'FIXTURE-PRODUTO-LIGHTBOX',
  product_sku: 'FIXTURE-SKU-LIGHTBOX',
  technique_id: null,
  technique_name: 'FIXTURE-TECNICA-LIGHTBOX',
  mockup_url: 'https://fixture.invalid/mockups/FIXTURE-LIGHTBOX.png',
  layout_url: null,
  logo_url: MARCA_FIXTURE_URL,
  position_x: 50,
  position_y: 50,
  logo_width_cm: 5,
  logo_height_cm: 3,
  logo_rotation: 0,
  logo_scale: 100,
  location_name: 'FIXTURE-FRENTE',
  colors_count: 1,
  annotations: null,
  client_name: 'FIXTURE-CLIENTE-LIGHTBOX',
  client_id: 'fixture-cliente-lightbox',
  created_at: '2026-10-01T12:00:00.000Z',
};

// ─── A11 — alvo (área inativa) e testemunha (área ativa) ─────────────

/** Área ATIVA (não é o alvo da remoção) — precisa sair intacta. */
export const AREA_ATIVA: PersonalizationArea = {
  id: 'fixture-area-ativa',
  name: 'FIXTURE-FRENTE-ATIVA',
  positionX: 42,
  positionY: 37,
  logoWidth: 6,
  logoHeight: 4,
  logoRotation: 0,
  logoScale: 100,
  logoPreview: MARCA_FIXTURE_URL,
};

/** Área NÃO ativa — o alvo cujo logo será removido. */
export const AREA_NAO_ATIVA: PersonalizationArea = {
  id: 'fixture-area-nao-ativa',
  name: 'FIXTURE-COSTAS-INATIVA',
  positionX: 61,
  positionY: 58,
  logoWidth: 9,
  logoHeight: 5,
  logoRotation: 0,
  logoScale: 100,
  logoPreview: 'https://fixture.invalid/logos/FIXTURE-COSTAS.png',
};

/** Área sem logo — alvo do upload pelo seletor de arquivo (sem arrastar). */
export const AREA_SEM_LOGO: PersonalizationArea = {
  id: 'fixture-area-sem-logo',
  name: 'FIXTURE-MANGA-SEM-LOGO',
  positionX: 50,
  positionY: 50,
  logoWidth: 5,
  logoHeight: 3,
  logoRotation: 0,
  logoScale: 100,
  logoPreview: null,
};

/** PNG fictício (nome e mime fixos) para o upload sem arrastar. */
export function makePngFixture(): File {
  return new File(['fixture-png-bytes'], 'FIXTURE-LOGO.png', { type: 'image/png' });
}

// ─── A12 — rascunho persistido que o "recarregar" deve reabrir ───────

/** Rascunho salvo: produto, cliente, técnica e uma área com a marca (http). */
export const RASCUNHO_FIXTURE: MockupDraftData = {
  productId: 'fixture-produto-draft',
  productName: 'FIXTURE-PRODUTO-DRAFT',
  techniqueId: 'fixture-tecnica-draft',
  techniqueName: 'FIXTURE-TECNICA-DRAFT',
  clientId: 'fixture-cliente-draft',
  clientName: 'FIXTURE-CLIENTE-DRAFT',
  personalizationAreas: [
    {
      id: 'fixture-area-draft',
      name: 'FIXTURE-FRENTE-DRAFT',
      positionX: 48,
      positionY: 44,
      logoWidth: 6,
      logoHeight: 4,
      logoRotation: 0,
      logoScale: 100,
      logoPreview: MARCA_FIXTURE_URL,
    },
  ],
  updatedAt: '2026-10-01T12:00:00.000Z',
};

// ─── A13 — busca de produto (resultado já vindo do servidor) ─────────

/** Produto fictício devolvido pelo caller (busca server-side). */
export const PRODUTO_BUSCA = {
  id: 'fixture-produto-busca',
  name: 'FIXTURE-PRODUTO-BUSCA',
  sku: 'FIXTURE-SKU-BUSCA',
  primary_image_url: 'https://fixture.invalid/produtos/FIXTURE-BUSCA.png',
};
