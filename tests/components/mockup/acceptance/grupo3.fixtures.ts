/**
 * Fixtures FIXAS do grupo 3 da matriz de aceite do Mockup (A05–A08).
 * Nunca marca/cliente real: tudo é "FIXTURE-*" e determinístico (sem relógio, rede ou catálogo).
 */
import type { PersonalizationArea } from '@/components/mockup/MultiAreaManager';
import type { DetectedColor } from '@/hooks/simulation';

/** Área frontal: logo próprio + paleta curta (1 cor). */
export const AREA_FRENTE: PersonalizationArea = {
  id: 'fixture-area-frente',
  name: 'FIXTURE-FRENTE',
  positionX: 50,
  positionY: 42,
  logoWidth: 5,
  logoHeight: 3,
  logoRotation: 0,
  logoScale: 100,
  logoPreview: 'https://fixture.invalid/logos/frente.png',
  maxWidthCm: 7,
  maxHeightCm: 3,
  maxColors: 1,
  isCurved: false,
  techniquesAvailable: 2,
};

/** Área traseira: OUTRO logo + paleta longa (4 cores). */
export const AREA_COSTAS: PersonalizationArea = {
  id: 'fixture-area-costas',
  name: 'FIXTURE-COSTAS',
  positionX: 50,
  positionY: 55,
  logoWidth: 9,
  logoHeight: 4,
  logoRotation: 0,
  logoScale: 100,
  logoPreview: 'https://fixture.invalid/logos/costas.png',
  maxWidthCm: 20,
  maxHeightCm: 10,
  maxColors: 4,
  isCurved: true,
  techniquesAvailable: 3,
};

export const AREAS_DUAS: PersonalizationArea[] = [AREA_FRENTE, AREA_COSTAS];

/** Três cores detectadas na logo — para estourar um limite de 2. */
const cor = (name: string, hex: string, n: number): DetectedColor => ({
  name, hex, pantoneMatch: { pantoneCode: `PANTONE-000${n}`, pantoneHex: hex, deltaE: n * 1.2 }, selectedPantone: `PANTONE-000${n}`,
});
export const CORES_DETECTADAS_3: DetectedColor[] = [
  cor('FIXTURE-VERMELHO', '#ff0000', 1),
  cor('FIXTURE-AZUL', '#0000ff', 2),
  cor('FIXTURE-VERDE', '#00ff00', 3),
];

/** Limite oficial de cores da área frente (menor que o que a logo ocupa). */
export const LIMITE_CORES_FRENTE = 2;

/** Produto fictício com dimensões físicas CONHECIDAS (calibração real). */
export const PRODUTO_CALIBRADO = {
  id: 'fixture-produto-calibrado',
  name: 'FIXTURE-PRODUTO-CALIBRADO',
  sku: 'FIXTURE-SKU-1',
  images: ['https://fixture.invalid/produtos/calibrado.png'],
  dimensions: { width_cm: 20, height_cm: 10 },
} as const;

/** Produto fictício SEM dimensões físicas (sem calibração). */
export const PRODUTO_SEM_CALIBRACAO = {
  id: 'fixture-produto-sem-calibracao',
  name: 'FIXTURE-PRODUTO-SEM-CALIBRACAO',
  sku: 'FIXTURE-SKU-2',
  images: ['https://fixture.invalid/produtos/sem-calibracao.png'],
} as const;

/** Técnica fictícia com regra conhecida (serigrafia). */
export const TECNICA_SERIGRAFIA = { id: 'fixture-tecnica-serigrafia', name: 'FIXTURE-SERIGRAFIA', code: 'serigrafia', maxWidth: 7, maxHeight: 3, maxColors: 2 } as const;

/** Cliente fictício do CRM. */
export const CLIENTE_FIXTURE = { id: 'fixture-cliente', name: 'FIXTURE-CLIENTE' } as const;
