/**
 * Adaptador do histórico de mockups para a aba do gerador.
 *
 * A aba do gerador faz busca por nome/SKU, filtros (cliente, técnica, período) e
 * paginação NO CLIENTE, sobre a lista que recebe (MockupHistoryPanel). Por isso
 * ela pede o mesmo teto do resto do app — os 200 do serviço (teto T8) — e não um
 * recorte menor: com 10 itens a busca e os filtros só alcançariam os 10 últimos.
 *
 * Fonte única do SELECT e do mapeamento linha → `GeneratedMockup`:
 * `fetchMockupHistory` em mockupGenerationService. Aqui só vive o limite pedido.
 *
 * SSOT: `user_id` continua no filtro quando há usuário — quem aplica é o serviço;
 * a RLS é a última palavra, mas o filtro explícito do main não é removido.
 */
import { fetchMockupHistory, type GeneratedMockup } from '@/hooks/mockup/mockupGenerationService';

/**
 * Itens que a aba do gerador pede ao servidor: o mesmo teto T8 do padrão de
 * `fetchMockupHistory`. Literal aqui, e não importado do serviço, porque vários
 * testes trocam o serviço por um mock parcial. Os dois valores estão presos por
 * teste (este em mockupHistoryAdapter.test.ts, o padrão do serviço em
 * mockupGenerationService.test.ts), então divergir entre eles falha o CI.
 */
export const MOCKUP_HISTORY_PANEL_LIMIT = 200;

/** Histórico da aba do gerador: os N mais recentes, com o teto aplicado no servidor. */
export function fetchRecentMockupHistory(
  userId?: string,
  limit: number = MOCKUP_HISTORY_PANEL_LIMIT,
): Promise<GeneratedMockup[]> {
  return fetchMockupHistory(userId, limit);
}
