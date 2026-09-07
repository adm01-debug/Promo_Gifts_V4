/**
 * Step 1 — Identidade (Blue Premium §26): título, subtítulo, picker de cliente
 * CRM, preenchimento manual (avançado) e paleta da marca com verificação WCAG.
 * Um único painel de configuração; o preview A4 e o trilho de páginas são
 * compostos pelo editor ao lado.
 */

import { Building2, ChevronRight, Palette } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Magazine } from '@/types/magazine';
import { BrandColorPicker } from '../BrandColorPicker';
import { MagazineClientPicker } from '../MagazineClientPicker';
import {
  PG_HELP,
  PG_ICON_BOX_SM,
  PG_INPUT,
  PG_LABEL,
  PG_PANEL,
  PG_PANEL_TITLE,
  PG_SUBTITLE,
} from '../../pg';

interface Props {
  magazine: Magazine;
  onTitle: (v: string) => void;
  onSubtitle: (v: string) => void;
  onBranding: (patch: Partial<Magazine['branding']>) => void;
}

/** Limites editoriais (soft): contadores sinalizam, não bloqueiam a digitação. */
const TITLE_MAX = 80;
const SUBTITLE_MAX = 200;

function Counter({ value, max }: { value: number; max: number }) {
  const over = value > max;
  return (
    <span
      className={cn('text-[11px] tabular-nums', over ? 'text-warning' : 'text-muted-foreground')}
      aria-live="polite"
    >
      {value}/{max}
    </span>
  );
}

export function IdentityStep({ magazine, onTitle, onSubtitle, onBranding }: Props) {
  const title = magazine.title ?? '';
  const subtitle = magazine.subtitle ?? '';
  return (
    <div className={cn(PG_PANEL, 'p-5')}>
      <header className="flex items-start gap-3">
        <div className={PG_ICON_BOX_SM}>
          <Building2 className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <h2 className={PG_PANEL_TITLE}>Identidade</h2>
          <p className={cn(PG_SUBTITLE, 'mt-0.5')}>
            Defina as informações principais da sua revista.
          </p>
        </div>
      </header>

      <div className="mt-5 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="mag-title" className={PG_LABEL}>
            Título da revista
          </Label>
          <Input
            id="mag-title"
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            placeholder="Coleção Corporativa 2026"
            className={cn(PG_INPUT, 'h-11')}
            data-testid="magazine-title-input"
          />
          <div className="flex justify-end">
            <Counter value={title.length} max={TITLE_MAX} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mag-subtitle" className={PG_LABEL}>
            Subtítulo
          </Label>
          <Textarea
            id="mag-subtitle"
            value={subtitle}
            onChange={(e) => onSubtitle(e.target.value)}
            rows={2}
            placeholder="Uma seleção especial preparada para você"
            className={cn(PG_INPUT, 'h-auto min-h-[72px] py-2.5 leading-relaxed')}
          />
          <div className="flex justify-end">
            <Counter value={subtitle.length} max={SUBTITLE_MAX} />
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className={PG_LABEL}>Cliente (CRM)</legend>
          <MagazineClientPicker
            clientName={magazine.branding?.clientName ?? null}
            clientLogoUrl={magazine.branding?.clientLogoUrl ?? null}
            onChange={onBranding}
          />
        </fieldset>

        <details className="group rounded-md border border-border bg-card-elevated">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
            <ChevronRight
              className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90"
              aria-hidden
            />
            Preenchimento manual (avançado)
          </summary>
          <div className="space-y-3 border-t border-border px-3 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="mag-client" className={cn(PG_LABEL, 'text-[12px]')}>
                Nome do cliente
              </Label>
              <Input
                id="mag-client"
                value={magazine.branding?.clientName ?? ''}
                onChange={(e) => onBranding({ clientName: e.target.value || null })}
                placeholder="Ex.: Empresa Cliente Ltda."
                className={cn(PG_INPUT, 'h-9')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mag-logo" className={cn(PG_LABEL, 'text-[12px]')}>
                URL do logo do cliente
              </Label>
              <Input
                id="mag-logo"
                value={magazine.branding?.clientLogoUrl ?? ''}
                onChange={(e) => onBranding({ clientLogoUrl: e.target.value || null })}
                placeholder="https://…/logo.png"
                className={cn(PG_INPUT, 'h-9')}
              />
              <p className={PG_HELP}>
                Use uma URL pública (https). O logo aparece na capa e nos cabeçalhos.
              </p>
            </div>
          </div>
        </details>
      </div>

      <div className="my-5 h-px bg-border" aria-hidden />

      <header className="flex items-start gap-3">
        <div className={PG_ICON_BOX_SM}>
          <Palette className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <h2 className={PG_PANEL_TITLE}>Paleta da marca</h2>
          <p className={cn(PG_SUBTITLE, 'mt-0.5')}>Defina as cores principais da sua revista.</p>
        </div>
      </header>
      <div className="mt-4">
        <BrandColorPicker
          colors={magazine.branding.colors}
          onChange={(colors) => onBranding({ colors })}
        />
      </div>
    </div>
  );
}
