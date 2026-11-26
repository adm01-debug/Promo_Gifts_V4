/**
 * Regras puras do catálogo de Ramos de Atividade (nichos) e Segmentos.
 *
 * Alimenta a aba "Ramos e segmentos" de /admin/cadastros — a primeira UI de
 * manutenção de `ramo_atividade` / `ramo_atividade_filho`. Até aqui o CRUD só
 * existia em hooks (`useRamoAtividade*`) e em banco: nenhuma tela alcançava
 * `ramo_atividadeService.createRamo/updateRamo/deleteRamo`.
 *
 * Invariantes de banco respeitadas aqui (evidência:
 * docs/db/BACKUP_SCHEMA_ONLY_2026-11-26.sql):
 *   - `ramo_atividade.slug` UNIQUE global (`ramo_atividade_slug_key`);
 *     `ramo_atividade_filho.slug` UNIQUE global (`ramo_atividade_filho_slug_key`).
 *   - `nome` VARCHAR(100) no ramo, VARCHAR(150) no segmento.
 *   - `ramo_atividade.cor` VARCHAR(7) e `icone` VARCHAR(50), com default.
 *   - FKs ON DELETE CASCADE: ramo -> segmentos -> produto_ramo_atividade.
 *     Excluir ramo apaga segmentos E vínculos de produto (por isso a tela
 *     calcula o impacto antes de confirmar).
 */
import type { RamoAtividade, RamoAtividadeFilho } from '@/types/ramo-atividade';

export const RAMO_NOME_MAX = 100;
export const RAMO_SLUG_MAX = 100;
export const RAMO_ICONE_MAX = 50;
export const SEGMENTO_NOME_MAX = 150;
export const SEGMENTO_SLUG_MAX = 150;
export const RAMO_COR_PADRAO = '#6366f1';
export const RAMO_ICONE_PADRAO = 'building';

/** Identificadores de ícone aceitos hoje pelo catálogo (valor gravado em `icone`). */
export const RAMO_ICONES: readonly { valor: string; rotulo: string }[] = [
  { valor: 'building', rotulo: 'Prédio / genérico' },
  { valor: 'store', rotulo: 'Loja / varejo' },
  { valor: 'utensils', rotulo: 'Alimentação' },
  { valor: 'stethoscope', rotulo: 'Saúde' },
  { valor: 'graduation-cap', rotulo: 'Educação' },
  { valor: 'car', rotulo: 'Automotivo' },
  { valor: 'hammer', rotulo: 'Construção' },
  { valor: 'heart-pulse', rotulo: 'Bem-estar' },
  { valor: 'palette', rotulo: 'Criativo / brindes' },
  { valor: 'briefcase', rotulo: 'Corporativo' },
  { valor: 'truck', rotulo: 'Logística' },
  { valor: 'shopping-bag', rotulo: 'Compras' },
];

/** Cores sugeridas para o badge do nicho no filtro (mesma paleta do design system). */
export const RAMO_CORES_SUGERIDAS: readonly string[] = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#64748b',
];

const SLUG_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_VALIDO = /^#[0-9a-f]{6}$/;
const DIACRITICOS = /[\u0300-\u036f]/g;
const ESPACOS = /\s+/g;

export interface RamoComSegmentos {
  ramo: RamoAtividade;
  segmentos: RamoAtividadeFilho[];
}

export interface RamoFormValues {
  nome: string;
  slug: string;
  descricao: string;
  icone: string;
  cor: string;
  ativo: boolean;
  ordem: string;
}

export interface SegmentoFormValues {
  ramoId: string;
  nome: string;
  slug: string;
  descricao: string;
  icone: string;
  ativo: boolean;
  ordem: string;
}

export interface RamoErros {
  nome?: string;
  slug?: string;
  icone?: string;
  cor?: string;
  ordem?: string;
}

export interface SegmentoErros {
  ramoId?: string;
  nome?: string;
  slug?: string;
  icone?: string;
  ordem?: string;
}

export type RamoValidacao =
  { ok: false; erros: RamoErros } | { ok: true; valores: Partial<RamoAtividade> };

export type SegmentoValidacao =
  { ok: false; erros: SegmentoErros } | { ok: true; valores: Partial<RamoAtividadeFilho> };

export interface ContextoValidacaoRamo {
  /** Slugs de OUTROS ramos (o próprio registro em edição deve ser excluído). */
  slugsOcupados: readonly string[];
}

