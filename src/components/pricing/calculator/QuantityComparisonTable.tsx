/**
 * QuantityComparisonTable — Compare prices across quantities and techniques.
 * Preço da gravação = RPC oficial fn_get_customization_price (mesma fonte do handoff ao orçamento).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  isDimensionRequiredError,
  useCustomizationPriceCalculator,
} from '@/hooks/simulation/useCustomizationPrice';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Calculator, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type CalcProduct,
  type SelectedTechniqueConfig,
  formatCurrency,
  formatNumber,
} from './types';

interface Props {
  product: CalcProduct;
  selectedConfigs: SelectedTechniqueConfig[];
  quantities: number[];
}

type CellPrice =
  | { status: 'dimension' }
  | { status: 'error'; message: string }
  | { status: 'ok'; customizationTotal: number };

const cellKey = (config: SelectedTechniqueConfig, qty: number) =>
  `${config.technique.techniqueId}|${config.colors}|${qty}`;

export function QuantityComparisonTable({ product, selectedConfigs, quantities }: Props) {
  const { calculatePriceDetailed } = useCustomizationPriceCalculator();
  const requests = useMemo(
    () =>
      selectedConfigs.flatMap((config) =>
        quantities.map((qty) => ({ key: cellKey(config, qty), config, qty })),
      ),
    [selectedConfigs, quantities],
  );
  const requestKey = requests.map((r) => r.key).join(',');
  const [prices, setPrices] = useState<{ key: string; byCell: Map<string, CellPrice> } | null>(
    null,
  );

  useEffect(() => {
    // Supersede guard: resposta de uma combinação antiga não sobrescreve a atual.
    let cancelled = false;
    Promise.all(
      requests.map(async ({ key, config, qty }) => {
        const { result, error } = await calculatePriceDetailed({
          areaId: config.technique.techniqueId,
          quantidade: qty,
          numCores: config.colors,
        });
        const cell: CellPrice = result
          ? { status: 'ok', customizationTotal: result.total_cobrado ?? 0 }
          : isDimensionRequiredError(error)
            ? { status: 'dimension' }
            : { status: 'error', message: error ?? 'Erro ao calcular preço' };
        return [key, cell] as const;
      }),
    ).then((entries) => {
      if (!cancelled) setPrices({ key: requestKey, byCell: new Map(entries) });
    });
    return () => {
      cancelled = true;
    };
  }, [requests, requestKey, calculatePriceDetailed]);

  const byCell = prices?.key === requestKey ? prices.byCell : null;

  const calculateForConfig = (config: SelectedTechniqueConfig, quantity: number) => {
    const cell = byCell?.get(cellKey(config, quantity));
    if (cell?.status !== 'ok') return cell ?? null;
    // Mesma conta do orçamento: quantidade × preço do produto + total_cost (= total_cobrado).
    const productTotal = product.price * quantity;
    const grandTotal = productTotal + cell.customizationTotal;
    return { ...cell, productTotal, grandTotal, unitTotal: grandTotal / quantity };
  };

  const bestPricePerConfig = new Map<string, number>();
  selectedConfigs.forEach((config) => {
    let bestQty = -1,
      bestUnit = Infinity;
    quantities.forEach((qty) => {
      const result = calculateForConfig(config, qty);
      if (result?.status === 'ok' && result.unitTotal < bestUnit) {
        bestUnit = result.unitTotal;
        bestQty = qty;
      }
    });
    if (bestQty > 0) bestPricePerConfig.set(config.technique.id, bestQty);
  });

  if (selectedConfigs.length === 0)
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Calculator className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>Selecione técnicas para ver a comparação de preços</p>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Técnica</TableHead>
              {quantities.map((qty) => (
                <TableHead key={qty} className="min-w-[100px] text-center">
                  {formatNumber(qty)} un
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedConfigs.map((config) => (
              <TableRow key={config.technique.id}>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">{config.technique.techniqueName}</p>
                    <p className="text-xs text-muted-foreground">
                      {config.colors} cor{config.colors > 1 ? 'es' : ''}
                    </p>
                  </div>
                </TableCell>
                {quantities.map((qty) => {
                  const result = calculateForConfig(config, qty);
                  const isBest = bestPricePerConfig.get(config.technique.id) === qty;
                  if (!byCell)
                    return (
                      <TableCell key={qty} className="text-center">
                        <Skeleton
                          className="mx-auto h-8 w-20"
                          data-testid="comparison-cell-loading"
                        />
                      </TableCell>
                    );
                  if (result?.status !== 'ok')
                    return (
                      <TableCell
                        key={qty}
                        className={cn(
                          'text-center text-xs',
                          result?.status === 'error' ? 'text-destructive' : 'text-muted-foreground',
                        )}
                        title={result?.status === 'error' ? result.message : undefined}
                      >
                        {result?.status === 'dimension'
                          ? 'Sem preço: informe largura e altura no orçamento'
                          : 'Erro ao calcular'}
                      </TableCell>
                    );
                  return (
                    <TableCell
                      key={qty}
                      className={cn(
                        'relative text-center',
                        isBest && 'rounded-lg border border-success/30 bg-success/10',
                      )}
                    >
                      {isBest && <Trophy className="absolute right-1 top-1 h-3 w-3 text-success" />}
                      <div className="space-y-1">
                        <p
                          className={cn(
                            'text-sm font-bold',
                            isBest ? 'text-success' : 'text-primary',
                          )}
                        >
                          {formatCurrency(result.unitTotal)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total: {formatCurrency(result.grandTotal)}
                        </p>
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            <TableRow className="bg-muted/30">
              <TableCell>
                <div>
                  <p className="text-sm font-medium">Apenas Produto</p>
                  <p className="text-xs text-muted-foreground">Sem gravação</p>
                </div>
              </TableCell>
              {quantities.map((qty) => (
                <TableCell key={qty} className="text-center">
                  <div className="space-y-1">
                    <p className="text-sm font-bold">{formatCurrency(product.price)}</p>
                    <p className="text-xs text-muted-foreground">
                      Total: {formatCurrency(product.price * qty)}
                    </p>
                  </div>
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <p className="mb-1 font-medium">Valores incluem:</p>
        <ul className="list-inside list-disc space-y-0.5">
          <li>Preço do produto ({formatCurrency(product.price)}/un)</li>
          <li>Gravação pelo preço oficial (markup, cores e faturamento mínimo)</li>
        </ul>
      </div>
    </div>
  );
}
