/**
 * MockupConfigPanelLoadError — aviso de falha de carga de um bloco do painel de configuração.
 *
 * A-estados: o painel só mostrava o erro do CRM (dentro do seletor de empresa). A falha de carga
 * do catálogo de produtos ficava invisível — o bloco do produto aparecia como se o catálogo
 * estivesse vazio ("Nenhum resultado"), sem dizer que a busca nem chegou ao servidor. O bloco
 * avisa no seu lugar, com mensagem + "Tentar novamente", sem esconder nem substituir os outros
 * blocos do painel.
 *
 * Vive em arquivo próprio porque MockupConfigPanel.tsx e MockupProductSelector.tsx estão no
 * ratchet de tamanho (500 linhas): o bloco só chama, o aviso mora aqui.
 */
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export interface LoadErrorBlockProps {
  /** data-testid do aviso (um por bloco do painel). */
  testId: string;
  /** Título curto do que falhou (ex.: "Não foi possível carregar produtos"). */
  title: string;
  /** Mensagem vinda de quem carrega o bloco (não vazia: o bloco só é montado com erro). */
  message: string;
  /** Retry da MESMA carga que falhou. Sem callback, o aviso sai sem botão. */
  onRetry?: () => void;
}

/**
 * Compacto de propósito: <EdgeFallback variant="error"> é o fallback de tela inteira
 * (min-h-[240px], max-w-md, <h2>), pesado demais para um bloco dentro do Card do painel.
 */
export function LoadErrorBlock({ testId, title, message, onRetry }: LoadErrorBlockProps) {
  return (
    <Alert variant="destructive" data-testid={testId}>
      <AlertCircle className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>{message}</span>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-7 gap-1.5 border-destructive/20 text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Tentar novamente
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
