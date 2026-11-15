import { useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CURATION_STATUSES, type MagicUpCurationStatus } from '@/pages/magic-up/magicUpStrategy';
import { cn } from '@/lib/utils';

interface MagicUpCurationStatusProps {
  value: MagicUpCurationStatus;
  disabled?: boolean;
  onChange: (status: MagicUpCurationStatus) => void;
}

const GROUP_KEYS = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];

export function MagicUpCurationStatus({ value, disabled, onChange }: MagicUpCurationStatusProps) {
  const current = CURATION_STATUSES.find((status) => status.value === value);
  const groupRef = useRef<HTMLDivElement>(null);

  // WCAG 2.1.1 (keyboard) / APG Radio Group: as setas movem o foco E selecionam
  // (selection follows focus). Diferente do padrão Tabs com ativação manual usado em
  // MagicUpResultPanel, o radio group dá a volta nas pontas. A ordem dos radios no DOM
  // segue CURATION_STATUSES, então o índice do DOM é o índice do status.
  const handleGroupKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled || !GROUP_KEYS.includes(event.key)) return;
      const radios = groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
      if (!radios || radios.length === 0) return;

      const last = radios.length - 1;
      const focusedIndex = Array.from(radios).findIndex((radio) => radio === document.activeElement);
      let nextIndex = focusedIndex >= 0 ? focusedIndex : 0;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = nextIndex >= last ? 0 : nextIndex + 1;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = nextIndex <= 0 ? last : nextIndex - 1;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = last;
      }

      event.preventDefault();
      radios[nextIndex]?.focus();
      const nextStatus = CURATION_STATUSES[nextIndex];
      if (nextStatus) onChange(nextStatus.value);
    },
    [disabled, onChange],
  );

  return (
    <section className="rounded-lg border bg-card p-3" aria-label="Status de curadoria">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold" id="curation-status-label">
          Curadoria
        </p>
        <Badge variant="outline" aria-live="polite">
          {current?.label || 'Rascunho'}
        </Badge>
      </div>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-labelledby="curation-status-label"
        onKeyDown={handleGroupKeyDown}
        className="mt-2 flex gap-1.5 overflow-x-auto rounded-md pb-1"
      >
        {CURATION_STATUSES.map((status) => {
          const active = status.value === value;
          return (
            <Button
              key={status.value}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              disabled={disabled}
              role="radio"
              aria-checked={active}
              // Roving tabindex (APG): só o item marcado entra na ordem do Tab.
              tabIndex={active ? 0 : -1}
              aria-label={`Definir curadoria como ${status.label}`}
              className={cn(
                'h-7 shrink-0 px-2 text-[11px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100',
                active && 'shadow-sm',
              )}
              onClick={() => onChange(status.value)}
            >
              {status.label}
            </Button>
          );
        })}
      </div>
    </section>
  );
}
