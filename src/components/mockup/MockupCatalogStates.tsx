/**
 * Estados do catálogo de produtos do gerador de mockup — VAZIO e ERRO são coisas diferentes.
 *
 * "Nenhum resultado" (vazio) diz que a busca chegou ao servidor e não achou nada; o aviso de
 * erro diz que a busca NÃO chegou — e oferece "Tentar novamente". Antes, a falha de carga caía
 * no texto de vazio e o vendedor não sabia se o produto não existe ou se o catálogo quebrou.
 *
 * Mora fora de MockupProductSelector.tsx porque aquele arquivo está no teto do gate de tamanho
 * de arquivo (500 linhas).
 */
import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadErrorBlock } from './MockupConfigPanelLoadError';

/** Mensagem exibida quando o erro do react-query não traz texto utilizável. */
export const CATALOG_LOAD_ERROR_FALLBACK =
  'Não foi possível carregar o catálogo de produtos agora.';

export interface CatalogLoadErrorProps {
  /** Erro do react-query (`error` do useProductsCatalog). */
  error: unknown;
  /** Refetch da MESMA consulta que falhou. */
  onRetry: () => void;
}

/** Aviso de falha de carga do catálogo, com o retry da consulta que falhou. */
export function CatalogLoadError({ error, onRetry }: CatalogLoadErrorProps) {
  const message =
    error instanceof Error && error.message ? error.message : CATALOG_LOAD_ERROR_FALLBACK;
  return (
    <LoadErrorBlock
      testId="mockup-products-error"
      title="Não foi possível carregar produtos"
      message={message}
      onRetry={onRetry}
    />
  );
}

/** Catálogo respondeu sem nenhum item para a busca atual (não é falha de carga). */
export function CatalogEmptyState({ onClearSearch }: { onClearSearch: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <SearchX aria-hidden="true" className="h-10 w-10 opacity-20" />
      </div>
      <p className="font-display text-xl font-bold text-foreground">Nenhum resultado</p>
      <p className="mt-1 text-sm">Tente usar termos mais genéricos ou outro SKU.</p>
      <Button variant="link" className="mt-2" onClick={onClearSearch}>
        Limpar busca
      </Button>
    </div>
  );
}

/** Esqueleto da grade enquanto o catálogo carrega. Mora aqui pelo mesmo motivo acima. */
export function CatalogGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-border/30 bg-card p-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
