/**
 * Fixtures FIXAS do grupo 7 da matriz de aceite do Mockup (A18–A20).
 *
 * Nunca marca/cliente real: tudo é "FIXTURE-*" e determinístico (sem relógio,
 * rede ou catálogo). Os arquivos são montados com tamanho EXATO (sem alocar
 * os megabytes de verdade) para exercitar os limites reais de upload.
 */
import type { MockupApprovalData } from '@/types/mockup-approval';
import type { MockupClient } from '@/components/mockup/MockupConfigPanel';
import type { PersonalizationArea } from '@/components/mockup/MultiAreaManager';

/** 1 MB em bytes — base dos limites de upload (raster 10 MB / arte 25 MB). */
export const MB = 1024 * 1024;

/** Cliente fictício do CRM (nome/logo fixos, sem dado real). */
export const CLIENTE_FIXTURE: MockupClient = {
  id: 'fixture-cliente',
  name: 'FIXTURE-CLIENTE',
  razao_social: 'FIXTURE-CLIENTE LTDA',
  nome_fantasia: 'FIXTURE-CLIENTE',
  cnpj: '00.000.000/0001-00',
  logo_url: 'https://fixture.invalid/logos/cliente.png',
};

/** Vendedor fictício (rodapé da ficha). */
export const VENDEDOR_FIXTURE = { name: 'FIXTURE-VENDEDOR', email: 'fixture@example.invalid' };

/** Produto fictício do catálogo. */
export const PRODUTO_FIXTURE = {
  name: 'FIXTURE-PRODUTO',
  sku: 'FIXTURE-SKU',
  imageUrl: 'https://fixture.invalid/produtos/fixture.png',
  color: 'FIXTURE-AZUL',
  colorHex: '#0047AB',
  material: 'FIXTURE-MATERIAL',
  heightCm: 20,
  widthCm: 8,
  weightG: 300,
};

/** Técnica fictícia aplicada na área. */
export const TECNICA_FIXTURE = {
  name: 'FIXTURE-TECNICA',
  code: 'FIX-TEC',
  locationName: 'FIXTURE-FRENTE',
  maxWidth: 7,
  maxHeight: 3,
};

/** Logo fictício (PNG data URL, nunca arte real). */
export const LOGO_FIXTURE = 'data:image/png;base64,RklDVFVSRS1MT0dP';

/** Área de personalização fictícia. */
export const AREA_FIXTURE: PersonalizationArea = {
  id: 'fixture-area-1',
  name: 'FIXTURE-FRENTE',
  positionX: 50,
  positionY: 42,
  logoWidth: 6,
  logoHeight: 4,
  logoPreview: LOGO_FIXTURE,
};

/** O PNG do mockup gerado — a "imagem" da revisão. */
export const MOCKUP_FIXTURE_URL = 'https://fixture.invalid/mockups/FIXTURE-MOCKUP.png';

/**
 * Payload da ficha de aprovação de UMA revisão: referência, data e imagem
 * viajam juntos (é o mesmo documento que o vendedor baixa).
 */
export const FICHA_FIXTURE: MockupApprovalData = {
  documentNumber: 'MK-FIXTURE-0001',
  date: '01/10/2026',
  client: { name: CLIENTE_FIXTURE.name, cnpj: CLIENTE_FIXTURE.cnpj },
  seller: { name: VENDEDOR_FIXTURE.name, email: VENDEDOR_FIXTURE.email },
  product: { name: PRODUTO_FIXTURE.name, sku: PRODUTO_FIXTURE.sku, imageUrl: PRODUTO_FIXTURE.imageUrl },
  personalization: {
    techniqueName: TECNICA_FIXTURE.name,
    techniqueCode: TECNICA_FIXTURE.code,
    locationName: TECNICA_FIXTURE.locationName,
    widthCm: AREA_FIXTURE.logoWidth,
    heightCm: AREA_FIXTURE.logoHeight,
  },
  pantoneColors: [],
  mockupImageUrl: MOCKUP_FIXTURE_URL,
  layoutMode: 'ai',
};

/**
 * Cria um arquivo com o NOME/MIME reais e o `size` pedido, sem alocar os
 * megabytes (mesma semântica do `File` do browser: o componente só lê `.size`).
 */
export function arquivoComTamanho(bytes: number, nome: string, mime: string): File {
  const file = new File(['x'], nome, { type: mime });
  Object.defineProperty(file, 'size', { value: bytes, configurable: true });
  return file;
}

/** Raster válido (PNG) do tamanho pedido. */
export function rasterDe(bytes: number, nome = 'logo.png'): File {
  return arquivoComTamanho(bytes, nome, 'image/png');
}

/** Arte original (vetorial) do tamanho pedido. */
export function arteVetorialDe(bytes: number, nome = 'arte.ai'): File {
  return arquivoComTamanho(bytes, nome, 'application/postscript');
}
