/**
 * Fixtures FIXAS do grupo 6 da matriz de aceite do Mockup (A14–A17).
 * Nunca marca/cliente real: tudo é "FIXTURE-*" e determinístico
 * (sem relógio, rede ou catálogo).
 */
import type { PersonalizationArea } from '@/components/mockup/MultiAreaManager';
import type { MockupClient } from '@/components/mockup/MockupConfigPanel';

// ─── Identidades fictícias ───────────────────────────────────────────

/** Cliente fictício do CRM. */
export const CLIENTE_FIXTURE: MockupClient = {
  id: 'fixture-cliente-6',
  name: 'FIXTURE-CLIENTE-6',
  nome_fantasia: 'FIXTURE-CLIENTE-6',
};

/** Produto fictício do catálogo (com dimensões físicas p/ WYSIWYG). */
export const PRODUTO_FIXTURE = {
  id: 'fixture-produto-6',
  name: 'FIXTURE-PRODUTO-6',
  sku: 'FIXTURE-SKU-6',
  images: ['https://fixture.invalid/produtos/fixture-produto-6.png'],
  dimensions: { width_cm: 20, height_cm: 10 },
} as const;

/** Técnica fictícia do catálogo. */
export const TECNICA_FIXTURE = {
  id: 'fixture-tecnica-6',
  name: 'FIXTURE-TECNICA-6',
  code: 'fixture-tec-6',
} as const;

// ─── Áreas / logos / resultados ──────────────────────────────────────

/** Área frontal com logo http (fluxo "single"). */
export const AREA_FRENTE: PersonalizationArea = {
  id: 'fixture-area-frente',
  name: 'FIXTURE-FRENTE',
  positionX: 50,
  positionY: 42,
  logoWidth: 6,
  logoHeight: 4,
  logoRotation: 0,
  logoScale: 100,
  logoPreview: 'https://fixture.invalid/logos/FIXTURE-LOGO-FRENTE.png',
};

/** Área das costas com logo http (segunda área do lote). */
export const AREA_COSTAS: PersonalizationArea = {
  ...AREA_FRENTE,
  id: 'fixture-area-costas',
  name: 'FIXTURE-COSTAS',
  logoPreview: 'https://fixture.invalid/logos/FIXTURE-LOGO-COSTAS.png',
};

/** Mockup gerado (apenas asserção de estado visível, nunca baixado). */
export const MOCKUP_FRENTE_URL = 'https://fixture.invalid/mockups/FIXTURE-OK-FRENTE.png';

/** Id devolvido pelo insert quando o salvamento finalmente sucede. */
export const REGISTRO_SALVO_ID = 'fixture-record-id';

/** Id da segunda tentativa de gravação (repetir o salvar). */
export const REGISTRO_REPETIDO_ID = 'fixture-record-id-repetido';

// ─── A15 — análise de cores ──────────────────────────────────────────

/** Imagem base64 mínima (não é decodificada: o resize é stubado no teste). */
export const IMAGEM_BASE64_A = 'data:image/png;base64,FIXTURE-IMAGEM-A';
export const IMAGEM_BASE64_B = 'data:image/png;base64,FIXTURE-IMAGEM-B';

/** Cor detectada devolvida pela edge (a "resposta antiga"). */
export const COR_VERDE = { name: 'FIXTURE-VERDE', hex: '#00ff00' };

/** Mensagem de erro da análise (o que a edge/relay devolve). */
export const ERRO_ANALISE = 'FIXTURE: falha ao analisar as cores da logo';

/** Mensagem canônica do serviço quando o insert no histórico falha. */
export const ERRO_SALVAR =
  'Mockup gerado, mas não foi possível salvar no histórico.';

/** Erro de FK 23503 — dispara a repetição do insert com product_id nulo. */
export const FK_VIOLATION = {
  code: '23503',
  message: 'insert or update on table "generated_mockups" violates foreign key constraint',
};
