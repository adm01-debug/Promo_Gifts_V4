/** SKU em destaque na lista de produtos, com o aviso de "sem dados de frete". */
import type { ProductMeasureRow } from '@/lib/freight';
import { FreightReadinessIndicator } from './FreightReadinessIndicator';

export function ProductSkuTag({ product }: { product: ProductMeasureRow }) {
  return (
    <span className="inline-flex items-center rounded bg-muted/50 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
      {product.sku}
      <FreightReadinessIndicator product={product} />
    </span>
  );
}
