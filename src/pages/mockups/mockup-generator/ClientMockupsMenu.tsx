/**
 * ClientMockupsMenu — "Meus mockups" do cabeçalho do gerador.
 *
 * Abre um painel com os mockups já salvos do cliente selecionado (via
 * `useClientMockups`, consulta por `client_id` do CRM) com estados reais:
 * sem cliente, carregando, erro com repetição e lista vazia. O rodapé leva
 * ao histórico completo (`historyHref`).
 */
import type { ReactNode } from 'react';
import { History, AlertCircle, ImageOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientMockups, type ClientMockup } from '@/hooks/mockup/useClientMockups';

interface ClientMockupsMenuProps {
  clientId: string | null;
  clientName: string | null;
  historyHref: string;
}

/** Itens exibidos no painel; o restante fica no histórico completo. */
export const CLIENT_MOCKUPS_MENU_LIMIT = 8;

function formatCreatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

function ClientMockupItem({ mockup }: { mockup: ClientMockup }) {
  const title = mockup.productName ?? 'Produto não informado';
  const subtitle = [mockup.techniqueName, formatCreatedAt(mockup.createdAt)]
    .filter(Boolean)
    .join(' · ');
  const body = (
    <>
      {mockup.thumbnailUrl ? (
        <img
          src={mockup.thumbnailUrl}
          alt=""
          className="h-10 w-10 flex-shrink-0 rounded border border-border/40 object-cover"
          loading="lazy"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded border border-border/40 bg-muted text-muted-foreground"
        >
          <ImageOff className="h-4 w-4" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-foreground">{title}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span>
      </span>
    </>
  );

  if (mockup.thumbnailUrl) {
    return (
      <li>
        <a
          href={mockup.thumbnailUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir mockup ${title}`}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {body}
        </a>
      </li>
    );
  }
  return <li className="flex items-center gap-2 px-2 py-1.5">{body}</li>;
}

/**
 * Conteúdo do painel. Montado só com o popover aberto (Radix não monta o
 * conteúdo fechado), então a consulta acontece ao abrir — não a cada render
 * da página.
 */
function ClientMockupsPanel({ clientId, clientName, historyHref }: ClientMockupsMenuProps) {
  const query = useClientMockups(clientId, { limit: CLIENT_MOCKUPS_MENU_LIMIT });
  const mockups = query.data ?? [];

  let content: ReactNode;
  if (!clientId) {
    content = (
      <p className="px-2 py-3 text-xs text-muted-foreground" data-testid="client-mockups-no-client">
        Selecione um cliente para ver os mockups salvos dele.
      </p>
    );
  } else if (query.isPending) {
    content = (
      <div role="status" aria-label="Carregando mockups do cliente" className="space-y-2 p-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (query.isError) {
    content = (
      <div role="alert" className="space-y-2 p-2" data-testid="client-mockups-error">
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          Não foi possível carregar os mockups deste cliente.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          Tentar novamente
        </Button>
      </div>
    );
  } else if (mockups.length === 0) {
    content = (
      <p className="px-2 py-3 text-xs text-muted-foreground" data-testid="client-mockups-empty">
        Nenhum mockup salvo para {clientName ?? 'este cliente'} ainda.
      </p>
    );
  } else {
    content = (
      <ul aria-label={`Mockups de ${clientName ?? 'cliente'}`} className="max-h-72 overflow-y-auto">
        {mockups.map((m) => (
          <ClientMockupItem key={m.id} mockup={m} />
        ))}
      </ul>
    );
  }

  return (
    <>
      <p className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {clientName ? `Mockups de ${clientName}` : 'Meus mockups'}
      </p>
      {content}
      <div className="mt-1 border-t border-border/40 pt-1">
        <Button asChild variant="ghost" size="sm" className="h-8 w-full justify-start text-xs">
          <Link to={historyHref}>Ver histórico completo</Link>
        </Button>
      </div>
    </>
  );
}

export function ClientMockupsMenu(props: ClientMockupsMenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs"
          data-testid="client-mockups-trigger"
        >
          <History aria-hidden="true" className="h-3.5 w-3.5" />
          Meus mockups
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-1" data-testid="client-mockups-panel">
        <ClientMockupsPanel {...props} />
      </PopoverContent>
    </Popover>
  );
}
