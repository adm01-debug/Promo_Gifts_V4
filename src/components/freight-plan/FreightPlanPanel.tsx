/**
 * Painel do plano de volumes. Puro: recebe o plano por props e não busca dado
 * nenhum (o hook `useFreightPlan` fica com quem monta a tela).
 *
 * Estados: carregando, sem itens, erro, plano calculado, dados insuficientes
 * (lista o que falta no cadastro) e "não cabe" (o aviso do motor nomeia o
 * produto e a maior caixa).
 */
import { useId, useState } from 'react';
import { AlertTriangle, ChevronDown, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPlanSummary, type FreightPlan, type PackVolume } from '@/lib/freight';
import { cn } from '@/lib/utils';
import { FreightMissingActions, type FreightProductLabels } from './FreightMissingActions';

interface FreightPlanPanelProps {
  /** `null`: ainda sem plano (sem itens, carregando ou erro). */
  plan: FreightPlan | null;
  isLoading?: boolean;
  /** Mensagem já pronta para o usuário. */
  error?: string | null;
  /** Nome e SKU por id de produto, para rotular o conteúdo dos volumes. */
  products?: FreightProductLabels;
  /** Produtos que o banco não devolveu (não é falta de medida no cadastro). */
  unavailable?: readonly { productId: string; name: string }[];
  className?: string;
}

/** Acima disto a lista de volumes nasce recolhida: o resumo e os avisos bastam para decidir. */
export const VOLUMES_COLLAPSE_THRESHOLD = 5;

const KG = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function kg(grams: number): string {
  return `${KG.format(grams / 1000)} kg`;
}

/** Em volume de uma peça só a ocupação pode passar de 100% (ver `PackVolume.fillRatio`); a tela trava em 100%. */
function occupancy(volume: PackVolume): string {
  return `${Math.min(100, Math.round(volume.fillRatio * 100))}%`;
}

function contents(volume: PackVolume, products?: FreightProductLabels): string {
  return volume.items
    .map(({ productId, quantity }) => `${quantity}× ${products?.get(productId)?.name ?? 'Produto'}`)
    .join(', ');
}

function VolumeRow({
  volume,
  index,
  products,
}: {
  volume: PackVolume;
  index: number;
  products?: FreightProductLabels;
}) {
  return (
    <Collapsible className="rounded-md border">
      <CollapsibleTrigger className="group flex w-full items-start justify-between gap-3 p-3 text-left text-sm">
        <span className="space-y-0.5">
          <span className="block font-medium">
            Volume {index + 1} · Caixa {volume.box.code}
          </span>
          <span className="block text-muted-foreground">{contents(volume, products)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="font-medium">{kg(volume.grossWeightG)}</span>
          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <dl className="grid grid-cols-1 gap-1 border-t p-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Peso bruto</dt>
            <dd>{kg(volume.grossWeightG)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Ocupação da caixa</dt>
            <dd>{occupancy(volume)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Peso cubado (Correios)</dt>
            <dd>{kg(volume.cubicWeightG.correios)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Peso cubado (rodoviário)</dt>
            <dd>{kg(volume.cubicWeightG.rodoviario)}</dd>
          </div>
        </dl>
      </CollapsibleContent>
    </Collapsible>
  );
}

function VolumeList({
  volumes,
  products,
}: {
  volumes: readonly PackVolume[];
  products?: FreightProductLabels;
}) {
  const listId = useId();
  const collapsible = volumes.length > VOLUMES_COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(false);
  const open = !collapsible || expanded;

  return (
    <div className="space-y-2">
      {collapsible && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((atual) => !atual)}
        >
          {expanded ? 'Ocultar' : `Ver ${volumes.length} volumes`}
        </Button>
      )}
      {open && (
        <div id={listId} className="space-y-2">
          {volumes.map((volume, index) => (
            <VolumeRow
              // Volumes não têm id: a posição na lista é a identidade.
              key={`${volume.box.code}-${index}`}
              volume={volume}
              index={index}
              products={products}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Body({
  plan,
  isLoading,
  error,
  products,
  unavailable = [],
}: Pick<FreightPlanPanelProps, 'error' | 'isLoading' | 'plan' | 'products' | 'unavailable'>) {
  if (isLoading) {
    return (
      <div className="space-y-2" role="status" aria-label="Calculando volumes">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      // `div`, não `p`: a regra global `.dark p/span/li` pinta de branco e esconderia a cor do erro.
      <div role="alert" className="flex items-start gap-2 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>{error}</div>
      </div>
    );
  }

  if (!plan) {
    return (
      <p className="text-sm text-muted-foreground">
        Adicione produtos com quantidade para ver os volumes.
      </p>
    );
  }

  if (plan.status === 'dados_insuficientes') {
    if (plan.missing.length === 0 && unavailable.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          {plan.warnings.join(' ') || 'Não há dados suficientes para calcular os volumes.'}
        </p>
      );
    }
    return (
      <div className="space-y-3">
        <p className="flex items-start gap-2 text-sm font-medium">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          Faltam medidas ou peso no cadastro, então os volumes não foram calculados.
        </p>
        <FreightMissingActions
          missing={plan.missing}
          products={products}
          unavailable={unavailable}
        />
      </div>
    );
  }

  if (plan.status === 'nao_cabe') {
    return (
      <div role="alert" className="flex items-start gap-2 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          {plan.warnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <VolumeList volumes={plan.volumes} products={products} />
      {plan.warnings.length > 0 && (
        <div className="space-y-1 text-sm text-amber-700 dark:text-amber-500">
          {plan.warnings.map((warning) => (
            <div key={warning} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{warning}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FreightPlanPanel({
  plan,
  isLoading = false,
  error = null,
  products,
  unavailable,
  className,
}: FreightPlanPanelProps) {
  const summary = plan && !isLoading && !error ? formatPlanSummary(plan) : '';

  return (
    <section className={cn('space-y-3 rounded-lg border p-4', className)}>
      <header className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Truck className="h-4 w-4" />
          Volumes para transporte
        </h3>
        {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
      </header>
      <Body
        plan={plan}
        isLoading={isLoading}
        error={error}
        products={products}
        unavailable={unavailable}
      />
      <p className="text-xs text-muted-foreground">
        Estimativa para transporte — caixas padrão da empresa
      </p>
    </section>
  );
}
