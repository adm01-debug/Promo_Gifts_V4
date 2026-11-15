/**
 * useClientBrandSignals — traduz o cliente do CRM nos dois sinais de marca que
 * o "Encaixe do Cliente" usa na fase 1: o RAMO e as CORES DA LOGO.
 *
 * ZERO chamada de IA. Isso é arquitetura, não economia: a chave da IA do
 * sistema está inválida (401 em 41 de 41 chamadas), então tudo que dependesse
 * dela nasceria morto. Quem traduz o ramo é uma tabela curada
 * (`@/lib/assistant/ramoAliases`); quem casa a cor é Delta-E CIE76 contra
 * `color_groups` (`@/lib/assistant/logoColorToGroups`). Nenhum dos dois
 * adivinha: quando não há correspondência honesta, o sinal fica DESLIGADO.
 *
 * Fontes, todas já existentes:
 *   • cliente  → `useCrmCompany` (edge `crm-db-bridge`, que já aplica o escopo
 *                por vendedor). O CRM externo NÃO é consultado por outro
 *                caminho, nem aqui nem em lugar nenhum.
 *   • ramos    → `useRamosAtividade` (22 linhas de `ramo_atividade`, medido em
 *                2026-11-15 no canônico), usado como catálogo de IDs.
 *   • cores    → `useColorSystem` (18 linhas ativas de `color_groups`, idem).
 *
 * Os dois catálogos são tabelas de referência globais com cache longo
 * (`staleTime` de 1h em ambos os hooks) e já são carregadas pelas telas de
 * catálogo. Reaproveitá-las custa zero requisição extra na prática e evita
 * duplicar consulta — por isso este hook não refaz a busca por conta própria.
 */

import { useMemo } from 'react';

import { useCrmCompany } from '@/hooks/crm/useCrmCompanies';
import { useRamosAtividade } from '@/hooks/crm/useRamoAtividade';
import { useColorSystem } from '@/hooks/products/useColorSystem';
import {
  DELTA_E_CONFIANCA,
  logoColorToGroups,
  normalizarHex,
  type EncaixeDeCor,
  type GrupoDeCorCatalogo,
} from '@/lib/assistant/logoColorToGroups';
import { normalizeRamo, type ConfiancaRamo, type RamoCatalogo } from '@/lib/assistant/ramoAliases';
import type { CrmCompany } from '@/types/crm';

/**
 * Colunas do CRM que podem guardar a cor da marca, na ordem em que são
 * tentadas. As duas estão na allowlist de
 * `supabase/functions/crm-db-bridge/query-policy.ts` (linhas 76 e 111) — a
 * edge recusaria qualquer coluna fora dela.
 *
 * `logo_color_url` (linha 95 da mesma allowlist) foi deliberadamente DEIXADA
 * DE FORA: é a URL de uma imagem, e extrair cor de imagem exigiria visão
 * computacional ou IA. Isso é fase 3.
 *
 * NÃO VERIFICADO: o formato gravado nessas duas colunas. O CRM só pode ser
 * lido pela edge `crm-db-bridge`, e este agente não tem sessão de vendedor
 * para invocá-la. Por isso o extrator abaixo aceita toda forma plausível de
 * JSON (lista, objeto, texto separado por vírgula) e devolve lista vazia para
 * o que não souber ler, em vez de supor um formato.
 */
export const COLUNAS_DE_COR_DA_MARCA = ['brand_colors', 'cores_marca'] as const;

/** Chaves que, dentro de um objeto do CRM, costumam guardar o hex. */
const CHAVES_DE_HEX = ['hex', 'hex_code', 'hexCode', 'color', 'cor', 'value', 'valor'] as const;

/** Profundidade máxima ao descer em estruturas aninhadas vindas do CRM. */
const PROFUNDIDADE_MAXIMA = 3;

/** Teto de cores lidas da marca: logo com mais que isso é arte, não paleta. */
const MAXIMO_DE_HEXES = 8;

/**
 * Corte de Delta-E para o sinal de cor valer.
 *
 * `aproximada` (30) é o último degrau em que o grupo ainda é da MESMA FAMÍLIA
 * da cor da logo — acima disso a classificação da camada base é `distante`, e
 * recomendar por cor distante seria inventar encaixe.
 */
const DELTA_E_MAXIMO_DO_SINAL = DELTA_E_CONFIANCA.aproximada;

