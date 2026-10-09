/**
 * MockupToolbar — Cabeçalho de trabalho do gerador de mockups.
 *
 * Reúne, numa linha: o cliente selecionado, o nome do projeto (quando
 * informado), a ação "Trocar cliente" (que reconcilia a marca já aplicada —
 * nunca troca em silêncio), o desfazer/refazer de posição, o estado de
 * salvamento do rascunho e o acesso ao histórico ("Meus mockups").
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2,
  Undo2,
  Redo2,
  Cloud,
  CloudOff,
  Building2,
  RefreshCw,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** O que fazer com a marca já aplicada quando o cliente muda. */
export type ClientBrandDisposition = 'limpar-marca' | 'manter-marca';

interface MockupToolbarClient {
  name: string;
  logoUrl?: string | null;
}

interface MockupToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isDraftSaving: boolean;
  lastSaved: Date | null;
  draftError: string | null;
  /** Cliente selecionado no CRM — exibido no cabeçalho. */
  client?: MockupToolbarClient | null;
  /** Nome do projeto/campanha; exibido apenas quando informado. */
  projectName?: string | null;
  /** Há marca do cliente (logo do CRM) aplicada na área ativa. */
  hasAppliedBrand?: boolean;
  /**
   * Chamado APÓS a reconciliação da marca. `disposition` diz o que fazer com a
   * marca já aplicada; quem consome troca o cliente e aplica a escolha.
   */
  onChangeClient?: (disposition: ClientBrandDisposition) => void;
  /** Rota do histórico ("Meus mockups"). */
  historyHref?: string;
}

export function MockupToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isDraftSaving,
  lastSaved,
  draftError,
  client = null,
  projectName = null,
  hasAppliedBrand = false,
  onChangeClient,
  historyHref = '/mockups/historico',
}: MockupToolbarProps) {
  const [confirmChangeOpen, setConfirmChangeOpen] = useState(false);

  const handleChangeClient = () => {
    // Com marca aplicada, pergunta antes — nunca troca em silêncio.
    if (hasAppliedBrand) {
      setConfirmChangeOpen(true);
      return;
    }
    onChangeClient?.('manter-marca');
  };

  const resolveDisposition = (disposition: ClientBrandDisposition) => {
    setConfirmChangeOpen(false);
    onChangeClient?.(disposition);
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      <div className="flex min-w-0 items-center gap-2" data-testid="mockup-toolbar-client">
        <Building2 aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">
            {client ? client.name : 'Sem cliente'}
          </p>
          {projectName ? (
            <p
              className="truncate text-[11px] text-muted-foreground"
              data-testid="mockup-toolbar-project"
            >
              {projectName}
            </p>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs"
          aria-label="Trocar cliente"
          onClick={handleChangeClient}
          disabled={!onChangeClient}
        >
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
          Trocar cliente
        </Button>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Desfazer"
              className="h-8 w-8"
              disabled={!canUndo}
              onClick={onUndo}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Desfazer (Ctrl+Z)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Refazer"
              className="h-8 w-8"
              disabled={!canRedo}
              onClick={onRedo}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Refazer (Ctrl+Shift+Z)</TooltipContent>
      </Tooltip>

      <div className="ml-1">
        {isDraftSaving ? (
          <Badge variant="secondary" className="flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Salvando...
          </Badge>
        ) : lastSaved ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Badge variant="outline" className="flex cursor-default items-center gap-1.5">
                  <Cloud className="h-3 w-3 text-success" />
                  Salvo
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Último salvamento: {format(lastSaved, 'HH:mm:ss', { locale: ptBR })}
            </TooltipContent>
          </Tooltip>
        ) : draftError ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Badge variant="destructive" className="flex cursor-default items-center gap-1.5">
                  <CloudOff className="h-3 w-3" />
                  Erro ao salvar
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent>{draftError}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs">
        <Link to={historyHref} aria-label="Meus mockups">
          <History aria-hidden="true" className="h-3.5 w-3.5" />
          Meus mockups
        </Link>
      </Button>

      <ConfirmDialog
        open={confirmChangeOpen}
        onOpenChange={setConfirmChangeOpen}
        title="Trocar de cliente?"
        description="Há uma marca aplicada na área ativa. O que fazer com ela ao trocar de cliente?"
        confirmLabel="Manter marca"
        cancelLabel="Remover marca"
        onConfirm={() => resolveDisposition('manter-marca')}
        onCancel={() => resolveDisposition('limpar-marca')}
        testId="change-client-dialog"
      />
    </div>
  );
}
