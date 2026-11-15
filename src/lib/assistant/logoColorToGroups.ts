/**
 * Encaixe do Cliente — base de cor.
 *
 * Casa as cores da marca do cliente com os grupos de cor do catálogo
 * (`color_groups`) por Delta-E CIE76, devolvendo os `color_group_id` mais
 * próximos. É o insumo do sinal "cor da logo" (peso 25) do score de encaixe.
 *
 * Puro de propósito: sem rede, sem banco em tempo de execução, sem React.
 * Quem lê `color_groups` é a camada de dados; aqui entra a lista já carregada.
 * Assim o sinal de cor é testável sem subir Supabase e sem depender da IA
 * (que está com a chave inválida — a fase 1 não chama IA).
 *
 * MEDIÇÕES no banco canônico `doufsxqlfjyuvxuezpln` (2026-11-15), que
 * justificam cada decisão defensiva deste arquivo:
 *   • `color_groups` tem 18 linhas, todas com `is_active = true`;
 *   • as colunas reais são `name` e `hex_code` — não `nome`/`hex`;
 *   • `hex_code` é NULLABLE e as únicas constraints UNIQUE são
 *     `(organization_id, name)` e `slug`: nada impede hex ausente nem dois
 *     grupos com o mesmo hex, então o código trata os dois casos;
 *   • `Transparente` está gravado em minúsculas (`#d8d8d8`) enquanto os
 *     outros 17 estão em maiúsculas: a comparação é case-insensitive por
 *     obrigação do dado, não por gosto;
 *   • `Colorido` (#ABABAB) e `Transparente` (#d8d8d8) são pseudo-cores com
 *     hex de cinza médio: atraem qualquer logo acinzentada. Este módulo não
 *     os esconde — quem chama decide se os remove da lista antes de passar.
 */

import { deltaE, hexToRgb, rgbToLab } from '@/utils/color-matching';

/** Linha de `color_groups` como esta camada precisa dela. */
export interface GrupoDeCorCatalogo {
  id: string;
  name: string;
  /** `hex_code` da tabela; nullable no schema. */
  hex_code: string | null;
  /** `is_active` da tabela; quando vier `false`, o grupo é descartado. */
  is_active?: boolean | null;
}

/**
 * Quão perto a cor da logo ficou do hex do grupo. Ordem alfabética por
 * exigência do lint (`sort-type-constituents`); a ordem semântica, da mais
 * perto para a mais longe, é exata → proxima → aproximada → distante.
 */
export type ConfiancaDeCor = 'aproximada' | 'distante' | 'exata' | 'proxima';

export interface EncaixeDeCor {
  colorGroupId: string;
  nomeDoGrupo: string;
  /** Hex do grupo, normalizado em `#rrggbb` minúsculo. */
  hexDoGrupo: string;
  /** Hex da logo que produziu este encaixe, normalizado. */
  hexDaLogo: string;
  deltaE: number;
  confianca: ConfiancaDeCor;
}

export interface OpcoesDeEncaixeDeCor {
  /** Quantos grupos devolver, do mais próximo ao mais distante. Padrão 3. */
  limite?: number;
  /** Descarta encaixes acima deste Delta-E. Padrão: sem corte. */
  deltaEMaximo?: number;
}

/**
 * Faixas de confiança calibradas na distribuição REAL de distâncias deste
 * catálogo, medida sobre 140.608 cores amostradas do cubo RGB contra os 18
 * grupos: p10 = 12,74 · p50 = 26,76 · p90 = 39,79 · máx = 62,26.
 *
 * Com 18 baldes para o espaço inteiro, o catálogo é grosso: o limiar clássico
 * de 2,3 (JND, usado no casamento Pantone de `color-matching.ts`) só se aplica
 * ao caso em que a logo usa literalmente o hex do grupo. Por isso as faixas
 * seguintes vêm dos percentis medidos, não da literatura de Pantone.
 */
export const DELTA_E_CONFIANCA = {
  /** Abaixo do limiar de percepção (JND CIE76): é a mesma cor. */
  exata: 2.3,
  /** Mais perto que 90% das cores conseguem chegar (medido: p10 = 12,74). */
  proxima: 12,
  /** Dentro da mediana do catálogo (medido: p50 = 26,76): família certa. */
  aproximada: 30,
} as const;

const LIMITE_PADRAO = 3;

/** Grupo já validado, com Lab pré-calculado. */
interface GrupoPreparado {
  id: string;
  name: string;
  hex: string;
  lab: [number, number, number];
}

/**
 * Normaliza um hex para `#rrggbb` minúsculo.
 *
 * Aceita `#RRGGBB`, `RRGGBB`, `#RGB` e `RGB`, em qualquer caixa, com espaços
 * em volta. Devolve `null` para qualquer outra coisa — inclusive `''`,
 * `#12345`, `#ZZZZZZ` e valores não-string vindos de JSON do CRM.
 *
 * Exportada porque `hexToRgb` de `@/utils/color-matching` usa `parseInt` sem
 * validar: `hexToRgb('#ZZZZZZ')` devolve `[NaN, NaN, NaN]` e contamina o
 * Delta-E com NaN. Quem chama valida aqui ANTES de converter, e pode usar
 * esta função para avisar o vendedor de que a logo tem cor ilegível.
 */
