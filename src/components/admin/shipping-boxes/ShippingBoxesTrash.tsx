/**
 * Caixas excluídas, com "Restaurar".
 *
 * A exclusão do cadastro é lógica: a caixa some das listas e libera o código.
 * A consulta só roda quando a seção é aberta. Restaurar falha se o código já
 * estiver em uso por outra caixa — o aviso vem do hook, com o código no texto.
 */
import { useState } from 'react';
import { ChevronDown, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDeletedShippingBoxes } from '@/hooks/freight';
import { cn } from '@/lib/utils';
import type { ShippingBoxRow } from '@/services/shippingBoxService';
import { formatDeletedDay, formatDimensionsCm, formatWeightKg } from './shippingBoxFormat';

interface ShippingBoxesTrashProps {
  onRestore: (box: ShippingBoxRow) => void;
  busy?: boolean;
}

export function ShippingBoxesTrash({ onRestore, busy = false }: ShippingBoxesTrashProps) {
  const [open, setOpen] = useState(false);
  const { rows, isLoading, isError, refetch } = useDeletedShippingBoxes({ enabled: open });

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-4 text-sm font-medium">
          <span className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
            Caixas excluídas
          </span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 border-t p-4">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando caixas excluídas...
          </div>
        ) : isError ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 p-4 text-sm">
            <span className="text-destructive">
              Não foi possível carregar a lista de caixas excluídas.
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
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma caixa excluída.</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Restaurar devolve a caixa ao cadastro. Se o código já estiver em uso por outra caixa,
              troque o código da outra ou exclua-a antes.
            </p>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead className="min-w-[160px]">Nome</TableHead>
                    <TableHead>Externa (A × L × C)</TableHead>
                    <TableHead className="text-right">Peso máx.</TableHead>
                    <TableHead>Excluída em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((box) => (
                    <TableRow key={box.id} data-testid={`admin-deleted-row-${box.id}`}>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {box.code}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm">{box.name}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm tabular-nums">
                        {formatDimensionsCm(
                          box.outer_height_cm,
                          box.outer_width_cm,
                          box.outer_length_cm,
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                        {formatWeightKg(box.max_weight_g)}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {formatDeletedDay(box.deleted_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={busy}
                          onClick={() => onRestore(box)}
                          aria-label={`Restaurar caixa ${box.code}`}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" /> Restaurar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
