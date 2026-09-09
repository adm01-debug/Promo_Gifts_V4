/**
 * Step 3 — Conteúdo (Blue Premium §28): toggles agrupados semanticamente em
 * fieldsets compactos, 2 colunas em desktop:
 *  - Campos por produto
 *  - Estrutura da revista
 */

import { ListChecks, LayoutList } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  DEFAULT_MAGAZINE_CONTENT,
  type Magazine,
  type MagazineContentSettings,
} from '@/types/magazine';
import { PG_ICON_BOX_SM, PG_PANEL, PG_PANEL_TITLE, PG_SUBTITLE } from '../../pg';

interface Props {
  magazine: Magazine;
  onChange: (patch: Partial<MagazineContentSettings>) => void;
}

/** Somente keys booleanas — introText/closingText são texto e têm UI própria. */
type BooleanContentKey =
  | 'groupByCategory'
  | 'showCode'
  | 'showColors'
  | 'showDescription'
  | 'showDimensions'
  | 'showMaterials'
  | 'showPersonalization'
  | 'showPrice';
type Toggle = { key: BooleanContentKey; label: string; hint: string };

const FIELD_TOGGLES: Toggle[] = [
  { key: 'showPrice', label: 'Mostrar preço', hint: 'Preço final ao lado do produto.' },
  { key: 'showCode', label: 'Mostrar código (SKU)', hint: 'Útil para pedidos posteriores.' },
  {
    key: 'showPersonalization',
    label: 'Mostrar personalização',
    hint: 'Badge quando o produto aceita gravação.',
  },
  { key: 'showDescription', label: 'Mostrar descrição', hint: 'Descrição curta do produto.' },
  {
    key: 'showDimensions',
    label: 'Mostrar dimensões',
    hint: 'Altura, largura, peso quando disponível.',
  },
  { key: 'showMaterials', label: 'Mostrar materiais', hint: 'Tags de materiais do produto.' },
  {
    key: 'showColors',
    label: 'Mostrar cor selecionada',
    hint: 'Nome da cor da variação escolhida.',
  },
];

const STRUCTURE_TOGGLES: Toggle[] = [
  {
    key: 'groupByCategory',
    label: 'Agrupar por categoria',
    hint: 'Insere uma página de seção antes de cada grupo de categoria.',
  },
];

function ToggleRow({
  toggle,
  checked,
  onCheck,
}: {
  toggle: Toggle;
  checked: boolean;
  onCheck: (v: boolean) => void;
}) {
  const id = `magazine-toggle-${toggle.key}`;
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-md border px-3.5 py-3 transition-colors duration-150',
        checked ? 'border-primary/30 bg-primary/5' : 'border-border bg-card-elevated',
      )}
    >
      <div className="min-w-0">
        <Label htmlFor={id} className="text-[13px] font-semibold text-foreground">
          {toggle.label}
        </Label>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{toggle.hint}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheck}
        aria-label={toggle.label}
        data-testid={id}
        className="shrink-0"
      />
    </div>
  );
}

export function ContentStep({ magazine, onChange }: Props) {
  const content = magazine.content ?? DEFAULT_MAGAZINE_CONTENT;
  return (
    <div className="space-y-4">
      <section className={cn(PG_PANEL, 'p-5')}>
        <fieldset className="space-y-4">
          <legend className="flex items-start gap-3">
            <span className={PG_ICON_BOX_SM}>
              <ListChecks className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <span className={cn(PG_PANEL_TITLE, 'block')}>Campos exibidos por produto</span>
              <span className={cn(PG_SUBTITLE, 'mt-0.5 block')}>
                Valem para todos os produtos. Overrides individuais estão na etapa de layout.
              </span>
            </div>
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELD_TOGGLES.map((t) => (
              <ToggleRow
                key={t.key}
                toggle={t}
                checked={content[t.key]}
                onCheck={(v) => onChange({ [t.key]: v } as Partial<MagazineContentSettings>)}
              />
            ))}
          </div>
        </fieldset>
      </section>

      <section className={cn(PG_PANEL, 'p-5')}>
        <fieldset className="space-y-4">
          <legend className="flex items-start gap-3">
            <span className={PG_ICON_BOX_SM}>
              <LayoutList className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <span className={cn(PG_PANEL_TITLE, 'block')}>Estrutura da revista</span>
              <span className={cn(PG_SUBTITLE, 'mt-0.5 block')}>
                Como as páginas são organizadas.
              </span>
            </div>
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {STRUCTURE_TOGGLES.map((t) => (
              <ToggleRow
                key={t.key}
                toggle={t}
                checked={content[t.key]}
                onCheck={(v) => onChange({ [t.key]: v } as Partial<MagazineContentSettings>)}
              />
            ))}
          </div>
        </fieldset>
      </section>

      <section className={cn(PG_PANEL, 'p-5')} aria-labelledby="magazine-editorial-content-title">
        <div className="flex items-start gap-3">
          <span className={PG_ICON_BOX_SM}>
            <LayoutList className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h3 id="magazine-editorial-content-title" className={PG_PANEL_TITLE}>
              Textos editoriais
            </h3>
            <p className={cn(PG_SUBTITLE, 'mt-0.5')}>
              Inclua uma abertura e um fechamento opcionais. O conteúdo permanece no rascunho mesmo
              quando ainda não houver uma página editorial dedicada.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="magazine-intro-text" className="text-[13px] font-semibold">
              Texto de introdução
            </Label>
            <Textarea
              id="magazine-intro-text"
              value={content.introText ?? ''}
              maxLength={800}
              onChange={(event) => onChange({ introText: event.target.value || undefined })}
              placeholder="Apresente a seleção e o contexto desta revista…"
              className="min-h-28 resize-y"
              data-testid="magazine-intro-text"
            />
            <p className="text-right text-[11px] text-muted-foreground">
              {(content.introText ?? '').length}/800
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="magazine-closing-text" className="text-[13px] font-semibold">
              Texto de fechamento
            </Label>
            <Textarea
              id="magazine-closing-text"
              value={content.closingText ?? ''}
              maxLength={800}
              onChange={(event) => onChange({ closingText: event.target.value || undefined })}
              placeholder="Finalize com uma chamada para contato ou próximos passos…"
              className="min-h-28 resize-y"
              data-testid="magazine-closing-text"
            />
            <p className="text-right text-[11px] text-muted-foreground">
              {(content.closingText ?? '').length}/800
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