export function normalizarHex(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;

  const limpo = valor.trim().replace(/^#/, '');

  if (/^[0-9a-f]{6}$/i.test(limpo)) return `#${limpo.toLowerCase()}`;

  if (/^[0-9a-f]{3}$/i.test(limpo)) {
    const [r, g, b] = limpo.toLowerCase();
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return null;
}

/** Classifica a distância nas faixas medidas para este catálogo. */
export function classificarConfianca(distancia: number): ConfiancaDeCor {
  if (distancia <= DELTA_E_CONFIANCA.exata) return 'exata';
  if (distancia <= DELTA_E_CONFIANCA.proxima) return 'proxima';
  if (distancia <= DELTA_E_CONFIANCA.aproximada) return 'aproximada';
  return 'distante';
}

/**
 * Descarta grupos inativos ou sem hex utilizável e pré-calcula o Lab.
 * Grupos repetidos (mesmo `id`) entram uma vez só — a primeira ocorrência
 * vence, para o resultado não depender da ordem de paginação de quem leu.
 */
function prepararGrupos(grupos: readonly GrupoDeCorCatalogo[]): GrupoPreparado[] {
  const porId = new Map<string, GrupoPreparado>();

  for (const grupo of grupos) {
    if (grupo.is_active === false) continue;
    if (porId.has(grupo.id)) continue;

    const hex = normalizarHex(grupo.hex_code);
    if (hex === null) continue;

    porId.set(grupo.id, {
      id: grupo.id,
      name: grupo.name,
      hex,
      lab: rgbToLab(...hexToRgb(hex)),
    });
  }

  return [...porId.values()];
}

/**
 * Ordem determinística do resultado: menor Delta-E primeiro e, em empate
 * exato, nome e depois id — comparação de string crua, não `localeCompare`,
 * que depende do locale do runtime e deixaria o teste verde numa máquina e
 * vermelho em outra. Empate exato é possível: o schema não tem UNIQUE em
 * `hex_code`, então dois grupos podem carregar o mesmo hex.
 */
function compararEncaixes(a: EncaixeDeCor, b: EncaixeDeCor): number {
  if (a.deltaE !== b.deltaE) return a.deltaE - b.deltaE;
  if (a.nomeDoGrupo !== b.nomeDoGrupo) return a.nomeDoGrupo < b.nomeDoGrupo ? -1 : 1;
  if (a.colorGroupId === b.colorGroupId) return 0;
  return a.colorGroupId < b.colorGroupId ? -1 : 1;
}

/**
 * Devolve os grupos de cor mais próximos das cores da marca do cliente.
 *
 * Cada grupo aparece no máximo uma vez, com a MENOR distância entre ele e
 * qualquer uma das cores da logo (uma logo de três cores não ocupa o ranking
 * inteiro com o mesmo grupo). Hex ilegível da logo é ignorado; lista vazia de
 * um lado ou do outro devolve `[]` — nunca `null`, nunca exceção, para a tela
 * poder tratar o vazio como estado e não como erro.
 */
export function logoColorToGroups(
  hexesDaLogo: readonly unknown[],
  gruposDeCor: readonly GrupoDeCorCatalogo[],
  opcoes: OpcoesDeEncaixeDeCor = {},
): EncaixeDeCor[] {
  const limite = opcoes.limite ?? LIMITE_PADRAO;
  const deltaEMaximo = opcoes.deltaEMaximo ?? Number.POSITIVE_INFINITY;

  if (Number.isNaN(limite) || limite < 1) return [];
  if (Number.isNaN(deltaEMaximo)) return [];

  const candidatos = prepararGrupos(gruposDeCor);
  if (candidatos.length === 0) return [];

  const coresDaLogo = [
    ...new Set(hexesDaLogo.map(normalizarHex).filter((hex): hex is string => hex !== null)),
  ];
  if (coresDaLogo.length === 0) return [];

  const melhorPorGrupo = new Map<string, EncaixeDeCor>();

  for (const hexDaLogo of coresDaLogo) {
    const labDaLogo = rgbToLab(...hexToRgb(hexDaLogo));

    for (const grupo of candidatos) {
      const distancia = deltaE(labDaLogo, grupo.lab);
      if (distancia > deltaEMaximo) continue;

      const atual = melhorPorGrupo.get(grupo.id);
      // Em empate entre duas cores da logo para o MESMO grupo, fica a
      // primeira — `coresDaLogo` preserva a ordem recebida, então o
      // resultado é estável para a mesma entrada.
      if (atual !== undefined && atual.deltaE <= distancia) continue;

      melhorPorGrupo.set(grupo.id, {
        colorGroupId: grupo.id,
        nomeDoGrupo: grupo.name,
        hexDoGrupo: grupo.hex,
        hexDaLogo,
        deltaE: distancia,
        confianca: classificarConfianca(distancia),
      });
    }
  }

  return [...melhorPorGrupo.values()].sort(compararEncaixes).slice(0, limite);
}
