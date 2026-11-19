/**
 * Porta de entrada do detalhamento de saúde do estoque.
 *
 * POR QUE EXISTE: `StockHealthBreakdownDrawer` estava montado em
 * `StockDashboard.tsx:438-446`, mas `setHealthDrawerOpen(true)` não era chamado
 * em lugar nenhum — o drawer era inalcançável. Ele abria pelo chip "Saúde: %"
 * do cabeçalho "Visão Geral", que foi removido de propósito, e a remoção levou
 * junto o único gatilho.
 *
 * O cabeçalho NÃO volta: `StockDashboard.header-removed.regression.test.ts`
 * proíbe `health-score-badge`, `critical-alerts-badge` e o
 * `HealthScoreInfoDialog` dentro do StockDashboard, e essa guarda fica. Esta
 * entrada é outra coisa — um botão nomeado, fora do cabeçalho, com testid
 * próprio (`stock-breakdown-trigger`), que não reintroduz nenhum dos três.
 *
 * O estado do drawer mora aqui, e não no StockDashboard, por dois motivos:
 * o arquivo está exatamente no teto de 780 linhas do `.file-size-baseline.json`,
 * e o `open` só interessa a quem abre.
 */
import { Suspense, useState } from 'react';
import { ListTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import type { ProductStockSummary } from '@/types/stock';

const StockHealthBreakdownDrawer = lazyWithRetry(() =>
  import('./StockHealthBreakdownDrawer').then((m) => ({
    default: m.StockHealthBreakdownDrawer,
  })),
);

interface Props {
  /** Base completa do estoque, a mesma que o drawer agrupa por faixa. */
  products: readonly ProductStockSummary[];
}

export function StockHealthDrawerEntry({ products }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid="stock-breakdown-trigger"
        onClick={() => setOpen(true)}
      >
        <ListTree className="mr-2 h-4 w-4" aria-hidden="true" />
        Detalhar por faixa
      </Button>
      {/* O chunk do drawer só é baixado quando alguém abre. */}
      {open && (
        <Suspense fallback={null}>
          <StockHealthBreakdownDrawer open={open} onOpenChange={setOpen} products={products} />
        </Suspense>
      )}
    </>
  );
}
