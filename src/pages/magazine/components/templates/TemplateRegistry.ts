/**
 * TemplateRegistry — SSOT dos 10 templates de design da Magazine.
 *
 * Cada template define metadata + componente React puro que renderiza
 * uma página (1920×2716 px, proporção A4 a 300dpi).
 */

import type { ComponentType } from 'react';
import type {
  Magazine,
  MagazinePage,
  MagazineTemplateId,
  MagazineTemplateMeta,
} from '@/types/magazine';

import { VogueTemplate } from './editorial/VogueTemplate';
import { MagazineTemplate } from './editorial/MagazineTemplate';
import { HeroGridTemplate } from './editorial/HeroGridTemplate';
import { MonoTemplate } from './editorial/MonoTemplate';
import { EditorialManifestoTemplate } from './editorial/EditorialManifestoTemplate';
import { Grid2x3Template } from './catalog/Grid2x3Template';
import { Grid3x3Template } from './catalog/Grid3x3Template';
import { ListTemplate } from './catalog/ListTemplate';
import { GiftSetShowcaseTemplate } from './catalog/GiftSetShowcaseTemplate';
import { CorporateHeroTemplate } from './corporate/CorporateHeroTemplate';
import { CorporateSplitTemplate } from './corporate/CorporateSplitTemplate';
import { CorporateExecutiveTemplate } from './corporate/CorporateExecutiveTemplate';

export interface TemplatePageProps {
  magazine: Magazine;
  page: MagazinePage;
  /** Total de páginas na revista, usado para folios "05 / 24". */
  totalPages?: number;
}

export interface TemplateEntry extends MagazineTemplateMeta {
  Component: ComponentType<TemplatePageProps>;
}

