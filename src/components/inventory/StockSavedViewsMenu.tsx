/**
 * StockSavedViewsMenu — views salvas do painel de risco EMA (Melhoria 18 da Onda 3).
 *
 * Fecha o trabalho que estava pela metade: o hook useSavedStockViews existia sem nenhum consumidor
 * e escrevia em public.saved_stock_views, tabela que nao existia (criada na migration
 * 20261126130000). Aqui o operador salva o filtro atual do painel, aplica uma view, fixa e remove.
 */
import { useState } from 'react';
import { Bookmark, Filter, Loader2, Pin, PinOff, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSavedStockViews } from '@/hooks/stock/useSavedStockViews';
import {
  STOCK_VIEW_DESCRIPTION_MAX_LENGTH,
  STOCK_VIEW_NAME_MAX_LENGTH,
  describeFilters,
  formatViewUsage,
  validateSavedStockViewName,
  type SavedStockViewRow,
  type StockViewFilters,
} from '@/lib/stock/saved-views';

export interface StockSavedViewsMenuProps {
  filters: StockViewFilters;
  onApply: (filters: StockViewFilters) => void;
}

export function StockSavedViewsMenu({ filters, onApply }: StockSavedViewsMenuProps) {
  const { views, isLoading, error, refetch, saveView, togglePin, recordUsage, deleteView } =
    useSavedStockViews();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedStockViewRow | null>(null);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setFormError(null);
  };

  const handleApply = (view: SavedStockViewRow) => {
    onApply(view.filters);
    recordUsage.mutate({ id: view.id, useCount: view.use_count });
    setOpen(false);
  };

  const handleSave = () => {
    const validation = validateSavedStockViewName(name, views);
    if (!validation.ok) {
      setFormError(validation.error);
      return;
    }
    setFormError(null);
    saveView.mutate(
      { name: validation.value, description, filters },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
          setOpen(false);
        },
      },
    );
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteView.mutate(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1" data-testid="stock-views-trigger">
            <Bookmark className="h-3.5 w-3.5" />
            Views salvas
            {views.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {views.length}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent
          className="max-h-[85vh] overflow-y-auto sm:max-w-lg"
          data-testid="stock-views-dialog"
        >
          <DialogHeader>
            <DialogTitle>Views salvas</DialogTitle>
            <DialogDescription>
              Filtro atual do painel: {describeFilters(filters)}. Salve para reaplicar com um
              clique.
            </DialogDescription>
          </DialogHeader>

          <section aria-label="Views salvas" className="space-y-2">
            {isLoading && (
              <div
                className="flex items-center gap-2 py-6 text-sm text-muted-foreground"
                data-testid="stock-views-loading"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando views
              </div>
            )}

            {!isLoading && error && (
              <div
                className="space-y-2 rounded-md border border-destructive/40 p-3"
                data-testid="stock-views-error"
              >
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </div>
            )}

            {!isLoading && !error && views.length === 0 && (
              <p
                className="py-6 text-center text-sm text-muted-foreground"
                data-testid="stock-views-empty"
              >
                Nenhuma view salva ainda. Salve o filtro atual no formulário abaixo.
              </p>
            )}

            {!isLoading && !error && views.length > 0 && (
              <ul className="divide-y rounded-md border" data-testid="stock-views-list">
                {views.map((view) => (
                  <li key={view.id} className="flex items-start gap-2 p-3" data-testid="stock-view-item">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{view.name}</span>
                        {view.is_pinned && (
                          <Pin className="h-3 w-3 shrink-0 text-primary" aria-label="fixada" />
                        )}
                      </div>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <Filter className="h-3 w-3" />
                        {describeFilters(view.filters)}
                        <span aria-hidden="true">·</span>
                        {formatViewUsage(view.use_count)}
                      </p>
                      {view.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {view.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleApply(view)}
                        data-testid="stock-view-apply"
                      >
                        Aplicar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={view.is_pinned ? `Desafixar ${view.name}` : `Fixar ${view.name}`}
                        onClick={() => togglePin.mutate({ id: view.id, isPinned: view.is_pinned })}
                        data-testid="stock-view-pin"
                      >
                        {view.is_pinned ? (
                          <PinOff className="h-3.5 w-3.5" />
                        ) : (
                          <Pin className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        aria-label={`Remover ${view.name}`}
                        onClick={() => setPendingDelete(view)}
                        data-testid="stock-view-delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Salvar view atual" className="space-y-2 border-t pt-3">
            <div className="space-y-1">
              <Label htmlFor="stock-view-name">Nome da view</Label>
              <Input
                id="stock-view-name"
                value={name}
                maxLength={STOCK_VIEW_NAME_MAX_LENGTH}
                placeholder="Ex.: Ruptura crítica da região Sul"
                onChange={(event) => {
                  setName(event.target.value);
                  if (formError) setFormError(null);
                }}
                data-testid="stock-view-name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="stock-view-description">Descrição (opcional)</Label>
              <Textarea
                id="stock-view-description"
                rows={2}
                value={description}
                maxLength={STOCK_VIEW_DESCRIPTION_MAX_LENGTH}
                placeholder="Para que serve este filtro"
                onChange={(event) => setDescription(event.target.value)}
                data-testid="stock-view-description"
              />
            </div>
            {formError && (
              <p className="text-xs text-destructive" role="alert" data-testid="stock-view-save-error">
                {formError}
              </p>
            )}
            <DialogFooter className="gap-2 pt-1">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Fechar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveView.isPending}
                data-testid="stock-view-save-submit"
              >
                {saveView.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                Salvar view atual
              </Button>
            </DialogFooter>
          </section>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover a view {pendingDelete ? pendingDelete.name : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita: o filtro salvo sera perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} data-testid="stock-view-delete-confirm">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
