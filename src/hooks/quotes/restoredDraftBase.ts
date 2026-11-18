/**
 * Base de rascunho restaurado: ponte entre quem restaura (QuoteDraftRecovery) e
 * quem grava (QuoteAutoSave), que são irmãos na página do orçamento.
 *
 * Por que existe: o rascunho é lido com `.passthrough()` em
 * src/lib/quotes/quoteDraftRecovery.ts (5 pontos), ou seja, campo que a tela atual
 * não modela SOBREVIVE à leitura — e o applyDraftToBuilder sabe aplicar 18 campos
 * enquanto QuoteBuilderPage.tsx:179-196 grava 13. A gravação, porém, substituía o
 * envelope inteiro pelos campos da tela: a primeira gravação após restaurar apagava
 * do rascunho o que só o rascunho tinha. Assimetria fechada aqui.
 *
 * Recuperado de salvo/codex-fix-gate1-kit-pdf-types-261109-2252
 * (src/components/quotes/QuoteAutoSave.tsx, funcao `mergeRestoredBase` da PR #3788),
 * adaptado ao caminho que a main adotou na PR #3805 (componente separado em vez de
 * prop `onRestore`).
 */

/**
 * Chave do rascunho, com o fallback 'new' que o QuoteAutoSave usa para orçamento
 * ainda sem id. Delega a `quoteDraftKey` (quoteDraftApply.ts:45) em vez de repetir o
 * prefixo: se os dois lados montassem a chave cada um do seu jeito, a base
 * registrada nunca seria encontrada na gravação.
 */
export function chaveDoRascunho(quoteId?: string): string {
  return quoteDraftKey(quoteId || 'new');
}

import { quoteDraftKey } from '@/hooks/quotes/quoteDraftApply';

/** Bases restauradas nesta sessão, por chave de storage do rascunho. */
const bases = new Map<string, unknown>();

const ehObjetoSimples = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Chamado por quem restaurou: marca a base daquele orçamento. */
export function registrarBaseRestaurada(storageKey: string, base: unknown): void {
  if (!ehObjetoSimples(base)) return;
  bases.set(storageKey, base);
}

/** Esquece a base (orçamento salvo no servidor, ou troca de orçamento). */
export function esquecerBaseRestaurada(storageKey: string): void {
  bases.delete(storageKey);
}

/**
 * Dados a gravar: a tela manda em tudo que ela modela; as chaves que só o rascunho
 * restaurado tinha sobrevivem. Sem base registrada, devolve os dados da tela sem
 * tocar em nada.
 */
export function mesclarComBaseRestaurada(storageKey: string, atual: unknown): unknown {
  const base = bases.get(storageKey);
  if (!ehObjetoSimples(base) || !ehObjetoSimples(atual)) return atual;
  return { ...base, ...atual };
}
