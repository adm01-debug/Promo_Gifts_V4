/**
 * Fixtures FIXAS do grupo 4 da matriz de aceite do Mockup (A09–A10).
 * Nunca marca/cliente real: tudo é "FIXTURE-*" e determinístico
 * (sem relógio, rede ou catálogo).
 */
import type { PersonalizationArea } from '@/components/mockup/MultiAreaManager';
import type { MockupClient } from '@/components/mockup/MockupConfigPanel';
import type { MockupTechnique } from '@/types/external-db';

/** Logo fictícia já hospedada (http), sem upload manual. */
export const LOGO_FIXTURE = 'https://fixture.invalid/logos/FIXTURE-LOGO.png';

/** Mockup fictício já gerado (resultado antigo que uma edição deve invalidar). */
export const MOCKUP_FIXTURE_URL = 'https://fixture.invalid/mockups/FIXTURE-MOCKUP.png';

// ─── A10 — configuração "atual" (A) e "editada" (B) da ficha ─────────

/** Cliente fictício do CRM — configuração original. */
export const CLIENTE_A: MockupClient = {
  id: 'fixture-cliente-a',
  name: 'FIXTURE-CLIENTE-A',
  nome_fantasia: 'FIXTURE-CLIENTE-A',
};

/** Cliente fictício do CRM — depois de editar. */
export const CLIENTE_B: MockupClient = {
  id: 'fixture-cliente-b',
  name: 'FIXTURE-CLIENTE-B',
  nome_fantasia: 'FIXTURE-CLIENTE-B',
};

export const PRODUTO_A = {
  name: 'FIXTURE-PRODUTO-A',
  sku: 'FIXTURE-SKU-A',
  imageUrl: 'https://fixture.invalid/produtos/FIXTURE-A.png',
};

export const PRODUTO_B = {
  name: 'FIXTURE-PRODUTO-B',
  sku: 'FIXTURE-SKU-B',
  imageUrl: 'https://fixture.invalid/produtos/FIXTURE-B.png',
};

export const VENDEDOR_FIXTURE = {
  name: 'FIXTURE-VENDEDOR',
  email: 'fixture@fixture.invalid',
};

/** Área frontal com limites conhecidos (5×3 cm de gravação). */
export const AREA_A: PersonalizationArea = {
  id: 'fixture-area-a',
  name: 'FIXTURE-FRENTE',
  positionX: 50,
  positionY: 42,
  logoWidth: 5,
  logoHeight: 3,
  logoRotation: 0,
  logoScale: 100,
  logoPreview: LOGO_FIXTURE,
  maxWidthCm: 7,
  maxHeightCm: 3,
};

/** Área traseira já EDITADA (9×4 cm) — não pode contaminar a ficha da frente. */
export const AREA_B: PersonalizationArea = {
  ...AREA_A,
  id: 'fixture-area-b',
  name: 'FIXTURE-COSTAS',
  logoWidth: 9,
  logoHeight: 4,
};

/** Técnicas fictícias da tabela de preço (código curto do adaptador). */
export const TECNICA_SERIGRAFIA: MockupTechnique = {
  id: 'fixture-tecnica-serigrafia',
  name: 'FIXTURE-SERIGRAFIA',
  code: 'serigrafia',
  locationName: 'FIXTURE-FRENTE',
  maxWidth: 7,
  maxHeight: 3,
};

export const TECNICA_LASER: MockupTechnique = {
  id: 'fixture-tecnica-laser',
  name: 'FIXTURE-LASER',
  code: 'laser',
  locationName: 'FIXTURE-FRENTE',
};
