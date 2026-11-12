/**
 * CategoriesManager — aba admin para editar (nome/pai) e desativar categorias.
 */
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Pencil, PowerOff, Search } from 'lucide-react';
import {
  EXTERNAL_CATEGORIES_QUERY_KEY,
  useExternalCategoriesQuery,
  type ExternalCategory,
} from '@/hooks/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CategoryWriteDeniedError,
  deactivateCategory,
  getDescendantIds,
  updateCategory,
} from './categoryMutations';

const ROOT = '__none__';

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof CategoryWriteDeniedError
    ? 'Sem permissão para alterar categorias (apenas owner/admin da organização).'
    : fallback;
}

export function CategoriesManager() {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading, isError, refetch } = useExternalCategoriesQuery();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ExternalCategory | null>(null);
  const [editName, setEditName] = useState('');
  const [editParent, setEditParent] = useState<string>(ROOT);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState<ExternalCategory | null>(null);
  const [deactivatingBusy, setDeactivatingBusy] = useState(false);

  const paths = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const result = new Map<string, string>();
    for (const c of categories) {
      const parts: string[] = [];
      const seen = new Set<string>();
      let cur: ExternalCategory | undefined = c;
      while (cur && !seen.has(cur.id)) {
        seen.add(cur.id);
        parts.unshift(cur.name);
        cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
      }
      result.set(c.id, parts.join(' › '));
    }
    return result;
  }, [categories]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return categories
      .map((c) => ({ cat: c, path: paths.get(c.id) ?? c.name }))
      .filter((r) => !term || r.path.toLowerCase().includes(term))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [categories, paths, search]);

  const parentOptions = useMemo(() => {
    if (!editing) return [];
    const blocked = getDescendantIds(categories, editing.id);
    blocked.add(editing.id);
    return categories
      .filter((c) => !blocked.has(c.id))
      .map((c) => ({ id: c.id, label: paths.get(c.id) ?? c.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categories, editing, paths]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: EXTERNAL_CATEGORIES_QUERY_KEY });

  const openEdit = (cat: ExternalCategory) => {
    setEditing(cat);
    setEditName(cat.name);
    setEditParent(cat.parent_id ?? ROOT);
  };

  const handleSave = async () => {
    if (!editing || !editName.trim()) return;
    setSaving(true);
    try {
      await updateCategory(editing.id, {
        name: editName,
        parent_id: editParent === ROOT ? null : editParent,
      });
      toast.success(`Categoria "${editName.trim()}" atualizada`);
      setEditing(null);
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao salvar categoria'));
    } finally {
      setSaving(false);
    }
  };

  const requestDeactivate = (cat: ExternalCategory) => {
    if (categories.some((c) => c.parent_id === cat.id)) {
      toast.error('Esta categoria tem subcategorias ativas. Mova ou desative cada uma antes.');
      return;
    }
    setDeactivating(cat);
  };

  const handleDeactivate = async () => {
    if (!deactivating) return;
    setDeactivatingBusy(true);
    try {
      await deactivateCategory(deactivating.id);
      toast.success(`Categoria "${deactivating.name}" desativada`);
      setDeactivating(null);
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao desativar categoria'));
    } finally {
      setDeactivatingBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 p-4 text-sm">
        <span className="text-destructive">Não foi possível carregar a lista de categorias.</span>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar categoria..."
          aria-label="Buscar categoria"
          className="pl-9"
        />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {search.trim() ? 'Nenhuma categoria encontrada.' : 'Nenhuma categoria ativa cadastrada.'}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border" data-testid="categories-manager-list">
          {rows.map(({ cat, path }) => (
            <li key={cat.id} className="flex items-center justify-between gap-3 px-4 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{path}</p>
                <p className="text-xs text-muted-foreground">
                  {cat.products_count ?? 0} produto(s)
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Editar ${cat.name}`}
                  onClick={() => openEdit(cat)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Desativar ${cat.name}`}
                  onClick={() => requestDeactivate(cat)}
                >
                  <PowerOff className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && !saving && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="edit-category-name" className="text-xs font-semibold">
                Nome da Categoria <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-category-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1.5 h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Categoria Pai</Label>
              <Select value={editParent} onValueChange={setEditParent}>
                <SelectTrigger className="mt-1.5 h-9" aria-label="Categoria Pai">
                  <SelectValue placeholder="Nenhuma (raiz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROOT}>Nenhuma (raiz)</SelectItem>
                  {parentOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => setEditing(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!editName.trim() || saving}
                onClick={handleSave}
                className="gap-1.5"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deactivating}
        onOpenChange={(v) => !v && setDeactivating(null)}
        title="Desativar categoria?"
        description={
          deactivating
            ? `"${deactivating.name}" deixa de aparecer na seleção e no catálogo. ${deactivating.products_count ?? 0} produto(s) vinculado(s) mantêm o vínculo.`
            : undefined
        }
        confirmLabel="Desativar"
        variant="destructive"
        loading={deactivatingBusy}
        onConfirm={handleDeactivate}
      />
    </div>
  );
}
