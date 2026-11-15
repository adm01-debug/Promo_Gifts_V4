import { toast } from 'sonner';
import { CheckCircle2, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReducedMotion } from '@/hooks/ui/useReducedMotion';
import { cn } from '@/lib/utils';

interface MockupSuccessToastProps {
  mockupUrl: string;
  productName?: string;
  techniqueName?: string;
  onDownload: () => void;
}

interface MockupSuccessToastContentProps extends MockupSuccessToastProps {
  onDismiss: () => void;
}

/**
 * Conteúdo do toast de sucesso do mockup.
 *
 * Fica separado de `showMockupSuccessToast` para poder ser renderizado/testado
 * sem depender do Toaster do sonner.
 *
 * Movimento: a única animação é a de entrada, curta e discreta. Em
 * `prefers-reduced-motion: reduce` ela é suprimida (`motion-reduce:animate-none`
 * como rede de segurança CSS + ausência da animação via hook) e não há animação
 * contínua nenhuma (sem pulso/loop infinito).
 */
export function MockupSuccessToast({
  mockupUrl,
  productName,
  techniqueName,
  onDownload,
  onDismiss,
}: MockupSuccessToastContentProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      data-testid="mockup-success-toast"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      className={cn(
        'w-full max-w-sm overflow-hidden rounded-xl border bg-card shadow-2xl',
        !reducedMotion &&
          'duration-300 animate-in slide-in-from-top-2 motion-reduce:animate-none',
      )}
    >
      {/* Preview Header */}
      <div className="relative h-32 bg-gradient-to-br from-success/20 to-primary/10">
        <img
          src={mockupUrl}
          alt="Mockup gerado"
          className="absolute inset-0 h-full w-full object-contain p-2"
          loading="lazy"
        />
        <div className="absolute right-2 top-2">
          <div className="flex items-center gap-1.5 rounded-full bg-success/90 px-2 py-1 text-xs font-medium text-success-foreground">
            <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
            Criado!
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3 p-4">
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="mockup-success-message"
        >
          <h4 className="font-semibold text-foreground">Mockup gerado com sucesso! 🎉</h4>
          {productName && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {productName}
              {techniqueName && ` • ${techniqueName}`}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              onDownload();
              onDismiss();
            }}
            className="flex-1"
          >
            <Download aria-hidden="true" className="mr-1.5 h-4 w-4" />
            Baixar
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label="Abrir mockup em nova aba"
            onClick={() => {
              window.open(mockupUrl, '_blank');
              onDismiss();
            }}
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function showMockupSuccessToast({
  mockupUrl,
  productName,
  techniqueName,
  onDownload,
}: MockupSuccessToastProps) {
  toast.custom(
    (t) => (
      <MockupSuccessToast
        mockupUrl={mockupUrl}
        productName={productName}
        techniqueName={techniqueName}
        onDownload={onDownload}
        onDismiss={() => toast.dismiss(t)}
      />
    ),
    {
      duration: 8000,
      position: 'top-right',
    },
  );
}
