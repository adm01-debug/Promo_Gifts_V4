/**
 * Tabela das caixas de transporte vivas (ativas e inativas): medidas externa e
 * interna, peso máximo em kg, fator, ordem, chave de ativa e ações.
 */
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ShippingBoxRow } from '@/services/shippingBoxService';
import { formatDimensionsCm, formatFillFactor, formatWeightKg } from './shippingBoxFormat';

interface ShippingBoxesTableProps {
  boxes: ShippingBoxRow[];
  onEdit: (box: ShippingBoxRow) => void;
  onToggleActive: (box: ShippingBoxRow, active: boolean) => void;
  onDelete: (box: ShippingBoxRow) => void;
  busy?: boolean;
}

export function ShippingBoxesTable({
  boxes,
  onEdit,
  onToggleActive,
  onDelete,
  busy = false,
}: ShippingBoxesTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border" data-testid="admin-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead className="min-w-[160px]">Nome</TableHead>
            <TableHead>Externa (A × L × C)</TableHead>
            <TableHead>Interna (A × L × C)</TableHead>
            <TableHead className="text-right">Peso máx.</TableHead>
            <TableHead className="text-center">Fator</TableHead>
            <TableHead className="text-center">Ordem</TableHead>
            <TableHead className="text-center">Ativa</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {boxes.map((box) => (
            <TableRow key={box.id} data-testid={`admin-row-${box.id}`}>
              <TableCell>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{box.code}</code>
              </TableCell>
              <TableCell className="text-sm font-medium">{box.name}</TableCell>
              <TableCell className="whitespace-nowrap text-sm tabular-nums">
                {formatDimensionsCm(box.outer_height_cm, box.outer_width_cm, box.outer_length_cm)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                {formatDimensionsCm(box.inner_height_cm, box.inner_width_cm, box.inner_length_cm)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                {formatWeightKg(box.max_weight_g)}
              </TableCell>
              <TableCell className="text-center text-sm tabular-nums">
                {formatFillFactor(box.fill_factor)}
              </TableCell>
              <TableCell className="text-center text-sm tabular-nums">{box.sort_order}</TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={box.is_active}
                  disabled={busy}
                  onCheckedChange={(checked) => onToggleActive(box, checked)}
                  aria-label={`Caixa ${box.code} ativa`}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(box)}
                    aria-label={`Editar caixa ${box.code}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    disabled={busy}
                    onClick={() => onDelete(box)}
                    aria-label={`Excluir caixa ${box.code}`}
                    data-testid="admin-delete-btn"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
