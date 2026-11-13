/**
 * ProductMarketingSection — Seletores de classificação de marketing (padrão Super Filtro)
 * Público-Alvo, Datas Comemorativas e Endomarketing
 * Gradientes, badges, color dots, contadores hierárquicos
 *
 * Opções = cadastros reais (target_audiences, commemorative_dates, endomarketing_themes);
 * marcações = vínculos do produto. Ver productMarketingData.ts. Não toca products.tags.
 */

import { useState, useEffect, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { X, Users, Calendar, Megaphone, ChevronDown, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  fetchProductMarketing,
  fetchProductMarketingLinks,
  isManualLink,
  selectMarketingOption,
  unselectMarketingOption,
  type MarketingCategoryKey,
  type MarketingLink,
  type ProductMarketingData,
} from './productMarketingData';

interface ProductMarketingSectionProps {
  productId: string;
}

type CategoryKey = MarketingCategoryKey;

const CATEGORY_COLORS: Record<CategoryKey, string> = {
  publicoAlvo: '#3B82F6',
  datasComemorativas: '#EF4444',
  endomarketing: '#8B5CF6',
};

const CATEGORIES: {
  key: CategoryKey;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: 'publicoAlvo', label: 'Público-Alvo', icon: Users },
  { key: 'datasComemorativas', label: 'Datas Comemorativas', icon: Calendar },
  { key: 'endomarketing', label: 'Endomarketing', icon: Megaphone },
];

const EMPTY_DATA: ProductMarketingData = {
  publicoAlvo: { options: [], links: [], loadError: null },
  datasComemorativas: { options: [], links: [], loadError: null },
  endomarketing: { options: [], links: [], loadError: null },
};

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function activeLinkFor(links: MarketingLink[], optionId: string): MarketingLink | undefined {
  return links.find((l) => l.optionId === optionId && l.isActive);
}