export const TEMPLATE_REGISTRY: Record<MagazineTemplateId, TemplateEntry> = {
  'editorial-vogue': {
    id: 'editorial-vogue',
    name: 'Vogue',
    family: 'editorial',
    description: 'Hero fullbleed, tipografia serifada, 1 produto por página',
    productsPerPage: 1,
    fonts: { heading: 'Cormorant Garamond', body: 'Work Sans' },
    defaultColors: { primary: '#0f172a', secondary: '#dc2626', text: '#111111' },
    visualStyle: 'Minimalista',
    audience: 'Corporativo / Premium',
    features: [
      'Hero com tipografia serifada',
      'Foco em um produto por página',
      'Layout clean e sofisticado',
      'Espaço para descrição curta',
      'Ideal para impressos e PDF',
    ],
    useCases: ['Lançamentos', 'Catálogos institucionais', 'Campanhas de marca', 'Produtos premium'],
    Component: VogueTemplate,
  },
  'editorial-magazine': {
    id: 'editorial-magazine',
    name: 'Magazine',
    family: 'editorial',
    description: '2 colunas, imagem 60/40, sidebar de detalhes',
    productsPerPage: 2,
    fonts: { heading: 'Instrument Serif', body: 'Inter' },
    defaultColors: { primary: '#1e293b', secondary: '#eab308', text: '#0f172a' },
    visualStyle: 'Editorial clássico',
    audience: 'Corporativo / Varejo',
    features: [
      'Duas colunas com imagem 60/40',
      'Sidebar de detalhes por produto',
      'Dois produtos por página',
      'Boa legibilidade em PDF',
    ],
    useCases: ['Coleções sazonais', 'Apresentações comerciais', 'Catálogos de linha'],
    Component: MagazineTemplate,
  },
  'editorial-hero-grid': {
    id: 'editorial-hero-grid',
    name: 'Hero Grid',
    family: 'editorial',
    description: 'Hero + 4 produtos coadjuvantes',
    productsPerPage: 5,
    fonts: { heading: 'DM Serif Display', body: 'Fira Sans' },
    defaultColors: { primary: '#111827', secondary: '#f97316', text: '#111827' },
    visualStyle: 'Modular',
    audience: 'Varejo / Eventos',
    features: [
      'Hero + 4 produtos coadjuvantes',
      'Grade modular equilibrada',
      'Cinco produtos por página',
      'Destaque natural para o item principal',
    ],
    useCases: ['Kits e combos', 'Campanhas de eventos', 'Promoções'],
    Component: HeroGridTemplate,
  },
  'editorial-mono': {
    id: 'editorial-mono',
    name: 'Mono',
    family: 'editorial',
    description: 'Preto e branco, foco absoluto na fotografia',
    productsPerPage: 1,
    fonts: { heading: 'Archivo Black', body: 'Hind' },
    defaultColors: { primary: '#000000', secondary: '#000000', text: '#000000' },
    visualStyle: 'Preto e branco',
    audience: 'Premium / Design',
    features: [
      'Foco absoluto na fotografia',
      'Tipografia display pesada',
      'Um produto por página',
      'Alto contraste para impressão',
    ],
    useCases: ['Produtos premium', 'Portfólio', 'Lançamentos exclusivos'],
    Component: MonoTemplate,
  },
  'editorial-manifesto': {
    id: 'editorial-manifesto',
    name: 'Manifesto',
    family: 'editorial',
    description: 'Página-manifesto em 3 fatias (30/40/30) — narrativa de coleção',
    productsPerPage: 2,
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    defaultColors: { primary: '#2e4a3a', secondary: '#e86f2e', text: '#1a1a1a' },
    visualStyle: 'Narrativo',
    audience: 'Marca / Sustentabilidade',
    features: [
      'Página em 3 fatias (30/40/30)',
      'Mensagem de marca em destaque',
      'Dois produtos por página',
      'Apelo emocional',
    ],
    useCases: ['Campanhas de marca', 'Linhas sustentáveis', 'Institucional'],
    Component: EditorialManifestoTemplate,
  },
  'catalog-grid-2x3': {
    id: 'catalog-grid-2x3',
    name: 'Catálogo 2×3',
    family: 'catalog',
    description: '6 produtos por página, foco em preço e código',
    productsPerPage: 6,
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    defaultColors: { primary: '#1a1a1a', secondary: '#e86f2e', text: '#1a1a1a' },
    visualStyle: 'Grade limpa',
    audience: 'Compras / Pedidos',
    features: [
      'Seis produtos por página',
      'Preço e código em destaque',
      'Leitura rápida em grade',
      'Densidade média',
    ],
    useCases: ['Catálogo geral', 'Listas de preço', 'Reposição'],
    Component: Grid2x3Template,
  },
  'catalog-grid-3x3': {
    id: 'catalog-grid-3x3',
    name: 'Catálogo 3×3',
    family: 'catalog',
    description: '9 produtos por página, densidade máxima',
    productsPerPage: 9,
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    defaultColors: { primary: '#1a1a1a', secondary: '#e86f2e', text: '#1a1a1a' },
    visualStyle: 'Alta densidade',
    audience: 'Compras / Atacado',
    features: [
      'Nove produtos por página',
      'Máxima densidade',
      'Códigos legíveis',
      'Menos páginas no PDF',
    ],
    useCases: ['Catálogo completo', 'Tabelas de preço', 'Distribuidores'],
    Component: Grid3x3Template,
  },
  'catalog-list': {
    id: 'catalog-list',
    name: 'Lista',
    family: 'catalog',
    description: 'Lista com thumb, specs completas e preço',
    productsPerPage: 5,
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    defaultColors: { primary: '#1a1a1a', secondary: '#e86f2e', text: '#1a1a1a' },
    visualStyle: 'Lista técnica',
    audience: 'Compras / Técnico',
    features: [
      'Thumb + specs completas',
      'Cinco produtos por página',
      'Dimensões e materiais',
      'Preço por linha',
    ],
    useCases: ['Fichas técnicas', 'Licitações', 'Cotações'],
    Component: ListTemplate,
  },
  'catalog-giftset': {
    id: 'catalog-giftset',
    name: 'Gift Set Showcase',
    family: 'catalog',
    description: 'Composição hero + tabela "Product includes" + variações — ideal p/ kits',
    productsPerPage: 8,
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    defaultColors: { primary: '#1a1a1a', secondary: '#2f6c6c', text: '#1a1a1a' },
    visualStyle: 'Showcase',
    audience: 'Kits / Presentes',
    features: [
      'Composição hero do kit',
      'Tabela "Product includes"',
      'Variações de cor',
      'Até oito itens por página',
    ],
    useCases: ['Kits corporativos', 'Presentes de fim de ano', 'Onboarding'],
    Component: GiftSetShowcaseTemplate,
  },
  'corporate-hero': {
    id: 'corporate-hero',
    name: 'Corporativo Hero',
    family: 'corporate',
    description: 'Capa com logo do cliente em destaque, produtos 2×2',
    productsPerPage: 4,
    fonts: { heading: 'Sora', body: 'Manrope' },
    defaultColors: { primary: '#0c2340', secondary: '#c9a84c', text: '#0c2340' },
    visualStyle: 'Corporativo',
    audience: 'B2B / Clientes-chave',
    features: [
      'Logo do cliente em destaque',
      'Produtos em grade 2×2',
      'Quatro produtos por página',
      'Paleta sóbria',
    ],
    useCases: ['Propostas B2B', 'Contas-chave', 'Programas de brindes'],
    Component: CorporateHeroTemplate,
  },
  'corporate-split': {
    id: 'corporate-split',
    name: 'Corporativo Split',
    family: 'corporate',
    description: 'Cabeçalho fixo com marca, 2 produtos por página',
    productsPerPage: 2,
    fonts: { heading: 'Space Grotesk', body: 'DM Sans' },
    defaultColors: { primary: '#1e3a5f', secondary: '#e11d48', text: '#0f172a' },
    visualStyle: 'Split screen',
    audience: 'B2B / Apresentações',
    features: [
      'Cabeçalho fixo com marca',
      'Dois produtos por página',
      'Blocos lado a lado',
      'Consistência página a página',
    ],
    useCases: ['Apresentações comerciais', 'Propostas', 'Material de vendas'],
    Component: CorporateSplitTemplate,
  },
  'corporate-executive': {
    id: 'corporate-executive',
    name: 'Executivo',
    family: 'corporate',
    description: 'Paleta sóbria, tipografia serifada + sans, alto padrão',
    productsPerPage: 3,
    fonts: { heading: 'Instrument Serif', body: 'Work Sans' },
    defaultColors: { primary: '#0d0d0d', secondary: '#c9a84c', text: '#111111' },
    visualStyle: 'Executivo',
    audience: 'Diretoria / Premium',
    features: [
      'Serifa + sans combinadas',
      'Três produtos por página',
      'Paleta escura sofisticada',
      'Alto padrão de acabamento',
    ],
    useCases: ['Apresentações executivas', 'Brindes VIP', 'Eventos corporativos'],
    Component: CorporateExecutiveTemplate,
  },
};

