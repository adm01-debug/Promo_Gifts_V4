/**
 * MockupCompletionStates — os três estados de conclusão do mockup, separados.
 *
 * Imagem gerada, projeto salvo e ficha disponível são condições DISTINTAS
 * (Codex p.12/15): cada uma tem o próprio estado, o próprio erro e a própria
 * repetição. A falha de uma nunca esconde nem resolve nenhuma outra.
 *
 * "Salvo" só aparece com persistência CONFIRMADA pelo dono do estado (a
 * existência da imagem não conta como salvo): quem chama informa `done`.
 */
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, CloudOff, FileText, ImageIcon, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Estado de conclusão de UMA condição do resultado. */
export type MockupCompletionStatus = 'done' | 'error' | 'idle' | 'running';

export interface MockupCompletionState {
  status: MockupCompletionStatus;
  /** Mensagem daquela condição. Um erro aqui nunca esconde nenhuma outra condição. */
  error?: string | null;
}

type CompletionLabels = Record<MockupCompletionStatus, string>;

const IMAGE_LABELS: CompletionLabels = {
  idle: 'Imagem ainda não gerada',
  running: 'Gerando imagem...',
  done: 'Imagem gerada',
  error: 'Falha ao gerar a imagem',
};

const PROJECT_SAVE_LABELS: CompletionLabels = {
  idle: 'Projeto ainda não salvo',
  running: 'Salvando o projeto...',
  done: 'Projeto salvo',
  error: 'O projeto não foi salvo',
};

const SHEET_LABELS: CompletionLabels = {
  idle: 'Ficha ainda não disponível',
  running: 'Preparando a ficha...',
  done: 'Ficha disponível',
  error: 'A ficha não ficou pronta',
};

interface CompletionIndicatorProps {
  testId: string;
  status: MockupCompletionStatus;
  labels: CompletionLabels;
  idleIcon: ReactNode;
  error?: string | null;
  retryLabel: string;
  retryTestId: string;
  onRetry?: () => void;
}

/**
 * Indicador de UMA condição. O erro e a repetição pertencem só a ele: falhar
 * aqui não muda o estado nem o erro dos outros indicadores.
 */
function CompletionIndicator({
  testId,
  status,
  labels,
  idleIcon,
  error,
  retryLabel,
  retryTestId,
  onRetry,
}: CompletionIndicatorProps) {
  return (
    <div
      data-testid={testId}
      data-status={status}
      className={cn(
        'flex min-w-[11rem] flex-1 items-start gap-2 rounded-lg border px-2.5 py-2 text-xs',
        status === 'done' && 'border-success/40 bg-success/10 text-success',
        status === 'running' && 'border-border/40 bg-muted/30 text-muted-foreground',
        status === 'idle' && 'border-border/40 bg-muted/20 text-muted-foreground',
        status === 'error' && 'border-destructive/40 bg-destructive/10 text-destructive',
      )}
    >
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {status === 'done' ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : status === 'running' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : status === 'error' ? (
          <AlertCircle className="h-3.5 w-3.5" />
        ) : (
          idleIcon
        )}
      </span>
      <div className="flex-1 space-y-1">
        <p className="font-medium">{labels[status]}</p>
        {status === 'error' && error && <p className="text-destructive/90">{error}</p>}
        {status === 'error' && onRetry && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 gap-1 px-2 text-[11px]"
            data-testid={retryTestId}
            onClick={onRetry}
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export interface MockupCompletionStatesProps {
  imageStatus: MockupCompletionStatus;
  imageError?: string | null;
  /** Repetir a geração da imagem. */
  onRetryImage?: () => void;
  /** Persistência do projeto no histórico. */
  projectSave?: MockupCompletionState;
  /** Repetir APENAS o salvamento do projeto — nunca gera outra imagem. */
  onRetrySave?: () => void;
  /** Ficha de aprovação do projeto. */
  sheet?: MockupCompletionState;
  /** Repetir APENAS a preparação da ficha — nunca gera outra imagem. */
  onRetrySheet?: () => void;
}

export function MockupCompletionStates({
  imageStatus,
  imageError,
  onRetryImage,
  projectSave,
  onRetrySave,
  sheet,
  onRetrySheet,
}: MockupCompletionStatesProps) {
  return (
    <section
      data-testid="mockup-completion-states"
      aria-label="Estado de conclusão do mockup"
      aria-live="polite"
      className="flex flex-wrap items-stretch gap-2"
    >
      <CompletionIndicator
        testId="completion-image"
        status={imageStatus}
        labels={IMAGE_LABELS}
        idleIcon={<ImageIcon className="h-3.5 w-3.5" />}
        error={imageStatus === 'error' ? imageError : null}
        retryLabel="Gerar novamente"
        retryTestId="retry-generate"
        onRetry={onRetryImage}
      />
      <CompletionIndicator
        testId="completion-project-save"
        status={projectSave?.status ?? 'idle'}
        labels={PROJECT_SAVE_LABELS}
        idleIcon={<CloudOff className="h-3.5 w-3.5" />}
        error={projectSave?.error}
        retryLabel="Salvar de novo"
        retryTestId="retry-save"
        onRetry={onRetrySave}
      />
      <CompletionIndicator
        testId="completion-sheet"
        status={sheet?.status ?? 'idle'}
        labels={SHEET_LABELS}
        idleIcon={<FileText className="h-3.5 w-3.5" />}
        error={sheet?.error}
        retryLabel="Tentar de novo"
        retryTestId="retry-sheet"
        onRetry={onRetrySheet}
      />
    </section>
  );
}
