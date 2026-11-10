/** Compatibility features preserved from CartUtilComponents before commit 5e2221cfa. */
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Package, Trash2, Plus, Copy, Eraser, FileText, Sparkles, TrendingUp, Lightbulb, History, MessageSquare, MoveRight, ChevronDown, Timer } from 'lucide-react';
import type { SellerCart } from '@/hooks/products';
import { differenceInDays, differenceInHours, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';

export interface CartAction {
  type: 'add' | 'clear' | 'duplicate' | 'move' | 'qty' | 'remove';
  itemName: string;
  detail?: string;
  time: Date;
}

const actionHistoryMap = new Map<string, CartAction[]>();

export function recordAction(cartId: string, action: CartAction) {
  const list = actionHistoryMap.get(cartId) || [];
  list.unshift(action);
  if (list.length > 20) list.pop();
  actionHistoryMap.set(cartId, list);
}

export function getActionHistory(cartId: string): CartAction[] {
  return actionHistoryMap.get(cartId) || [];
}

export function clearActionHistory(cartId: string) {
  actionHistoryMap.delete(cartId);
}

export function SuggestionSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="group flex items-start gap-2.5 rounded-xl border border-border/20 bg-muted/5 p-3"
        >
          <Skeleton className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full opacity-40 transition-opacity group-hover:opacity-60" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-2.5 w-full opacity-30" />
            <Skeleton className="h-2.5 w-4/5 opacity-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export interface ProductLike {
  id: string;
  name: string;
  category_name?: unknown;
  category?: unknown;
  is_active?: unknown;
}

export function isSuggestionProduct(value: unknown): value is ProductLike {
  return typeof value === 'object' && value !== null &&
    'id' in value && typeof value.id === 'string' &&
    'name' in value && typeof value.name === 'string';
}

function categoryName(product: ProductLike): string | undefined {
  if (typeof product.category_name === 'string' && product.category_name) return product.category_name;
  const category = product.category;
  return typeof category === 'object' && category !== null &&
    'name' in category && typeof category.name === 'string'
    ? category.name
    : undefined;
}

export function SmartSuggestions({
  cart,
  allProducts,
  isLoading,
}: {
  cart: Pick<SellerCart, 'items' | 'notes'>;
  allProducts: ProductLike[];
  isLoading?: boolean;
}) {
  const suggestions = useMemo(() => {
    const tips: { icon: typeof Lightbulb; text: string }[] = [];
    const totalQty = cart.items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = cart.items.reduce((s, i) => s + i.product_price * i.quantity, 0);

    if (cart.items.length === 1) {
      tips.push({ icon: Lightbulb, text: 'Carrinhos com 3+ SKUs distintos convertem 40% mais' });
    }
    if (totalQty < 50) {
      tips.push({
        icon: TrendingUp,
        text: 'Pedidos acima de 50 unidades costumam ter melhor margem',
      });
    }
    if (subtotal > 5000 && !cart.notes) {
      tips.push({
        icon: MessageSquare,
        text: 'Negociações acima de R$5k com notas detalhadas fecham mais rápido',
      });
    }
    if (cart.items.some((i) => !i.notes) && cart.items.length > 2) {
      tips.push({
        icon: FileText,
        text: 'Adicione observações em cada item para acelerar a produção',
      });
    }

    if (allProducts.length > 0 && cart.items.length > 0) {
      // O(n+m): build a Map once instead of O(n*m) repeated .find() calls
      const productMap = new Map(allProducts.map((p) => [p.id, p]));
      const cartCategoryNames = new Set(
        cart.items
          .map((i) => {
            const prod = productMap.get(i.product_id);
            return prod ? categoryName(prod) : undefined;
          })
          .filter(Boolean),
      );
      const cartProductIds = new Set(cart.items.map((i) => i.product_id));
      const similar = allProducts.find((p) => {
        const pCatName = categoryName(p);
        return (
          !cartProductIds.has(p.id) &&
          pCatName &&
          cartCategoryNames.has(pCatName) &&
          p.is_active !== false
        );
      });
      if (similar) {
        tips.push({
          icon: Sparkles,
          text: `Clientes similares também compraram: ${similar.name}`,
        });
      }
    }

    return tips.slice(0, 3);
  }, [cart, allProducts]);

  if (isLoading) return <SuggestionSkeleton />;
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      {suggestions.map((s, i) => {
        const Icon = s.icon;
        return (
          <div
            key={i}
            className="flex items-start gap-2.5 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2.5 text-[10px] leading-relaxed text-muted-foreground transition-colors hover:bg-primary/10"
          >
            <div className="mt-0.5 flex-shrink-0 rounded-full bg-background/80 p-1 shadow-sm">
              <Icon className="h-3 w-3 text-primary" />
            </div>
            <span>{s.text}</span>
          </div>
        );
      })}
    </div>
  );
}

const ACTION_HISTORY_ICONS: Record<string, typeof Plus> = {
  add: Plus,
  remove: Trash2,
  qty: Package,
  move: MoveRight,
  duplicate: Copy,
  clear: Eraser,
} as const;

export function ActionHistoryPanel({ cartId }: { cartId: string }) {
  const history = getActionHistory(cartId);
  if (history.length === 0) return null;

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button
          className="flex w-full items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Recolher"
        >
          <History className="h-3.5 w-3.5" />
          Histórico de ações ({history.length})
          <ChevronDown className="ml-auto h-3 w-3" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {history.slice(0, 10).map((action, i) => {
            const Icon = ACTION_HISTORY_ICONS[action.type] || Package;
            return (
              <div
                key={i}
                className="flex items-center gap-2 py-1 text-[10px] text-muted-foreground"
              >
                <Icon className="h-3 w-3 flex-shrink-0" />
                <span className="flex-1 truncate">
                  {action.type === 'add' && `Adicionou ${action.itemName}`}
                  {action.type === 'remove' && `Removeu ${action.itemName}`}
                  {action.type === 'qty' &&
                    `Alterou qtd de ${action.itemName}${action.detail ? ` → ${action.detail}` : ''}`}
                  {action.type === 'move' &&
                    `Moveu ${action.itemName}${action.detail ? ` → ${action.detail}` : ''}`}
                  {action.type === 'duplicate' &&
                    `Duplicou ${action.itemName}${action.detail ? ` → ${action.detail}` : ''}`}
                  {action.type === 'clear' && `Limpou ${action.itemName}`}
                </span>
                <span className="flex-shrink-0 text-[9px] tabular-nums">
                  {formatDistanceToNow(action.time, { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function FollowUpTimer({ createdAt, status }: { createdAt: string; status?: string }) {
  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) return null;
  const days = differenceInDays(new Date(), createdDate);
  const hours = differenceInHours(new Date(), createdDate);

  if (days < 1 || status === 'pronto_orcamento') return null;

  const isUrgent = days >= 3;
  const isWarning = days >= 2;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs',
        isUrgent
          ? 'border-warning/30 bg-warning/15 text-warning'
          : isWarning
            ? 'border-warning/20 bg-warning/10 text-warning'
            : 'border-border/30 bg-muted/50 text-muted-foreground',
      )}
    >
      <Timer className="h-3.5 w-3.5" />
      <span>
        {isUrgent
          ? `${days} dias — Hora do follow-up!`
          : isWarning
            ? `${days} dias desde a criação`
            : `Criado há ${hours}h`}
      </span>
    </div>
  );
}