/**
 * Validação de invariantes do registry (T-N4).
 * Executa uma vez no import; falha loud em dev, log-only em prod para não
 * derrubar a página (fallback já protege via getTemplate).
 */
function validateRegistry(): void {
  for (const [id, entry] of Object.entries(TEMPLATE_REGISTRY)) {
    if (!Number.isInteger(entry.productsPerPage) || entry.productsPerPage <= 0) {
      const msg =
        `[TemplateRegistry] template "${id}" tem productsPerPage inválido ` +
        `(${entry.productsPerPage}). Deve ser inteiro > 0. Corrija em TEMPLATE_REGISTRY.`;
      if (import.meta.env?.DEV) throw new Error(msg);
      // prod: log estruturado, mas não quebra
      // eslint-disable-next-line no-console -- diagnóstico crítico único
      console.error(msg);
    }
    if (!entry.Component) {
      throw new Error(`[TemplateRegistry] template "${id}" sem Component.`);
    }
  }
}
validateRegistry();

export function getTemplate(id: MagazineTemplateId): TemplateEntry {
  return TEMPLATE_REGISTRY[id] ?? TEMPLATE_REGISTRY['editorial-vogue'];
}

export function listTemplates(): TemplateEntry[] {
  return Object.values(TEMPLATE_REGISTRY);
}

export function templatesByFamily(): Record<
  'catalog' | 'corporate' | 'editorial',
  TemplateEntry[]
> {
  const out = { editorial: [], catalog: [], corporate: [] } as Record<
    'catalog' | 'corporate' | 'editorial',
    TemplateEntry[]
  >;
  for (const t of listTemplates()) out[t.family].push(t);
  return out;
}
