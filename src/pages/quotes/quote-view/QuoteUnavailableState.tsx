import { ArrowLeft, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type QuoteUnavailableStateProps = {
  error: string | null;
  onBack: () => void;
  onRetry: () => void;
};

export function QuoteUnavailableState({ error, onBack, onRetry }: QuoteUnavailableStateProps) {
  return (
    <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
      <div className="py-12 text-center">
        <FileText className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
        <h2 className="font-display text-xl font-semibold">
          {error ? 'Não foi possível carregar o orçamento' : 'Orçamento não encontrado'}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {error || 'O orçamento solicitado não existe ou foi removido.'}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {error && (
            <Button onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
            </Button>
          )}
          <Button
            variant="outline"
            className="rounded-full border-primary/40 hover:border-primary hover:bg-primary/10"
            onClick={onBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4 text-primary" /> Voltar para Orçamentos
          </Button>
        </div>
      </div>
    </div>
  );
}
