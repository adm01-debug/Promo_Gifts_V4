/**
 * Aba "Feriados" de `/admin/frete`: dias em que o prazo de produção não conta
 * (`business_calendar`). Lista por ano, adiciona data + nome, edita o nome e
 * exclui com confirmação. Sábado e domingo não entram: o cálculo já os pula.
 *
 * Só admin escreve (RLS). Quando o banco recusa, a mensagem do serviço aparece
 * no próprio formulário e também no aviso do hook.
 */
import { useState, type FormEvent } from 'react';
import { CalendarDays, Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBusinessCalendarMutations, useBusinessCalendarYear } from '@/hooks/freight';
import { formatIsoDate, todayInSaoPaulo, weekdayNamePt } from '@/lib/lead-time/formatDate';
import type { BusinessCalendarRow } from '@/services/businessCalendarService';

const DESCRIPTION_MAX = 120;
const FIRST_YEAR = 2020;
const LAST_YEAR = 2100;

function currentYear(): number {
  return Number(todayInSaoPaulo().slice(0, 4));
}

/** `sexta-feira` vira `Sexta-feira`: `capitalize` do Tailwind deixaria `Sexta-Feira`. */
function capitalizeFirst(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}

export function BusinessCalendarManager() {
  const [year, setYear] = useState(currentYear);
  const [yearText, setYearText] = useState(() => String(currentYear()));
  const { rows, isLoading, isError, refetch } = useBusinessCalendarYear(year);
  const { create, updateDescription, remove } = useBusinessCalendarMutations();

  const [newDay, setNewDay] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<BusinessCalendarRow | null>(null);

  const handleAdd = (event: FormEvent) => {
    event.preventDefault();
    const description = newDescription.trim();
    if (!newDay) {
      setFormError('Escolha a data do feriado.');
      return;
    }
    if (!description) {
      setFormError('Informe o nome do feriado.');
      return;
    }
    setFormError(null);
    create.mutate(
      { day: newDay, description },
      {
        onSuccess: () => {
          const addedYear = newDay.slice(0, 4);
          setYear(Number(addedYear));
          setYearText(addedYear);
          setNewDay('');
          setNewDescription('');
        },
        onError: (error) => setFormError(error.message),
      },
    );
  };

  /** Só troca o ano consultado com 4 dígitos válidos; senão o texto digitado fica só no campo. */
  const commitYear = (text: string): boolean => {
    if (!/^\d{4}$/.test(text)) return false;
    const next = Number(text);
    if (next < FIRST_YEAR || next > LAST_YEAR) return false;
    setYear(next);
    return true;
  };

  const startEdit = (row: BusinessCalendarRow) => {
    setEditingDay(row.day);
    setEditingDescription(row.description);
  };

  const saveEdit = (day: string) => {
    const description = editingDescription.trim();
    if (!description) return;
    updateDescription.mutate({ day, description }, { onSuccess: () => setEditingDay(null) });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.day, { onSettled: () => setDeleteTarget(null) });
  };

  return (
    <section
      aria-labelledby="feriados-titulo"
      className="space-y-4"
      data-testid="business-calendar"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="feriados-titulo" className="flex items-center gap-2 text-lg font-semibold">
            <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
            Feriados
          </h2>
          <p className="text-sm text-muted-foreground">
            Dias em que a produção não conta no prazo. Sábado e domingo já são pulados sozinhos;
            cadastre aqui os feriados nacionais, estaduais e municipais.
          </p>
        </div>
        <div className="w-28">
          <Label htmlFor="feriados-ano" className="text-xs">
            Ano
          </Label>
          <Input
            id="feriados-ano"
            type="number"
            inputMode="numeric"
            min={FIRST_YEAR}
            max={LAST_YEAR}
            value={yearText}
            onChange={(e) => {
              setYearText(e.target.value);
              commitYear(e.target.value);
            }}
            onBlur={() => {
              if (!commitYear(yearText)) setYearText(String(year));
            }}
            className="h-9"
          />
        </div>
      </div>

      <form
        onSubmit={handleAdd}
        noValidate
        aria-label="Adicionar feriado"
        className="grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end"
      >
        <div>
          <Label htmlFor="feriado-data" className="text-xs">
            Data
          </Label>
          <Input
            id="feriado-data"
            type="date"
            value={newDay}
            onChange={(e) => setNewDay(e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <Label htmlFor="feriado-nome" className="text-xs">
            Nome do feriado
          </Label>
          <Input
            id="feriado-nome"
            value={newDescription}
            maxLength={DESCRIPTION_MAX}
            placeholder="Ex.: Aniversário da cidade"
            onChange={(e) => setNewDescription(e.target.value)}
            className="h-9"
          />
        </div>
        <Button type="submit" disabled={create.isPending} className="gap-1.5">
          {create.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
          Adicionar
        </Button>
        {formError && (
          <p role="alert" className="text-sm text-destructive sm:col-span-3">
            {formError}
          </p>
        )}
      </form>

      {isLoading ? (
        <div
          role="status"
          className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Carregando feriados...
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <span className="text-destructive">
            Não foi possível carregar os feriados. Tente novamente.
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
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum feriado cadastrado em {year}. Use o formulário acima para adicionar.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border" aria-label={`Feriados de ${year}`}>
          {rows.map((row) => (
            <li
              key={row.day}
              data-testid={`feriado-${row.day}`}
              className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 sm:w-44">
                <p className="text-sm font-medium tabular-nums">{formatIsoDate(row.day)}</p>
                <p className="text-xs text-muted-foreground">
                  {capitalizeFirst(weekdayNamePt(row.day) ?? '')}
                </p>
              </div>
              {editingDay === row.day ? (
                <div className="flex flex-1 items-center gap-2">
                  <Label htmlFor={`feriado-edit-${row.day}`} className="sr-only">
                    Nome do feriado de {formatIsoDate(row.day)}
                  </Label>
                  <Input
                    id={`feriado-edit-${row.day}`}
                    value={editingDescription}
                    maxLength={DESCRIPTION_MAX}
                    onChange={(e) => setEditingDescription(e.target.value)}
                    className="h-9"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="Salvar nome"
                    disabled={updateDescription.isPending || !editingDescription.trim()}
                    onClick={() => saveEdit(row.day)}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Cancelar edição"
                    onClick={() => setEditingDay(null)}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ) : (
                <>
                  <p className="flex-1 text-sm">{row.description}</p>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Editar nome de ${formatIsoDate(row.day)}`}
                      onClick={() => startEdit(row)}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Excluir feriado de ${formatIsoDate(row.day)}`}
                      onClick={() => setDeleteTarget(row)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Excluir feriado?"
        description={
          deleteTarget
            ? `${formatIsoDate(deleteTarget.day)} — ${deleteTarget.description}. Depois disso o dia volta a contar como dia útil no prazo de produção.`
            : undefined
        }
        confirmLabel="Excluir"
        variant="destructive"
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