export interface ContextoValidacaoSegmento {
  ramosConhecidos: readonly string[];
  /** Slugs de OUTROS segmentos (qualquer ramo — o índice é global). */
  slugsOcupados: readonly string[];
}

export interface ResumoRamos {
  ramos: number;
  ramosAtivos: number;
  ramosInativos: number;
  segmentos: number;
  segmentosAtivos: number;
  segmentosInativos: number;
  ramosSemSegmento: number;
}

export interface ImpactoExclusao {
  segmentos: number;
  segmentosAtivos: number;
  produtos: number;
}

export type AlvoExclusao = 'ramo' | 'segmento';

/** Colapsa espaços e apara as pontas (o banco não normaliza nada disso). */
export function normalizarTexto(valor: string): string {
  return valor.replace(ESPACOS, ' ').trim();
}

/** Slug estável: sem acentos, minúsculo, separado por hífen simples. */
export function slugify(valor: string): string {
  return normalizarTexto(valor)
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isHexColor(valor: string): boolean {
  return HEX_VALIDO.test(normalizarTexto(valor).toLowerCase());
}

/** Próxima posição livre na convenção de `ordem` (0 = primeira). */
export function proximaOrdem(itens: readonly { ordem: number }[]): number {
  return itens.reduce((maior, item) => (item.ordem > maior ? item.ordem : maior), 0) + 1;
}

/** Slug livre para o nome informado — evita o 23505 do índice UNIQUE. */
export function sugerirSlug(nome: string, ocupados: readonly string[]): string {
  const base = slugify(nome);
  if (!base) return '';
  const usados = new Set(ocupados.map((slug) => slug.toLowerCase()));
  if (!usados.has(base)) return base;
  let sufixo = 2;
  while (usados.has(`${base}-${sufixo}`)) sufixo += 1;
  return `${base}-${sufixo}`;
}

export function ordenarRamos(ramos: readonly RamoAtividade[]): RamoAtividade[] {
  return [...ramos].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function ordenarSegmentos(segmentos: readonly RamoAtividadeFilho[]): RamoAtividadeFilho[] {
  return [...segmentos].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Monta a árvore ramo -> segmentos já ordenada por `ordem` e nome. */
export function montarArvore(
  ramos: readonly RamoAtividade[],
  segmentos: readonly RamoAtividadeFilho[],
): RamoComSegmentos[] {
  const porRamo = new Map<string, RamoAtividadeFilho[]>();
  segmentos.forEach((segmento) => {
    const atual = porRamo.get(segmento.ramo_atividade_id);
    if (atual) {
      atual.push(segmento);
    } else {
      porRamo.set(segmento.ramo_atividade_id, [segmento]);
    }
  });

  return ordenarRamos(ramos).map((ramo) => ({
    ramo,
    segmentos: ordenarSegmentos(porRamo.get(ramo.id) ?? []),
  }));
}

export interface FiltrosCatalogo {
  busca: string;
  incluirInativos: boolean;
}

/**
 * Busca casa ramo (nome/slug) e segmento (nome/slug): procurar "padaria"
 * devolve o ramo cujo segmento casa, já recortado para os segmentos que casam.
 */
export function filtrarArvore(
  arvore: readonly RamoComSegmentos[],
  filtros: FiltrosCatalogo,
): RamoComSegmentos[] {
  const termo = normalizarTexto(filtros.busca).toLowerCase();
  const resultado: RamoComSegmentos[] = [];

  for (const no of arvore) {
    if (!filtros.incluirInativos && !no.ramo.ativo) continue;
    const visiveis = filtros.incluirInativos
      ? no.segmentos
      : no.segmentos.filter((segmento) => segmento.ativo);

    if (!termo) {
      resultado.push({ ramo: no.ramo, segmentos: visiveis });
      continue;
    }

    const ramoCasa = `${no.ramo.nome} ${no.ramo.slug}`.toLowerCase().includes(termo);
    if (ramoCasa) {
      resultado.push({ ramo: no.ramo, segmentos: visiveis });
      continue;
    }

    const segmentosCasados = visiveis.filter((segmento) =>
      `${segmento.nome} ${segmento.slug}`.toLowerCase().includes(termo),
    );
    if (segmentosCasados.length > 0) {
      resultado.push({ ramo: no.ramo, segmentos: segmentosCasados });
    }
  }

  return resultado;
}

export function resumirRamos(arvore: readonly RamoComSegmentos[]): ResumoRamos {
  let ramos = 0;
  let ramosAtivos = 0;
  let segmentos = 0;
  let segmentosAtivos = 0;
  let ramosSemSegmento = 0;

  for (const no of arvore) {
    ramos += 1;
    if (no.ramo.ativo) ramosAtivos += 1;
    if (no.segmentos.length === 0) ramosSemSegmento += 1;
    segmentos += no.segmentos.length;
    segmentosAtivos += no.segmentos.filter((segmento) => segmento.ativo).length;
  }

  return {
    ramos,
    ramosAtivos,
    ramosInativos: ramos - ramosAtivos,
    segmentos,
    segmentosAtivos,
    segmentosInativos: segmentos - segmentosAtivos,
    ramosSemSegmento,
  };
}

function ordemValida(valor: string): number | null {
  const texto = normalizarTexto(valor);
  if (!texto) return 0;
  const numero = Number.parseInt(texto, 10);
  if (!Number.isInteger(numero) || numero < 0) return null;
  return numero;
}

export function validarRamo(
  valores: RamoFormValues,
  contexto: ContextoValidacaoRamo,
): RamoValidacao {
  const erros: RamoErros = {};

  const nome = normalizarTexto(valores.nome);
  if (!nome) {
    erros.nome = 'Informe o nome do ramo.';
  } else if (nome.length > RAMO_NOME_MAX) {
    erros.nome = `O nome aceita no máximo ${RAMO_NOME_MAX} caracteres.`;
  }

  const slug = normalizarTexto(valores.slug).toLowerCase() || slugify(nome);
  if (!slug) {
    erros.slug = 'Informe o identificador (slug) do ramo.';
  } else if (slug.length > RAMO_SLUG_MAX) {
    erros.slug = `O identificador aceita no máximo ${RAMO_SLUG_MAX} caracteres.`;
  } else if (!SLUG_VALIDO.test(slug)) {
    erros.slug = 'Use apenas letras minúsculas, números e hífen (ex.: loja-de-roupas).';
  } else if (contexto.slugsOcupados.some((ocupado) => ocupado.toLowerCase() === slug)) {
    erros.slug = 'Já existe outro ramo com este identificador.';
  }

  const cor = normalizarTexto(valores.cor).toLowerCase() || RAMO_COR_PADRAO;
  if (!isHexColor(cor)) {
    erros.cor = 'Use uma cor hexadecimal de 6 dígitos (ex.: #6366f1).';
  }

  const icone = normalizarTexto(valores.icone) || RAMO_ICONE_PADRAO;
  if (icone.length > RAMO_ICONE_MAX) {
    erros.icone = `O ícone aceita no máximo ${RAMO_ICONE_MAX} caracteres.`;
  }

  const ordem = ordemValida(valores.ordem);
  if (ordem === null) {
    erros.ordem = 'A ordem deve ser um número inteiro maior ou igual a 0.';
  }

  if (Object.keys(erros).length > 0) {
    return { ok: false, erros };
  }

  return {
    ok: true,
    valores: {
      nome,
      slug,
      descricao: normalizarTexto(valores.descricao) || null,
      icone,
      cor,
      ativo: valores.ativo,
      ordem: ordem ?? 0,
    },
  };
}

export function validarSegmento(
  valores: SegmentoFormValues,
  contexto: ContextoValidacaoSegmento,
): SegmentoValidacao {
  const erros: SegmentoErros = {};

  const ramoId = normalizarTexto(valores.ramoId);
  if (!ramoId) {
    erros.ramoId = 'Escolha o ramo ao qual o segmento pertence.';
  } else if (!contexto.ramosConhecidos.includes(ramoId)) {
    erros.ramoId = 'Ramo não encontrado na lista. Recarregue a tela.';
  }

  const nome = normalizarTexto(valores.nome);
  if (!nome) {
    erros.nome = 'Informe o nome do segmento.';
  } else if (nome.length > SEGMENTO_NOME_MAX) {
    erros.nome = `O nome aceita no máximo ${SEGMENTO_NOME_MAX} caracteres.`;
  }

  const slug = normalizarTexto(valores.slug).toLowerCase() || slugify(nome);
  if (!slug) {
    erros.slug = 'Informe o identificador (slug) do segmento.';
  } else if (slug.length > SEGMENTO_SLUG_MAX) {
    erros.slug = `O identificador aceita no máximo ${SEGMENTO_SLUG_MAX} caracteres.`;
  } else if (!SLUG_VALIDO.test(slug)) {
    erros.slug = 'Use apenas letras minúsculas, números e hífen (ex.: loja-de-roupas).';
  } else if (contexto.slugsOcupados.some((ocupado) => ocupado.toLowerCase() === slug)) {
    erros.slug = 'Já existe outro segmento com este identificador.';
  }

  const icone = normalizarTexto(valores.icone);
  if (icone.length > RAMO_ICONE_MAX) {
    erros.icone = `O ícone aceita no máximo ${RAMO_ICONE_MAX} caracteres.`;
  }

  const ordem = ordemValida(valores.ordem);
  if (ordem === null) {
    erros.ordem = 'A ordem deve ser um número inteiro maior ou igual a 0.';
  }

  if (Object.keys(erros).length > 0) {
    return { ok: false, erros };
  }

  return {
    ok: true,
    valores: {
      ramo_atividade_id: ramoId,
      nome,
      slug,
      descricao: normalizarTexto(valores.descricao) || null,
      icone: icone || null,
      ativo: valores.ativo,
      ordem: ordem ?? 0,
    },
  };
}

/** Soma os vínculos de produto dos segmentos de um ramo (cascade real do banco). */
export function impactoExclusaoRamo(
  segmentos: readonly RamoAtividadeFilho[],
  produtosPorSegmento: ReadonlyMap<string, number>,
): ImpactoExclusao {
  let produtos = 0;
  segmentos.forEach((segmento) => {
    produtos += produtosPorSegmento.get(segmento.id) ?? 0;
  });
  return {
    segmentos: segmentos.length,
    segmentosAtivos: segmentos.filter((segmento) => segmento.ativo).length,
    produtos,
  };
}

export function impactoExclusaoSegmento(produtos: number): ImpactoExclusao {
  return { segmentos: 0, segmentosAtivos: 0, produtos };
}

function concordar(total: number, singular: string, plural: string): string {
  return total === 1 ? singular : plural;
}

function formatarQuantidade(total: number): string {
  return total.toLocaleString('pt-BR');
}

/** Linhas do aviso destrutivo — nomeiam o cascade que o banco vai aplicar. */
export function descreverImpacto(impacto: ImpactoExclusao, alvo: AlvoExclusao): string[] {
  const linhas: string[] = [];

  if (alvo === 'ramo') {
    if (impacto.segmentos === 0) {
      linhas.push('Nenhum segmento está ligado a este ramo.');
    } else {
      linhas.push(
        `${impacto.segmentos} ${concordar(
          impacto.segmentos,
          'segmento é apagado',
          'segmentos são apagados',
        )} junto com o ramo (vínculo em cascata).`,
      );
    }
    if (impacto.segmentosAtivos > 0) {
      linhas.push(
        `${impacto.segmentosAtivos} ${concordar(
          impacto.segmentosAtivos,
          'segmento ativo deixa',
          'segmentos ativos deixam',
        )} de aparecer no filtro de nichos da loja.`,
      );
    }
  }

  linhas.push(
    impacto.produtos === 0
      ? 'Nenhum produto está usando este item hoje.'
      : `${formatarQuantidade(impacto.produtos)} ${concordar(
          impacto.produtos,
          'vínculo de produto é apagado',
          'vínculos de produto são apagados',
        )} — o produto fica sem este nicho.`,
  );
  linhas.push('Esta ação não pode ser desfeita.');

  return linhas;
}

export function valoresIniciaisRamo(
  ramo: RamoAtividade | undefined,
  ordemSugerida: number,
): RamoFormValues {
  return {
    nome: ramo?.nome ?? '',
    slug: ramo?.slug ?? '',
    descricao: ramo?.descricao ?? '',
    icone: ramo?.icone ?? RAMO_ICONE_PADRAO,
    cor: ramo?.cor ?? RAMO_COR_PADRAO,
    ativo: ramo?.ativo ?? true,
    ordem: String(ramo ? ramo.ordem : ordemSugerida),
  };
}

export function valoresIniciaisSegmento(
  ramoId: string,
  segmento: RamoAtividadeFilho | undefined,
  ordemSugerida: number,
): SegmentoFormValues {
  return {
    ramoId: segmento?.ramo_atividade_id ?? ramoId,
    nome: segmento?.nome ?? '',
    slug: segmento?.slug ?? '',
    descricao: segmento?.descricao ?? '',
    icone: segmento?.icone ?? '',
    ativo: segmento?.ativo ?? true,
    ordem: String(segmento ? segmento.ordem : ordemSugerida),
  };
}
