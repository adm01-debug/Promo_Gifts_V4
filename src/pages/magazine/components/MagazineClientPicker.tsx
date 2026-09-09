/**
 * MagazineClientPicker — busca empresas do CRM (is_customer=true) e
 * preenche nome + logo do cliente automaticamente. Fallback manual permanece.
 */

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Check, ChevronDown, Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { selectCrm } from '@/lib/crm-db';
import { getCompanyDisplayName, type CrmCompany } from '@/types/crm';
import { PG_HELP, PG_INPUT } from '../pg';

interface Props {
  clientName: string | null;
  clientLogoUrl: string | null;
  clientCrmId?: string | null;
  onChange: (patch: {
    clientCrmId?: string | null;
    clientName?: string | null;
    clientLogoUrl?: string | null;
  }) => void;
}

interface Row {
  id: string;
  name: string;
  logo_url: string | null;
  cnpj: string | null;
  ramo: string | null;
}

export function MagazineClientPicker({ clientName, clientLogoUrl, clientCrmId, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['magazine-crm-companies'],
    queryFn: async () => {
      const rows = await selectCrm<CrmCompany>('companies', {
        select: 'id, razao_social, nome_fantasia, logo_url, ramo_atividade, cnpj',
        filters: { deleted_at: null, is_customer: true },
        orderBy: { column: 'razao_social', ascending: true },
        limit: 200,
      });
      return rows.map<Row>((c) => ({
        id: c.id,
        name: getCompanyDisplayName(c),
        logo_url: c.logo_url ?? null,
        cnpj: c.cnpj ?? null,
        ramo: c.ramo_atividade ?? null,
      }));
    },
    staleTime: 15 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (!debounced) return companies.slice(0, 40);
    const q = debounced.toLowerCase();
    const digits = q.replace(/\D/g, '');
    return companies
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (digits.length > 0 && (c.cnpj ?? '').replace(/\D/g, '').includes(digits)),
      )
      .slice(0, 40);
  }, [companies, debounced]);

  const select = (row: Row) => {
    onChange({ clientCrmId: row.id, clientName: row.name, clientLogoUrl: row.logo_url });
    setOpen(false);
  };

  const clear = () => onChange({ clientCrmId: null, clientName: null, clientLogoUrl: null });

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex h-11 items-center gap-2 rounded-md border border-border bg-background pl-3 pr-1.5 transition-colors duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 hover:border-border-strong',
        )}
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-full min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Escolher cliente do CRM"
              aria-haspopup="listbox"
              aria-expanded={open}
              data-testid="magazine-client-picker-trigger"
            >
              {clientLogoUrl ? (
                <img src={clientLogoUrl} alt="" className="h-6 w-6 rounded-sm object-contain" />
              ) : (
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span
                className={cn(
                  'flex-1 truncate text-[13px] font-medium',
                  clientName ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {clientName || 'Selecionar cliente do CRM'}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="pg-module w-96 rounded-lg border-border bg-popover p-0 shadow-lg"
          >
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar cliente por nome ou CNPJ…"
                  className={cn(PG_INPUT, 'h-9 pl-8')}
                  aria-label="Buscar cliente"
                />
              </div>
            </div>
            <ScrollArea className="h-72">
              <div role="listbox" aria-label="Empresas do CRM" className="p-1">
                {isLoading && (
                  <div className="p-4 text-center text-xs text-muted-foreground">Carregando…</div>
                )}
                {!isLoading && filtered.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Nenhum cliente encontrado.
                  </div>
                )}
                {filtered.map((c) => {
                  const active = c.id === clientCrmId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => select(c)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors duration-150 hover:bg-card-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        active && 'bg-primary/10',
                      )}
                    >
                      {c.logo_url ? (
                        <img
                          src={c.logo_url}
                          alt=""
                          className="h-8 w-8 rounded-sm object-contain"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-card-elevated text-muted-foreground">
                          <Building2 className="h-4 w-4" aria-hidden />
                        </div>
                      )}
                      <div className="flex-1 overflow-hidden">
                        <div className="line-clamp-1 text-[13px] font-medium text-foreground">
                          {c.name}
                        </div>
                        <div className="line-clamp-1 text-[11px] text-muted-foreground">
                          {c.cnpj ?? '—'}
                          {c.ramo ? ` · ${c.ramo}` : ''}
                        </div>
                      </div>
                      {active && <Check className="h-4 w-4 text-primary" aria-hidden />}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
        {clientName && (
          <button
            type="button"
            onClick={clear}
            aria-label="Remover cliente"
            className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-card-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Fechar lista de clientes' : 'Abrir lista de clientes'}
          className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-card-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </button>
      </div>
      <p className={PG_HELP}>
        Lista apenas empresas marcadas como clientes no CRM. Também é possível preencher manualmente
        no campo abaixo.
      </p>
    </div>
  );
}