/** Quantos grupos de cor no máximo viram sinal. */
const MAXIMO_DE_GRUPOS_DE_COR = 3;

/** Resultado da tradução: o que o banco precisa saber sobre este cliente. */
export interface SinaisDaMarcaDoCliente {
  /** ID da empresa no CRM, ou `null` quando a ficha ainda não tem cliente. */
  readonly clienteId: string | null;
  /** `companies.ramo_atividade` como veio do CRM, sem tradução. */
  readonly ramoTextoCrm: string | null;
  /** `ramo_atividade.id` do ramo pai, ou `null` se não houve tradução. */
  readonly ramoPaiId: string | null;
  /** Nome canônico do ramo pai, ou `null` se não houve tradução. */
  readonly ramoNome: string | null;
  readonly confiancaRamo: ConfiancaRamo;
  /** Hexes da marca, normalizados em `#rrggbb`; vazio quando não há cor. */
  readonly hexesDaLogo: readonly string[];
  /** Encaixes Delta-E contra `color_groups`, do mais próximo ao mais distante. */
  readonly encaixesDeCor: readonly EncaixeDeCor[];
  /** `color_groups.id` dos encaixes, prontos para a RPC. */
  readonly colorGroupIds: readonly string[];
  /** `true` só quando há pelo menos um grupo de cor casado. */
  readonly corLigada: boolean;
  /** `true` quando há ramo OU cor — é o que habilita a busca de candidatos. */
  readonly temSinalSuficiente: boolean;
}

export interface UseClientBrandSignalsResult {
  readonly sinais: SinaisDaMarcaDoCliente;
  /** `true` enquanto cliente ou catálogos ainda estão carregando. */
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  /** `false` quando a busca terminou e o CRM não devolveu a empresa. */
  readonly clienteEncontrado: boolean;
}

const SEM_SINAIS: SinaisDaMarcaDoCliente = {
  clienteId: null,
  ramoTextoCrm: null,
  ramoPaiId: null,
  ramoNome: null,
  confiancaRamo: 'baixa',
  hexesDaLogo: [],
  encaixesDeCor: [],
  colorGroupIds: [],
  corLigada: false,
  temSinalSuficiente: false,
};

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

/** Tenta ler um texto como JSON; devolve `undefined` quando não é JSON. */
function comoJson(texto: string): unknown {
  const aparado = texto.trim();
  if (!aparado.startsWith('[') && !aparado.startsWith('{')) return undefined;
  try {
    return JSON.parse(aparado) as unknown;
  } catch {
    return undefined;
  }
}

function coletarDeTexto(texto: string, destino: string[], profundidade: number): void {
  const json = comoJson(texto);
  if (json !== undefined) {
    coletar(json, destino, profundidade + 1);
    return;
  }
  // Formato plano: "#0057B8, #E30613" ou "#0057B8;#E30613" ou "#0057B8 #E30613".
  for (const parte of texto.split(/[\s,;|]+/)) {
    const hex = normalizarHex(parte);
    if (hex && !destino.includes(hex)) destino.push(hex);
  }
}

function coletarDeObjeto(
  objeto: Record<string, unknown>,
  destino: string[],
  profundidade: number,
): void {
  for (const chave of CHAVES_DE_HEX) {
    const hex = normalizarHex(objeto[chave]);
    if (hex) {
      if (!destino.includes(hex)) destino.push(hex);
      return;
    }
  }
  for (const valor of Object.values(objeto)) {
    coletar(valor, destino, profundidade + 1);
  }
}

function coletar(valor: unknown, destino: string[], profundidade: number): void {
  if (profundidade > PROFUNDIDADE_MAXIMA || destino.length >= MAXIMO_DE_HEXES) return;

  if (typeof valor === 'string') {
    const direto = normalizarHex(valor);
    if (direto) {
      if (!destino.includes(direto)) destino.push(direto);
      return;
    }
    coletarDeTexto(valor, destino, profundidade);
    return;
  }

  if (Array.isArray(valor)) {
    for (const item of valor) coletar(item, destino, profundidade + 1);
    return;
  }

  if (ehObjeto(valor)) coletarDeObjeto(valor, destino, profundidade);
}

