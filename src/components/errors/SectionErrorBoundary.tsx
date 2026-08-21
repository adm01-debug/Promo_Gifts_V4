import { useCallback, useState, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EnhancedErrorBoundary } from '@/components/errors/EnhancedErrorBoundary';
import { logger } from '@/lib/logger';

export interface SectionErrorBoundaryProps {
  /** Nome legível do bloco — usado no log estruturado e na mensagem. */
  section: string;
  /** Conteúdo do bloco. */
  children: ReactNode;
  /** Rótulo exibido no card degradado. Default: `section`. */
  label?: string;
  /** Classe extra do container do fallback. */
  className?: string;
}

/**
 * Boundary de **degradação parcial**.
 *
 * Diferente do `EnhancedErrorBoundary` full-screen, este isola um bloco da
 * página: se a query/render do bloco explodir (RLS negado, RPC ausente,
 * timeout, formatação de nulo), apenas esse card vira um estado degradado
 * com CTA de "Tentar novamente" — o restante da rota continua utilizável.
 *
 * O retry incrementa uma `key`, o que força a remontagem **somente** da
 * subárvore deste boundary; blocos irmãos não são remontados.
 */
export function SectionErrorBoundary({
  section,
  children,
  label,
  className,
}: SectionErrorBoundaryProps) {
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    logger.info('section_boundary_retry', { section, attempt: attempt + 1 });
    setAttempt((n) => n + 1);
  }, [section, attempt]);

  const fallback = (
    <div
      role="region"
      aria-label={`Falha ao carregar ${label ?? section}`}
      className={`rounded-xl border border-border/60 bg-card p-6 ${className ?? ''}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">
            Não foi possível carregar {label ?? section}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            O restante do painel continua disponível. Você pode tentar recarregar apenas este
            bloco.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={retry}
            data-testid={`section-retry-${section}`}
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
            Tentar novamente
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <EnhancedErrorBoundary
      key={`${section}:${attempt}`}
      fallback={fallback}
      onError={(error) => {
        logger.error('section_boundary_caught', {
          section,
          attempt,
          message: error.message,
        });
      }}
    >
      {children}
    </EnhancedErrorBoundary>
  );
}

export default SectionErrorBoundary;
