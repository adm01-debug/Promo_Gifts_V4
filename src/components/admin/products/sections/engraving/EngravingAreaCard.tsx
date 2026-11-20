/**
 * EngravingAreaCard — Renders a single engraving area in the list
 */
import { useState } from 'react';
import { usePriceTableBands } from '@/hooks/freight';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  Ruler,
  Palette,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type EnrichedArea, getTechniqueIcon, getTechniqueColor } from './types';
import { ProductionDaysInput } from './ProductionDaysInput';
import { parseProductionDays, tableLeadTimePlaceholder } from './productionDays';

interface EngravingAreaCardProps {
  area: EnrichedArea;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  /** Grava o prazo de personalização (null = usa a tabela). */
  onSaveProductionDays: (area: EnrichedArea, days: number | null) => void;
}

export function EngravingAreaCard({
  area,
  isExpanded,
  onToggleExpand,
  onToggleActive,
  onDelete,
  onSaveProductionDays,
}: EngravingAreaCardProps) {
  const priceBands = usePriceTableBands([area.tabela_preco_id]);
  const savedDays = area.production_days ?? null;
  const [daysText, setDaysText] = useState(savedDays === null ? '' : String(savedDays));
  const parsedDays = parseProductionDays(daysText);
  const daysChanged = parsedDays.ok && parsedDays.value !== savedDays;
  const areaDisplayName = `${area.location_name || area.location_code} — ${area.technique_name}`;
  const techCode = area.technique_code || area.technique_group || '';

  return (
    <div
      className={cn(
        'group rounded-lg border transition-all duration-200',
        area.is_active
          ? 'border-border/50 bg-card/60 hover:border-border hover:shadow-sm'
          : 'border-border/20 bg-muted/20 opacity-60',
      )}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base">{getTechniqueIcon(techCode)}</span>
            <span className="text-sm font-medium">{areaDisplayName}</span>
            <Badge
              variant="outline"
              className={cn(
                'h-4 gap-0.5 text-[10px]',
                `bg-gradient-to-r ${getTechniqueColor(techCode)}`,
              )}
            >
              {area.technique_code || area.technique_name}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5 font-mono">{area.location_code}</span>
            {area.max_width && area.max_height && (
              <span className="flex items-center gap-0.5">
                <Ruler className="h-2.5 w-2.5" />
                {area.max_width}×{area.max_height}cm
              </span>
            )}
            {area.max_colors !== null && area.max_colors > 0 && (
              <span className="flex items-center gap-0.5">
                <Palette className="h-2.5 w-2.5" />
                {area.max_colors} cores
              </span>
            )}
            {area.setup_cost !== null && area.setup_cost > 0 && (
              <span className="flex items-center gap-0.5">
                <DollarSign className="h-2.5 w-2.5" />
                Setup R${area.setup_cost}
              </span>
            )}
            {area.is_curved && (
              <span className="rounded bg-muted px-1 py-0.5 text-[10px]">curva</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onToggleExpand}
            className="rounded p-1 transition-colors hover:bg-muted"
          >
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onToggleActive}
            className="rounded p-1 transition-colors hover:bg-muted"
          >
            <Switch checked={area.is_active} className="scale-75" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="mt-1 border-t border-border/30 px-3 pb-3 pt-0">
          <div className="grid grid-cols-4 gap-3 pt-2 text-xs">
            <div>
              <span className="text-muted-foreground">Local</span>
              <p className="mt-0.5 font-medium">{area.location_name || area.location_code}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Dimensões máx.</span>
              <p className="mt-0.5 font-medium">
                {area.max_width && area.max_height
                  ? `${area.max_width} × ${area.max_height} cm`
                  : '—'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Custo Setup (técnica)</span>
              <p className="mt-0.5 font-medium">
                {area.setup_cost ? `R$ ${area.setup_cost}` : '—'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Custo Unit. (sobrescrito)</span>
              <p className="mt-0.5 font-medium">
                {area.unit_cost ? `R$ ${area.unit_cost}` : '— (usa tabela)'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
            <div>
              <span className="text-muted-foreground">Técnica</span>
              <p className="mt-0.5 font-medium">{area.technique_name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Grupo</span>
              <p className="mt-0.5 font-medium">{area.technique_group || '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Forma</span>
              <p className="mt-0.5 font-medium">
                {area.shape}
                {area.is_curved ? ' (curva)' : ''}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="sm:max-w-[14rem] sm:flex-1">
              <ProductionDaysInput
                id={`production-days-${area.id}`}
                value={daysText}
                onChange={setDaysText}
                placeholder={tableLeadTimePlaceholder(priceBands, area.tabela_preco_id)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 sm:mt-[18px]"
              disabled={!daysChanged}
              onClick={() => parsedDays.ok && onSaveProductionDays(area, parsedDays.value)}
            >
              Salvar prazo
            </Button>
          </div>
          {area.notes && <p className="mt-2 text-xs italic text-muted-foreground">{area.notes}</p>}
        </div>
      )}
    </div>
  );
}
