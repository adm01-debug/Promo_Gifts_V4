/**
 * Card do plano de volumes dentro do orçamento.
 *
 * Monta as linhas do plano a partir dos itens do orçamento (produto +
 * quantidade). Item avulso, digitado à mão e sem `product_id`, entra pelo nome
 * e deixa o plano em "dados insuficientes". O cálculo é do `useFreightPlan`;
 * aqui só se escolhe como misturar os produtos, se mostra o painel e se o
 * cliente vê o resumo dos volumes.
 *
 * Fica ao lado do bloco de frete da página, nunca dentro dele: os guardas de
 * layout do bloco medem aquele elemento.
 */
import { memo, useId, useEffect, useMemo, useRef } from 'react';
import { FreightPlanPanel } from '@/components/freight-plan/FreightPlanPanel';
import { MixModeSelector, type MixModeProduct } from '@/components/freight-plan/MixModeSelector';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useFreightPlan, type FreightPlanLine } from '@/hooks/freight/useFreightPlan';
import { useShippingBoxes } from '@/hooks/freight/useShippingBoxes';
import { formatPlanForClient, type FreightPlan, type MixMode } from '@/lib/freight';

/** O que o card lê de cada item do orçamento (`QuoteItem` serve). */
export interface FreightPlanCardItem {
  product_id?: string | null;
  product_name: string;
  quantity: number;
}

export interface FreightPlanCardProps {
  items: readonly FreightPlanCardItem[];
  mixMode: MixMode;
  onMixModeChange: (mode: MixMode) => void;
  showToClient: boolean;
  onShowToClientChange: (show: boolean) => void;
  /** Recebe o plano calculado (ou null) para quem precisa persistir o valor. */
  onPlanChange?: (plan: FreightPlan | null) => void;
}

function toLines(items: readonly FreightPlanCardItem[]): FreightPlanLine[] {
  return items.map((item) => ({
    productId: item.product_id || null,
    name: item.product_name,
    quantity: item.quantity,
  }));
}

function hasQuantity(lines: readonly FreightPlanLine[]): boolean {
  return lines.some((line) => line.quantity > 0);
}

/** `memo`: digitar em campo sem relação com o frete não redesenha o card. */
function FreightPlanCardView(props: FreightPlanCardProps) {
  const lines = useMemo(() => toLines(props.items), [props.items]);
  if (!hasQuantity(lines)) return null;
  return <FreightPlanCardBody {...props} lines={lines} />;
}

export const FreightPlanCard = memo(FreightPlanCardView);

function FreightPlanCardBody({
  lines,
  mixMode,
  onMixModeChange,
  showToClient,
  onShowToClientChange,
  onPlanChange,
}: FreightPlanCardProps & { lines: readonly FreightPlanLine[] }) {
  const switchId = useId();
  const hintId = useId();
  const { plan, products, unavailable, isLoading, error } = useFreightPlan({
    items: lines,
    mixMode,
  });
  // Mesma consulta do plano (cache compartilhado do React Query), sem pedido extra.
  const boxesQuery = useShippingBoxes();

  // Sobe o plano calculado (ou null) para o pai persistir; ref estável evita
  // re-render por mudança de identidade do callback.
  const onPlanChangeRef = useRef(onPlanChange);
  onPlanChangeRef.current = onPlanChange;
  useEffect(() => {
    onPlanChangeRef.current?.(isLoading || error ? null : plan);
  }, [plan, isLoading, error]);

  const mixProducts = useMemo<MixModeProduct[]>(
    () =>
      lines.flatMap((line) =>
        line.productId
          ? [
              {
                id: line.productId,
                name: products.get(line.productId)?.name ?? line.name ?? 'Produto',
                shipsSeparately: products.get(line.productId)?.ships_separately === true,
              },
            ]
          : [],
      ),
    [lines, products],
  );

  // Nenhuma caixa cadastrada (sem erro de rede): não há plano a oferecer, o card não aparece.
  if (!boxesQuery.isLoading && !boxesQuery.error && boxesQuery.boxes.length === 0) return null;

  const clientText = plan && !isLoading && !error ? formatPlanForClient(plan) : '';

  return (
    <div
      role="group"
      aria-label="Plano de volumes do frete"
      data-testid="freight-plan-card"
      className="mt-3 space-y-3"
    >
      <MixModeSelector value={mixMode} onChange={onMixModeChange} products={mixProducts} />
      <FreightPlanPanel
        plan={plan}
        isLoading={isLoading}
        error={error?.message ?? null}
        products={products}
        unavailable={unavailable}
      />
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex items-center gap-2">
          <Switch
            id={switchId}
            checked={showToClient}
            onCheckedChange={onShowToClientChange}
            aria-describedby={hintId}
          />
          <Label htmlFor={switchId} className="text-sm">
            Mostrar volumes ao cliente
          </Label>
        </div>
        <p id={hintId} className="text-xs text-muted-foreground">
          O cliente vê só o total, sem caixas nem avisos.
        </p>
      </div>
      {showToClient && (
        <div
          data-testid="freight-plan-client-preview"
          className="space-y-1 rounded-md border border-dashed p-3"
        >
          <p className="text-xs font-medium text-muted-foreground">Como o cliente verá</p>
          <p className="text-sm">
            {clientText || 'O resumo aparece quando os volumes estiverem calculados.'}
          </p>
        </div>
      )}
    </div>
  );
}
