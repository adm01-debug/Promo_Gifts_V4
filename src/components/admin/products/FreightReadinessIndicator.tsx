/**
 * Ícone "sem dados de frete" da lista de produtos do admin. Aparece só quando o
 * motor de frete não consegue empacotar o produto, e o tooltip diz o que falta.
 */
import { PackageX } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getFreightReadiness, type ProductDimensionRow } from '@/lib/freight';
import { describeMissing } from '../freight/freightReadinessRows';

export function FreightReadinessIndicator({ product }: { product: ProductDimensionRow }) {
  const readiness = getFreightReadiness(product);
  if (readiness.ready) return null;
  const text = `Sem dados de frete: falta ${describeMissing(readiness.missing).toLowerCase()}.`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="ml-1.5 inline-flex align-middle text-warning"
          role="img"
          tabIndex={0}
          aria-label={text}
          data-testid="freight-readiness-indicator"
        >
          <PackageX className="h-3.5 w-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
