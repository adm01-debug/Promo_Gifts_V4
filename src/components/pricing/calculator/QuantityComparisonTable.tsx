/**
 * QuantityComparisonTable — Compare prices across quantities and techniques.
 * Preço da gravação = RPC oficial fn_get_customization_price (mesma fonte do handoff ao orçamento).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
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
  /** Tiragem enviada ao orçamento pelo botão "Criar Orçamento". */
  quoteQuantity: number;
}

type CellPrice =
  | { status: 'dimension' }
  | { status: 'error'; message: string }
  | { status: 'ok'; customizationTotal: number }
  | { status: 'rejected'; message: string };

const cellKey = (config: SelectedTechniqueConfig, qty: number) =>
  `${config.technique.techniqueId}|${config.colors}|${qty}`;

export function QuantityComparisonTable({
  product,
  selectedConfigs,
  quantities,
  quoteQuantity,
}: Props) {
  const { calculatePriceDetailed } = useCustomizationPriceCalculator();
  const requests = useMemo(
    () =>
      selectedConfigs.flatMap((config) =>
        quantities.map((qty) => ({ key: cellKey(config, qty), config, qty })),
      ),
    [selectedConfigs, quantities],
  );
  // Cache por célula (técnica|cores|tiragem): só busca o que falta; o resto não volta ao loading.
  const [cells, setCells] = useState<ReadonlyMap<string, CellPrice>>(() => new Map());
  const cellsRef = useRef(cells);
  const inflightRef = useRef(new Set<string>());
  const mountedRef = useRef(true);

  useEffect(() => {
    cellsRef.current = cells;
  }, [cells]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    requests.forEach(({ key, config, qty }) => {
      // Falha técnica é refeita na próxima mudança; preço/recusa da RPC ficam no cache.
      if (cellsRef.current.get(key)?.status === 'error' || !cellsRef.current.has(key)) {
        if (inflightRef.current.has(key)) return;
        inflightRef.current.add(key);
        void calculatePriceDetailed({
          areaId: config.technique.techniqueId,
          quantidade: qty,
          numCores: config.colors,
        }).then(({ result, error, rejected }) => {
          inflightRef.current.delete(key);
          const cell: CellPrice = result
            ? { status: 'ok', customizationTotal: result.total_cobrado || 0 }
            : isDimensionRequiredError(error)
              ? { status: 'dimension' }
              : {
                  status: rejected ? 'rejected' : 'error',
                  message: error ?? 'Erro ao calcular preço',
                };
          if (mountedRef.current) setCells((prev) => new Map(prev).set(key, cell));
        });
      }
    });
  }, [requests, calculatePriceDetailed]);

  const calculateForConfig = (config: SelectedTechniqueConfig, quantity: number) => {
    const cell = cells.get(cellKey(config, quantity));
    if (cell?.status !== 'ok') return cell ?? null;
    // Conta do orçamento para esta técnica: quantidade × preço do produto + total_cost (= total_cobrado).
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

  // Linha "Orçamento": o handoff manda cada técnica selecionada no mesmo item (calculateQuoteTotals soma
  // quantidade × preço + total_cost de cada personalização; técnica sem preço entra com 0).
  const quoteTotalFor = (quantity: number) => {
    const results = selectedConfigs.map((config) => calculateForConfig(config, quantity));
    if (results.some((r) => r === null)) return null;
    const failed = results.filter((r) => r?.status === 'error' || r?.status === 'rejected').length;
    const withoutPrice = results.filter((r) => r?.status === 'dimension').length;
    const engraving = results.reduce(
      (sum, r) => sum + (r?.status === 'ok' ? r.customizationTotal : 0),
      0,
    );
    const grandTotal = product.price * quantity + engraving;
    return { failed, withoutPrice, grandTotal, unitTotal: grandTotal / quantity };
  };

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
                  {qty === quoteQuantity && (
                    <span className="block text-[10px] font-semibold uppercase text-primary">
                      Vai para o orçamento
                    </span>
                  )}
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
                  if (!result)
                    return (
                      <TableCell key={qty} className="text-center">
                        <Skeleton
                          className="mx-auto h-8 w-20"
                          data-testid="comparison-cell-loading"
                        />
                      </TableCell>
                    );
                  if (result.status !== 'ok')
                    return (
                      <TableCell
                        key={qty}
                        className={cn(
                          'text-center text-xs',
                          result.status === 'error' ? 'text-destructive' : 'text-muted-foreground',
                        )}
                        title={result.status === 'error' ? result.message : undefined}
                      >
                        {result.status === 'dimension'
                          ? 'Sem preço: informe largura e altura no orçamento'
                          : result.status === 'rejected'
                            ? `Sem preço: ${result.message}`
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
            {selectedConfigs.length > 1 && (
              <TableRow className="border-t-2" data-testid="quote-total-row">
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">Orçamento (técnicas somadas)</p>
                    <p className="text-xs text-muted-foreground">Produto + soma das gravações</p>
                  </div>
                </TableCell>
                {quantities.map((qty) => {
                  const total = quoteTotalFor(qty);
                  if (!total)
                    return (
                      <TableCell key={qty} className="text-center">
                        <Skeleton className="mx-auto h-8 w-20" />
                      </TableCell>
                    );
                  if (total.failed > 0)
                    return (
                      <TableCell key={qty} className="text-center text-xs text-muted-foreground">
                        Sem total: {total.failed} gravação(ões) sem preço
                      </TableCell>
                    );
                  return (
                    <TableCell key={qty} className="text-center">
                      <div className="space-y-1">
                        <p className="text-sm font-bold">{formatCurrency(total.unitTotal)}</p>
                        <p className="text-xs text-muted-foreground">
                          Total: {formatCurrency(total.grandTotal)}
                        </p>
                        {total.withoutPrice > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            + {total.withoutPrice} gravação(ões) sem preço (informe largura e
                            altura)
                          </p>
                        )}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            )}
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
          <li>
            O orçamento recebe a tiragem de {formatNumber(quoteQuantity)} un, com cada técnica
            selecionada
          </li>
        </ul>
      </div>
    </div>
  );
}