/**
 * Extrai os hexes da marca de um valor do CRM de formato não garantido.
 *
 * Aceita, em qualquer combinação: `'#0057B8'`, `'#0057B8, #E30613'`,
 * `['#0057B8']`, `'["#0057B8"]'`, `[{ hex: '#0057B8' }]`,
 * `{ primaria: '#0057B8' }`. Devolve `[]` para `null`, `undefined`, texto
 * ilegível e qualquer forma que não contenha hex válido — nunca inventa cor.
 *
 * Os hexes saem normalizados em `#rrggbb` minúsculo, sem repetição, na ordem
 * em que aparecem, e no máximo {@link MAXIMO_DE_HEXES}.
 */
export function extrairHexesDaMarca(bruto: unknown): string[] {
  const destino: string[] = [];
  coletar(bruto, destino, 0);
  return destino.slice(0, MAXIMO_DE_HEXES);
}

/** Lê as colunas de cor da empresa, na ordem de preferência, e para na primeira que render hex. */
export function hexesDaMarcaDaEmpresa(empresa: CrmCompany | null | undefined): string[] {
  if (!empresa) return [];
  for (const coluna of COLUNAS_DE_COR_DA_MARCA) {
    const hexes = extrairHexesDaMarca(empresa[coluna]);
    if (hexes.length > 0) return hexes;
  }
  return [];
}

function comoCatalogoDeRamos(ramos: readonly { id: string; nome: string }[]): RamoCatalogo[] {
  return ramos.map((ramo) => ({ id: ramo.id, nome: ramo.nome }));
}

function comoCatalogoDeCores(
  grupos: readonly { id: string; name: string; hex_code: string | null }[],
): GrupoDeCorCatalogo[] {
  return grupos.map((grupo) => ({
    id: grupo.id,
    name: grupo.name,
    hex_code: grupo.hex_code,
  }));
}

function primeiroErro(...valores: unknown[]): Error | null {
  for (const valor of valores) {
    if (valor instanceof Error) return valor;
    if (valor) return new Error(String(valor));
  }
  return null;
}

/**
 * Resolve ramo e cores da marca do cliente.
 *
 * @param clientId `companies.id` no CRM. Sem ele o hook não busca nada e
 *                 devolve os sinais zerados.
 */
export function useClientBrandSignals(
  clientId: string | null | undefined,
): UseClientBrandSignalsResult {
  const temCliente = !!clientId;

  const empresaQuery = useCrmCompany(clientId);
  const ramosQuery = useRamosAtividade();
  const coresQuery = useColorSystem();

  const sinais = useMemo<SinaisDaMarcaDoCliente>(() => {
    const empresa = empresaQuery.data;
    if (!temCliente || !empresa) return SEM_SINAIS;

    const ramoTextoCrm = empresa.ramo_atividade ?? null;
    const ramo = normalizeRamo(ramoTextoCrm, comoCatalogoDeRamos(ramosQuery.data ?? []));

    const hexesDaLogo = hexesDaMarcaDaEmpresa(empresa);
    const gruposDeCor = comoCatalogoDeCores(coresQuery.data?.groups ?? []);
    const encaixesDeCor =
      hexesDaLogo.length > 0 && gruposDeCor.length > 0
        ? logoColorToGroups(hexesDaLogo, gruposDeCor, {
            limite: MAXIMO_DE_GRUPOS_DE_COR,
            deltaEMaximo: DELTA_E_MAXIMO_DO_SINAL,
          })
        : [];
    const colorGroupIds = encaixesDeCor.map((encaixe) => encaixe.colorGroupId);

    return {
      clienteId: clientId ?? null,
      ramoTextoCrm,
      ramoPaiId: ramo.ramoPaiId,
      ramoNome: ramo.nome,
      confiancaRamo: ramo.confianca,
      hexesDaLogo,
      encaixesDeCor,
      colorGroupIds,
      corLigada: colorGroupIds.length > 0,
      temSinalSuficiente: !!ramo.ramoPaiId || colorGroupIds.length > 0,
    };
  }, [clientId, temCliente, empresaQuery.data, ramosQuery.data, coresQuery.data]);

  const isLoading =
    temCliente && (empresaQuery.isLoading || ramosQuery.isLoading || coresQuery.isLoading);
  const error = temCliente
    ? primeiroErro(empresaQuery.error, ramosQuery.error, coresQuery.error)
    : null;

  return {
    sinais,
    isLoading,
    isError: !!error,
    error,
    clienteEncontrado: temCliente && !empresaQuery.isLoading && !!empresaQuery.data,
  };
}
