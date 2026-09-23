import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, Loader2, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KitState } from '@/lib/kit-builder';
import type { KitStockStatus } from '@/hooks/kit-builder/useKitStockValidation';

interface KitValidationChecklistProps {
  kitState: KitState;
  stockStatus: KitStockStatus;
}

type ChecklistState = 'alert' | 'ok' | 'pending';

interface ChecklistLine {
  label: string;
  state: ChecklistState;
}

function hasError(errors: string[], ...keywords: string[]): boolean {
  return errors.some((error) => keywords.some((keyword) => error.toLowerCase().includes(keyword)));
}

const ICON_BY_STATE: Record<ChecklistState, typeof CheckCircle2> = {
  ok: CheckCircle2,
  pending: CircleDashed,
  alert: AlertTriangle,
};

const CLASS_BY_STATE: Record<ChecklistState, string> = {
  ok: 'text-success',
  pending: 'text-muted-foreground',
  alert: 'text-warning',
};

export function KitValidationChecklist({ kitState, stockStatus }: KitValidationChecklistProps) {
  const { box, items, validationErrors, isValid } = kitState;

  const lines: ChecklistLine[] = [];

  if (!box || items.length === 0) {
    lines.push({ label: 'Itens compatíveis com a caixa', state: 'pending' });
  } else {
    lines.push({
      label: 'Itens compatíveis com a caixa',
      state: hasError(validationErrors, 'compatível') ? 'alert' : 'ok',
    });
  }

  lines.push({
    label: 'Dimensões e peso dentro dos limites',
    state: hasError(validationErrors, 'dimensõ', 'peso', 'volume', 'capacidade')
      ? 'alert'
      : !box
        ? 'pending'
        : 'ok',
  });

  lines.push({
    label: 'Produtos disponíveis em estoque',
    state:
      stockStatus === 'available'
        ? 'ok'
        : stockStatus === 'unavailable' || stockStatus === 'unknown'
          ? 'alert'
          : 'pending',
  });

  lines.push({
    label: 'Kit pronto para orçamento',
    state: isValid && stockStatus === 'available' ? 'ok' : 'pending',
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Checklist de validação</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {lines.map((line) => {
            const Icon =
              line.state === 'pending' && stockStatus === 'checking'
                ? Loader2
                : ICON_BY_STATE[line.state];
            return (
              <li key={line.label} className="flex items-center gap-2 text-sm">
                <Icon
                  className={cn(
                    'h-4 w-4 flex-shrink-0',
                    CLASS_BY_STATE[line.state],
                    line.state === 'pending' && stockStatus === 'checking' && 'animate-spin',
                  )}
                />
                <span className={line.state === 'alert' ? 'text-warning' : undefined}>
                  {line.label}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
