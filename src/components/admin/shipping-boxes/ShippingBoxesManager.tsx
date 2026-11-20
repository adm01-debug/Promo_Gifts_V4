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
import { useShippingBoxes, useShippingBoxMutations } from '@/hooks/freight';
import {
  ShippingBoxError,
  type ShippingBoxRow,
  type ShippingBoxWrite,
} from '@/services/shippingBoxService';
import { ShippingBoxFormDialog, type RejectedShippingBoxCode } from './ShippingBoxFormDialog';
import { ShippingBoxesTable } from './ShippingBoxesTable';
import { ShippingBoxesTrash } from './ShippingBoxesTrash';

export function ShippingBoxesManager() {
  const { rows, isLoading, isError, refetch } = useShippingBoxes({ includeInactive: true });
  const { create, update, softDelete, restore } = useShippingBoxMutations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<ShippingBoxRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShippingBoxRow | null>(null);
  const [rejectedCode, setRejectedCode] = useState<RejectedShippingBoxCode | null>(null);

  const openForm = (box: ShippingBoxRow | null) => {
    setEditingBox(box);
    setRejectedCode(null);
    setDialogOpen(true);
  };

  const handleSave = (values: ShippingBoxWrite) => {
    const callbacks = {
      onSuccess: () => setDialogOpen(false),
      onError: (error: Error) => {
        if (error instanceof ShippingBoxError && error.reason === 'duplicate_code') {
          setRejectedCode({ code: values.code, message: error.message });
        }
      },
    };
    setRejectedCode(null);
    if (editingBox) {
      update.mutate({ id: editingBox.id, patch: values }, callbacks);
    } else {
      create.mutate(values, callbacks);
    }
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
        <Button onClick={() => openForm(null)} data-testid="admin-create-btn">
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
          <Button variant="outline" onClick={() => openForm(null)}>
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
        <ShippingBoxesTrash onRestore={(box) => restore.mutate(box.id)} busy={busy} />
      )}

      <ShippingBoxFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        box={editingBox}
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
