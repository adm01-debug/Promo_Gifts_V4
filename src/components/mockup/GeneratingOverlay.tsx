import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface GeneratingOverlayProps {
  isVisible: boolean;
  productName?: string;
  techniqueName?: string;
}

/**
 * Overlay de geração do mockup.
 * A geração é por composição determinística e não emite eventos de progresso:
 * por isso o estado é indeterminado (sem percentual nem etapas inventadas).
 * Animações só rodam com `motion-safe:` (respeita prefers-reduced-motion).
 * Some quando `isVisible` volta a false (sucesso ou falha da geração).
 */
export function GeneratingOverlay({
  isVisible,
  productName,
  techniqueName,
}: GeneratingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-background/80 backdrop-blur-md',
        'motion-safe:animate-fade-in',
      )}
      role="alert"
      aria-live="polite"
      aria-busy="true"
      data-testid="generating-overlay"
    >
      <div className="relative mx-4 w-full max-w-md rounded-2xl border bg-card p-8 shadow-2xl motion-safe:animate-scale-in">
        <div className="space-y-6 text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Loader2
              className="h-10 w-10 text-primary motion-safe:animate-spin"
              aria-hidden="true"
              data-testid="generating-spinner"
            />
          </div>
          <div>
            <h2 className="mb-1 font-display text-xl font-semibold text-foreground">
              Gerando Mockup
            </h2>
            <p className="text-sm text-muted-foreground">
              {productName && techniqueName
                ? `${productName} com ${techniqueName}`
                : 'Compondo o mockup...'}
            </p>
          </div>

          {/* Barra indeterminada: sem aria-valuenow, sem percentual */}
          <div
            role="progressbar"
            aria-label="Gerando mockup"
            data-testid="generating-progress"
            className="h-2 w-full overflow-hidden rounded-full bg-primary/20"
          >
            <div className="h-full w-1/3 rounded-full bg-primary motion-safe:animate-pulse" />
          </div>

          <p className="text-[10px] text-muted-foreground">Isso pode levar alguns segundos...</p>
        </div>
      </div>
    </div>
  );
}
