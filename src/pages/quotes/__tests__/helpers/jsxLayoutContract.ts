/**
 * Leitura de contratos de layout a partir do FONTE JSX, sem depender de
 * formatação.
 *
 * Por que existe: vários contratos do QuoteBuilderPage casavam uma string
 * literal de className, por exemplo
 * `<div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end" data-testid="freight-grid">`.
 * O `prettier-plugin-tailwindcss` REORDENA classes utilitárias e o prettier
 * quebra atributos em várias linhas sempre que o arquivo é tocado — então o
 * contrato quebrava sozinho, sem nenhuma mudança de layout. Aconteceu na #3817:
 * `grid grid-cols-1 md:grid-cols-3 gap-3` virou
 * `grid grid-cols-1 items-end gap-3 md:grid-cols-3` e 6 casos ficaram vermelhos.
 *
 * O invariante que interessa é "este elemento está no grid de 3 colunas que
 * empilha no mobile", e isso é um CONJUNTO de classes, não uma ordem. Estes
 * helpers checam conjunto e posição; a ordem fica por conta do prettier.
 */

/** Trecho da tag de abertura que carrega `data-testid="<testid>"`, ou `null`. */
function tagDoTestId(src: string, testid: string): { inicio: number; tag: string } | null {
  const marca = `data-testid="${testid}"`;
  const pos = src.indexOf(marca);
  if (pos === -1) return null;
  const inicio = src.lastIndexOf('<', pos);
  if (inicio === -1) return null;
  const fim = src.indexOf('>', pos);
  if (fim === -1) return null;
  return { inicio, tag: src.slice(inicio, fim + 1) };
}

/** Índice de abertura da tag que carrega o testid, ou -1. */
export function indiceDoTestId(src: string, testid: string): number {
  return tagDoTestId(src, testid)?.inicio ?? -1;
}

/** Classes declaradas em `className="..."` dentro de um trecho de tag. */
export function classesDaTag(tag: string): string[] {
  const m = /className="([^"]*)"/.exec(tag);
  if (!m) return [];
  return m[1].split(/\s+/).filter(Boolean);
}

/** Classes do elemento que carrega o testid. Vazio quando não achou. */
export function classesPorTestId(src: string, testid: string): string[] {
  const achado = tagDoTestId(src, testid);
  return achado ? classesDaTag(achado.tag) : [];
}

/** Classes que faltam, em qualquer ordem. Vazio = contrato satisfeito. */
export function classesFaltando(classes: string[], esperadas: string[]): string[] {
  const presentes = new Set(classes);
  return esperadas.filter((c) => !presentes.has(c));
}

/**
 * Classes do `<div>` mais próximo ANTES de `marcador` cujo className contenha
 * `grid`. Serve para o grid que não tem `data-testid` próprio.
 */
export function classesDoGridQueEnvolve(src: string, marcador: string): string[] {
  const pos = src.indexOf(marcador);
  if (pos === -1) return [];
  let cursor = pos;
  for (let i = 0; i < 12; i += 1) {
    cursor = src.lastIndexOf('<div', cursor - 1);
    if (cursor === -1) return [];
    const fim = src.indexOf('>', cursor);
    if (fim === -1) return [];
    const classes = classesDaTag(src.slice(cursor, fim + 1));
    if (classes.includes('grid')) return classes;
  }
  return [];
}

/** O grid de 3 colunas que empilha no mobile, como conjunto. */
export const GRID_3_COLUNAS = ['grid', 'grid-cols-1', 'md:grid-cols-3', 'gap-3'] as const;
