/**
 * VariantStockNotesDialog — CRUD das notas operacionais de uma variação
 * (`public.stock_notes`, migration 20261031000000).
 *
 * A tabela existia desde 31/10 com RLS pronta e o hook `useStockNotes` órfão:
 * nenhuma tela criava nem lia uma nota. Este diálogo é a tela que faltava —
 * aberto pelo botão "Notas" nas ações da linha da tabela de Estoque.
 *
 * RLS: leitura para `authenticated`; escrever/fixar/excluir só a nota do
 * próprio autor. Notas de terceiros aparecem em modo leitura (sem os botões).
 */
import { useMemo, useState } from 'react';
import { AlertCircle, Loader2, Pin, PinOff, StickyNote, Trash2, User } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useStockNoteSuppliers, useStockNotes, type StockNote } from '@/hooks/stock/useStockNotes';
import {
  STOCK_NOTE_MAX_LENGTH,
  formatStockNoteAge,
  summarizeStockNotes,
  validateStockNote,
} from '@/lib/stock/stock-notes';
import { cn } from '@/lib/utils';

const NO_SUPPLIER = '__none__';

interface VariantStockNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variantId: string;
  variantLabel: string;
}

export function VariantStockNotesDialog({
  open,
  onOpenChange,
  variantId,
  variantLabel,
}: VariantStockNotesDialogProps) {
  const { user } = useAuth();
  const [draft, setDraft] = useState('');
  const [supplierId, setSupplierId] = useState<string>(NO_SUPPLIER);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<StockNote | null>(null);

  // Fechado, o diálogo não consulta nada — a tabela abre por linha.
  const { notes, isLoading, isError, error, refetch, addNote, togglePin, deleteNote } =
    useStockNotes(open ? variantId : null);
  const { data: suppliers = [] } = useStockNoteSuppliers();

  const summary = useMemo(() => summarizeStockNotes(notes, user?.id ?? null), [notes, user?.id]);
  const supplierNames = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier.name])),
    [suppliers],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateStockNote(draft);
    if (!validation.ok) {
      setDraftError(validation.message);
      return;
    }
    setDraftError(null);
    try {
      await addNote.mutateAsync({
        note: validation.value,
        supplierId: supplierId === NO_SUPPLIER ? null : supplierId,
      });
      setDraft('');
      setSupplierId(NO_SUPPLIER);
    } catch {
      // o hook já exibiu o toast com a causa traduzida
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-muted-foreground" />
              Notas operacionais
            </DialogTitle>
            <DialogDescription className="truncate">{variantLabel}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary">{summary.total} no total</Badge>
            {summary.pinned > 0 && (
              <Badge variant="outline" className="gap-1">
                <Pin className="h-3 w-3" /> {summary.pinned} fixada(s)
              </Badge>
            )}
            {summary.mine > 0 && <Badge variant="outline">{summary.mine} sua(s)</Badge>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-2" data-testid="stock-notes-form">
            <Textarea
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                if (draftError) setDraftError(null);
              }}
              placeholder="Ex.: fornecedor confirmou reposição para 05/12 — conferir entrada no CD"
              maxLength={STOCK_NOTE_MAX_LENGTH}
              rows={3}
              aria-label="Nova nota da variação"
              aria-invalid={draftError !== null}
              data-testid="stock-notes-input"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="h-9 w-[240px]" aria-label="Fornecedor da nota">
                  <SelectValue placeholder="Fornecedor (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUPPLIER}>Sem fornecedor</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[11px] text-muted-foreground">
                {draft.length}/{STOCK_NOTE_MAX_LENGTH}
              </span>
              <Button
                type="submit"
                size="sm"
                className="ml-auto gap-1"
                disabled={addNote.isPending}
                data-testid="stock-notes-submit"
              >
                {addNote.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <StickyNote className="h-3.5 w-3.5" />
                )}
                Adicionar nota
              </Button>
            </div>
            {draftError && (
              <p
                role="alert"
                className="flex items-center gap-1.5 text-xs text-destructive"
                data-testid="stock-notes-error"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {draftError}
              </p>
            )}
          </form>

          <ScrollArea className="-mx-1 max-h-[38vh] px-1">
            {isLoading ? (
              <div className="space-y-2" data-testid="stock-notes-loading">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <p className="text-sm font-medium">Falha ao carregar notas</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  {error instanceof Error ? error.message : 'Erro desconhecido.'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void refetch();
                  }}
                >
                  Tentar novamente
                </Button>
              </div>
            ) : notes.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                data-testid="stock-notes-empty"
              >
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
                  <StickyNote className="h-7 w-7 opacity-40" />
                </div>
                <p className="text-sm font-semibold text-foreground">Nenhuma nota nesta variação</p>
                <p className="max-w-xs text-center text-xs">
                  Use o campo acima para registrar o que a operação precisa saber sobre esta
                  variação — quem vê a linha vê a nota.
                </p>
              </div>
            ) : (
              <ul className="space-y-2" data-testid="stock-notes-list">
                {notes.map((note) => {
                  const isMine = note.created_by === user?.id;
                  return (
                    <li
                      key={note.id}
                      className={cn(
                        'rounded-lg border bg-card/50 p-3',
                        note.is_pinned && 'border-primary/40 bg-primary/5',
                      )}
                      data-testid="stock-note-item"
                    >
                      <div className="flex items-start gap-2">
                        <p className="flex-1 whitespace-pre-wrap break-words text-sm">
                          {note.note}
                        </p>
                        {note.is_pinned && (
                          <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                        )}
                        {isMine && (
                          <div className="flex shrink-0 items-center gap-0.5">
                            <IconAction
                              label={note.is_pinned ? 'Desafixar nota' : 'Fixar nota'}
                              icon={note.is_pinned ? PinOff : Pin}
                              onClick={() =>
                                togglePin.mutate({ noteId: note.id, pinned: !note.is_pinned })
                              }
                              testId="stock-note-pin"
                            />
                            <IconAction
                              label="Excluir nota"
                              icon={Trash2}
                              onClick={() => setNoteToDelete(note)}
                              testId="stock-note-delete"
                            />
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {isMine ? 'Você' : 'Outro operador'}
                        </span>
                        {note.supplier_id && (
                          <span>Fornecedor: {supplierNames.get(note.supplier_id) ?? '—'}</span>
                        )}
                        <span>{formatStockNoteAge(note.created_at)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={noteToDelete !== null}
        onOpenChange={(next) => !next && setNoteToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta nota?</AlertDialogTitle>
            <AlertDialogDescription>
              A exclusão é definitiva (a tabela não usa lixeira). O texto abaixo deixa de aparecer
              para toda a operação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="rounded-md bg-muted/50 p-2 text-sm">{noteToDelete?.note}</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (noteToDelete) deleteNote.mutate(noteToDelete.id);
                setNoteToDelete(null);
              }}
              data-testid="stock-note-delete-confirm"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function IconAction({
  label,
  icon: Icon,
  onClick,
  testId,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClick}
          aria-label={label}
          data-testid={testId}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
