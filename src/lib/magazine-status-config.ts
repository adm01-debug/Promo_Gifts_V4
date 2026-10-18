/**
 * Configuração centralizada de status de `magazines`.
 * Fonte única de verdade para a máquina de estados do ciclo de vida da revista
 * — mesmo padrão de `quote-status-config.ts`.
 *
 * Autoridade DB: as transições passam pelas RPCs `magazine_publish_v2`,
 * `magazine_unpublish_v2`, `magazine_archive_v2` e `magazine_reactivate_v2`
 * (o trigger canônico `tg_magazines_on_publish` gera o link público na
 * publicação). Até aqui as fontes válidas por ação viviam em arrays soltos no
 * `useMagazineEditor` (`['draft','published']`, `['published']`, …) — esta
 * tabela é a mesma regra, em formato de transição from → to:
 *
 *   draft     → published | archived   (publicar / arquivar)
 *   published → draft | archived       (despublicar p/ editar / arquivar)
 *   archived  → draft                  (reativar como rascunho)
 *
 * Edição de conteúdo não é transição (permanece 'draft') e segue guardada
 * pelo `allowedStatuses` do `mutate`, não por esta tabela.
 */
import type { Magazine } from '@/types/magazine';

export type MagazineStatus = Magazine['status'];

export const MAGAZINE_VALID_TRANSITIONS: Readonly<
  Record<MagazineStatus, readonly MagazineStatus[]>
> = {
  draft: ['published', 'archived'],
  published: ['draft', 'archived'],
  archived: ['draft'],
};

/** Returns true se a transição from → to é permitida pela máquina. */
export function isValidMagazineTransition(from: MagazineStatus, to: MagazineStatus): boolean {
  const transitions = MAGAZINE_VALID_TRANSITIONS[from];
  if (!transitions) return false;
  return (transitions as readonly string[]).includes(to);
}

const STATUS_LABEL: Record<MagazineStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicada',
  archived: 'Arquivada',
};

/** Lança erro descritivo quando a transição não é permitida (defesa em profundidade). */
export function assertMagazineTransition(from: MagazineStatus, to: MagazineStatus): void {
  if (from !== to && !isValidMagazineTransition(from, to)) {
    const fromLabel = STATUS_LABEL[from] ?? from;
    const toLabel = STATUS_LABEL[to] ?? to;
    throw new Error(`Transição de status inválida: "${fromLabel}" → "${toLabel}"`);
  }
}
