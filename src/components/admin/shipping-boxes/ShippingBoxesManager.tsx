/**
 * Cadastro de caixas de transporte (aba "Caixas de transporte" em Cadastros).
 *
 * São as caixas padrão da empresa que o motor de frete (`src/lib/freight`) usa
 * para montar os volumes. Aqui o admin cria, edita, ativa/desativa, exclui
 * (exclusão lógica) e restaura.
 *
 * Os avisos de sucesso e de erro saem dos hooks de `@/hooks/freight`; esta tela
 * não dispara toast. Quando o banco recusa o código por já estar em uso, a
 * mensagem também fica no campo Código do formulário, que continua aberto.
 */
import { useState } from 'react';
import { Boxes, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useFreightSettings, useShippingBoxes, useShippingBoxMutations } from '@/hooks/freight';
import {
  ShippingBoxError,
  type ShippingBoxRow,
  type ShippingBoxWrite,
} from '@/services/shippingBoxService';
import { ShippingBoxFormDialog, type RejectedShippingBoxCode } from './ShippingBoxFormDialog';
import { ShippingBoxesTable } from './ShippingBoxesTable';
import { ShippingBoxesTrash } from './ShippingBoxesTrash';
import {
  SHIPPING_BOX_COLUMN_FILL_FACTOR,
  buildShippingBoxPatch,
  nextShippingBoxSortOrder,
} from './shippingBoxFormSchema';

export function ShippingBoxesManager() {
  const { rows, isLoading, isError, refetch } = useShippingBoxes({ includeInactive: true });
  const { create, update, softDelete, restore } = useShippingBoxMutations();
  const { row: freightSettings, isLoading: settingsLoading } = useFreightSettings();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<ShippingBoxRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShippingBoxRow | null>(null);
  const [rejectedCode, setRejectedCode] = useState<RejectedShippingBoxCode | null>(null);
  const [newBoxFillFactor, setNewBoxFillFactor] = useState(SHIPPING_BOX_COLUMN_FILL_FACTOR);
  const [newBoxSortOrder, setNewBoxSortOrder] = useState(0);

  const openForm = (box: ShippingBoxRow | null) => {
    setEditingBox(box);
    setRejectedCode(null);
    // Fixado na abertura: parâmetros que chegam depois não apagam o que já foi
    // digitado. Enquanto não carregaram, vale o DEFAULT da coluna no banco.
    setNewBoxFillFactor(freightSettings?.default_fill_factor ?? SHIPPING_BOX_COLUMN_FILL_FACTOR);
    setNewBoxSortOrder(nextShippingBoxSortOrder(rows));
    setDialogOpen(true);
  };

  const handleSave = (values: ShippingBoxWrite) => {
    const callbacks = {
      onSuccess: () => setDialogOpen(false),
      onError: (error: Error) => {
        if (error instanceof ShippingBoxError && error.reason === 'duplicate_code') {
          setRejectedCode({ code: values.code, message: error.message });
        }
        // A lista já foi recarregada: a caixa aberta pode nem existir mais.
        if (error instanceof ShippingBoxError && error.reason === 'not_applied') {
          setDialogOpen(false);
        }
      },
    };
    setRejectedCode(null);
    if (editingBox) {
      const patch = buildShippingBoxPatch(editingBox, values);
      if (Object.keys(patch).length === 0) {
        setDialogOpen(false);
        return;
      }
      // A promessa devolvida libera a trava de envio do formulário mesmo quando
      // a gravação falha antes de `isPending` chegar à tela; o erro já foi
      // tratado nos callbacks e no hook.
      return Promise.resolve(update.mutateAsync({ id: editingBox.id, patch }, callbacks)).catch(
        () => undefined,
      );
    }
    return Promise.resolve(create.mutateAsync(values, callbacks)).catch(() => undefined);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    softDelete.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  const saving = create.isPending || update.isPending;
  const busy = update.isPending || softDelete.isPending || restore.isPending;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Caixas de transporte</h2>
            <p className="text-sm text-muted-foreground">
              Caixas padrão da empresa usadas para calcular os volumes do frete.
            </p>
          </div>
        </div>
        <Button
          onClick={() => openForm(null)}
          disabled={settingsLoading}
          data-testid="admin-create-btn"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nova caixa
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando caixas de transporte...
        </div>
      ) : isError ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <span className="text-destructive">
            Não foi possível carregar a lista de caixas de transporte.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void refetch();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="space-y-3 rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma caixa de transporte cadastrada. Sem caixas, o frete não é calculado.
          </p>
          <Button variant="outline" onClick={() => openForm(null)} disabled={settingsLoading}>
            <Plus className="mr-1.5 h-4 w-4" />
            Cadastrar a primeira caixa
          </Button>
        </div>
      ) : (
        <ShippingBoxesTable
          boxes={rows}
          onEdit={openForm}
          onToggleActive={(box, active) =>
            update.mutate({ id: box.id, patch: { is_active: active } })
          }
          onDelete={setDeleteTarget}
          busy={busy}
        />
      )}

      {isLoading || isError ? null : (
        <ShippingBoxesTrash
          onRestore={(box) => restore.mutate({ id: box.id, code: box.code })}
          busy={busy}
        />
      )}

      <ShippingBoxFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        box={editingBox}
        newBoxFillFactor={newBoxFillFactor}
        newBoxSortOrder={newBoxSortOrder}
        saving={saving}
        rejectedCode={rejectedCode}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}
        variant="destructive"
        title="Excluir caixa de transporte?"
        description={
          deleteTarget
            ? `A caixa ${deleteTarget.code} (${deleteTarget.name}) sai do cadastro e do cálculo de frete. Dá para trazer de volta em "Caixas excluídas".`
            : ''
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        loading={softDelete.isPending}
        testId="admin-confirm-delete-dialog"
      />
    </div>
  );
}
