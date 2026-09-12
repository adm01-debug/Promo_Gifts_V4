import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import {
  formatCurrency,
  formatDimensions,
  formatVolume,
  type BoxRecommendation,
  type KitBox,
} from '@/lib/kit-builder';

interface BoxComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendations: BoxRecommendation[];
  onSelect: (box: KitBox) => void;
}

export function BoxComparisonDialog({
  open,
  onOpenChange,
  recommendations,
  onSelect,
}: BoxComparisonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comparar caixas</DialogTitle>
          <DialogDescription>
            Compare medidas internas, material, preço e ocupação estimada antes de escolher.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recommendations.map(({ box, status, usagePercent, compatibility }) => (
            <section key={box.id} className="overflow-hidden rounded-xl border bg-card">
              <div className="aspect-[16/9] bg-muted">
                {box.imageUrl ? (
                  <img src={box.imageUrl} alt={box.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <h3 className="font-semibold">{box.name}</h3>
                  <p className="font-mono text-xs text-muted-foreground">{box.sku}</p>
                </div>
                <Badge variant={status === 'incompatible' ? 'destructive' : 'secondary'}>
                  {status === 'compatible'
                    ? 'Compatível por dados'
                    : status === 'inconclusive'
                      ? 'Requer conferência'
                      : 'Incompatível'}
                </Badge>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Dimensões</dt>
                    <dd>
                      {formatDimensions(box.internalWidth, box.internalHeight, box.internalDepth)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Volume interno</dt>
                    <dd>{formatVolume(box.internalVolume)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Material</dt>
                    <dd>{box.material || 'Não informado'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Ocupação</dt>
                    <dd>{Math.round(usagePercent)}%</dd>
                  </div>
                  <div className="flex justify-between gap-3 font-semibold">
                    <dt>Preço unitário</dt>
                    <dd className="text-primary">{formatCurrency(box.price)}</dd>
                  </div>
                </dl>
                <p className="min-h-10 text-xs text-muted-foreground">
                  {compatibility.reason || 'Dimensões e ocupação verificadas pelo catálogo.'}
                </p>
                <Button
                  className="w-full"
                  disabled={status === 'incompatible'}
                  onClick={() => {
                    onSelect(box);
                    onOpenChange(false);
                  }}
                >
                  Usar esta caixa
                </Button>
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