export function ProductMarketingSection({ productId }: ProductMarketingSectionProps) {
  const [data, setData] = useState<ProductMarketingData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingKeys, setTogglingKeys] = useState<Set<string>>(new Set());
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProductMarketing(productId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err: unknown) => {
        if (!cancelled) toast.error(errorMessage(err, 'Erro ao carregar marketing do produto'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const reloadLinks = useCallback(
    async (category: CategoryKey) => {
      const links = await fetchProductMarketingLinks(productId, category);
      setData((prev) => ({ ...prev, [category]: { ...prev[category], links } }));
    },
    [productId],
  );

  const toggleItem = useCallback(
    async (category: CategoryKey, optionId: string) => {
      const toggleKey = `${category}::${optionId}`;
      if (togglingKeys.has(toggleKey)) return;
      setTogglingKeys((prev) => new Set(prev).add(toggleKey));

      const links = data[category].links;
      const active = activeLinkFor(links, optionId);

      setSaving(true);
      try {
        if (active) {
          await unselectMarketingOption(category, active);
        } else {
          const existing = links.find((l) => l.optionId === optionId);
          await selectMarketingOption(productId, category, optionId, existing);
        }
        toast.success(active ? 'Removido' : 'Adicionado');
      } catch (err) {
        toast.error(errorMessage(err, 'Erro ao salvar'));
      } finally {
        try {
          await reloadLinks(category);
        } catch {
          // a leitura falhou: mantém o estado anterior, o toast do erro já foi mostrado
        }
        setSaving(false);
        setTogglingKeys((prev) => {
          const next = new Set(prev);
          next.delete(toggleKey);
          return next;
        });
      }
    },
    [data, productId, reloadLinks, togglingKeys],
  );

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearAll = useCallback(async () => {
    if (saving || togglingKeys.size > 0) return; // evita 2º DELETE do mesmo vínculo (toast falso)
    setSaving(true);
    let failure: unknown = null;
    for (const { key } of CATEGORIES) {
      for (const link of data[key].links.filter((l) => l.isActive)) {
        try {
          await unselectMarketingOption(key, link);
        } catch (err) {
          failure ??= err;
        }
      }
    }
    try {
      await Promise.all(CATEGORIES.map(({ key }) => reloadLinks(key)));
    } catch {
      // mantém o estado anterior
    }
    setSaving(false);
    if (failure) toast.error(errorMessage(failure, 'Erro ao limpar'));
    else toast.success('Todas as classificações removidas');
  }, [data, reloadLinks, saving, togglingKeys]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  const selectedOf = (key: CategoryKey) => {
    const { options, links } = data[key];
    const activeIds = new Set(links.filter((l) => l.isActive).map((l) => l.optionId));
    return options.filter((o) => activeIds.has(o.id));
  };
  const totalSelected = CATEGORIES.reduce((sum, cat) => sum + selectedOf(cat.key).length, 0);
  const totalOptions = CATEGORIES.reduce((sum, cat) => sum + data[cat.key].options.length, 0);
  const searchLower = search.toLowerCase();

  return (
    <div className="space-y-3">
      {totalSelected > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <Megaphone className="h-3 w-3" />
              Selecionados
              {saving && <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />}
            </span>
            <button
              type="button"
              onClick={clearAll}
              disabled={saving}
              className="text-[10px] disabled:cursor-not-allowed disabled:opacity-50 text-muted-foreground transition-colors hover:text-destructive"
            >
              Limpar todos
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.flatMap((cat) =>
              selectedOf(cat.key)
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                .map((item) => (
                  <span
                    key={`${cat.key}-${item.id}`}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground transition-all duration-200 hover:bg-muted/50"
                    onClick={() => toggleItem(cat.key, item.id)}
                  >
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[cat.key] }}
                    />
                    <span className="max-w-[100px] truncate">{item.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleItem(cat.key, item.id);
                      }}
                      aria-label={`Remover ${item.name}`}
                      className="ml-0.5 rounded-full p-0.5 transition-all duration-150 hover:bg-destructive/20 hover:text-destructive"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                )),
            )}
          </div>
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar classificação..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-8 pr-8 text-sm"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Limpar busca"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
        <span>{CATEGORIES.length} categorias</span>
        <span>•</span>
        <span>{totalOptions} opções</span>
        <span>•</span>
        <span className={cn('font-medium', totalSelected > 0 && 'text-primary')}>
          {totalSelected} selecionados
        </span>
      </div>
      <ScrollArea className="h-56">
        <div className="space-y-1.5 pr-3">
          {CATEGORIES.map(({ key, label, icon: Icon }) => {
            const { options, links, loadError } = data[key];
            const selected = selectedOf(key);
            const color = CATEGORY_COLORS[key];
            const filteredOptions = search
              ? options.filter((o) => o.name.toLowerCase().includes(searchLower))
              : options;
            if (
              search &&
              filteredOptions.length === 0 &&
              !label.toLowerCase().includes(searchLower)
            )
              return null;
            const linkedInCat = selected.length;
            const isOpen = openGroups.has(key) || !!search;
            const hasAnySelection = linkedInCat > 0;
            return (
              <div
                key={key}
                className={cn(
                  'overflow-hidden rounded-lg transition-all duration-200',
                  hasAnySelection
                    ? 'bg-gradient-to-r from-primary/10 to-primary/5 ring-1 ring-primary/30'
                    : 'bg-muted/30 hover:bg-muted/50',
                )}
              >
                <div className="flex items-center gap-2 p-2.5">
                  <button
                    type="button"
                    onClick={() => toggleGroup(key)}
                    aria-label={`${isOpen ? 'Recolher' : 'Expandir'} ${label}`}
                    aria-expanded={isOpen}
                    className={cn(
                      'rounded-md p-1 transition-all duration-200',
                      isOpen ? 'bg-primary/10' : 'bg-muted hover:bg-muted/80',
                    )}
                  >
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 transition-transform duration-200',
                        isOpen ? 'rotate-180 text-primary' : 'text-muted-foreground',
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      'h-4 w-4 flex-shrink-0 rounded-full ring-2 ring-offset-1 ring-offset-background transition-all',
                      hasAnySelection ? 'scale-110 ring-primary/50' : 'ring-border/50',
                    )}
                    style={{ backgroundColor: color, boxShadow: `0 2px 8px ${color}40` }}
                  />
                  <Icon
                    className={cn(
                      'h-3.5 w-3.5 flex-shrink-0 transition-colors',
                      hasAnySelection ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                  <span
                    className={cn(
                      'flex-1 truncate text-sm font-medium transition-colors',
                      hasAnySelection ? 'text-primary' : 'text-foreground',
                    )}
                  >
                    {label}
                  </span>
                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    {linkedInCat > 0 && (
                      <span className="min-w-[18px] rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] font-bold text-primary-foreground">
                        {linkedInCat}
                      </span>
                    )}
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[11px]',
                        hasAnySelection
                          ? 'bg-primary/20 font-medium text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {filteredOptions.length}
                    </span>
                  </div>
                </div>
                {isOpen && filteredOptions.length > 0 && (
                  <div className="space-y-0.5 px-2.5 pb-2.5">
                    <div className="ml-8 border-t border-border/30 pt-2">
                      {filteredOptions.map((opt) => {
                        const activeLink = activeLinkFor(links, opt.id);
                        const isSelected = !!activeLink;
                        const inherited = !!activeLink && !isManualLink(activeLink);
                        return (
                          <label
                            key={opt.id}
                            className={cn(
                              'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-all duration-150',
                              isSelected
                                ? 'bg-primary/15 font-medium text-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                            )}
                          >
                            {togglingKeys.has(`${key}::${opt.id}`) ? (
                              <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-primary" />
                            ) : (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleItem(key, opt.id)}
                                aria-label={opt.name}
                                className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                              />
                            )}
                            <span
                              className="h-2 w-2 flex-shrink-0 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="flex-1 truncate">{opt.name}</span>
                            {inherited && (
                              <span
                                className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground"
                                title="Vínculo herdado da categoria. Desmarcar só desliga neste produto."
                              >
                                da categoria
                              </span>
                            )}
                            {isSelected && (
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                {isOpen && filteredOptions.length === 0 && (
                  <div className="px-2.5 pb-2.5">
                    <div className="ml-8 border-t border-border/30 pt-2">
                      <p className="py-2 text-xs italic text-muted-foreground">
                        {loadError ?? 'Nenhuma opção encontrada'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
