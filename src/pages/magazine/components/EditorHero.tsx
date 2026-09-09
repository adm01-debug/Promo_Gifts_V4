/**
 * EditorHero — cabeçalho do studio (Blue Premium §24).
 *
 * Compõe:
 *  - Breadcrumb (Magazines / Editor)
 *  - Ícone contextual + título (h1) + chip do template ativo + "Trocar template"
 *  - Popover "Trocar template" com grid inline de cards (sem miniaturas)
 *
 * Sem miniaturas: o preview real vive no stage central. A remoção das thumbs
 * neste componente (hero + popover) foi solicitada pelo PO para reduzir ruído
 * visual e evitar duplicidade com o `PreviewSidebar`.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Check, ChevronDown, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Magazine, MagazineTemplateId } from '@/types/magazine';
import { getTemplate, listTemplates } from './templates/TemplateRegistry';
import { PG_BTN_OUTLINE, PG_ICON_BOX, PG_OVERLINE } from '../pg';

interface Props {
  magazine: Magazine;
  onChangeTemplate: (id: MagazineTemplateId) => void;
  onLeave?: () => void;
  readOnly?: boolean;
}

const FAMILY_LABEL: Record<'catalog' | 'corporate' | 'editorial', string> = {
  editorial: 'Editorial',
  catalog: 'Catálogo',
  corporate: 'Corporativo',
};

export function EditorHero({ magazine, onChangeTemplate, onLeave, readOnly = false }: Props) {
  const [open, setOpen] = useState(false);
  const active = getTemplate(magazine.templateId);
  const all = listTemplates();

  return (
    <section data-testid="editor-hero" aria-label="Cabeçalho do editor" className="min-w-0">
      <nav
        data-testid="magazine-editor-breadcrumb"
        aria-label="Trilha"
        className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground"
      >
        <Link
          to="/magazine"
          className="link-unstyled hover:text-foreground"
          onClick={(event) => {
            if (onLeave && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
              event.preventDefault();
              onLeave();
            }
          }}
        >
          Magazines
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate" aria-current="page">
          Editor
        </span>
      </nav>

      <div
        data-testid="magazine-hero-title-row"
        className="flex flex-wrap items-center gap-x-3 gap-y-2"
      >
        <div className={cn(PG_ICON_BOX, 'hidden sm:flex')} aria-hidden>
          <BookOpen className="h-5 w-5" />
        </div>

        <h1
          data-testid="page-title-magazine-editor"
          className="line-clamp-2 font-display text-[26px] font-bold leading-tight tracking-tight text-foreground sm:text-[28px]"
        >
          {magazine.title || 'Nova revista'}
        </h1>

        {/* Chip do template + swap inline — alinhados ao título */}
        <div
          data-testid="magazine-template-chip"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card-elevated px-2.5 text-[12px]"
          role="group"
          aria-label={`Template ativo: ${active.name}, ${FAMILY_LABEL[active.family]}, ${active.productsPerPage} por página`}
        >
          <Layers className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span className="font-semibold text-foreground">{active.name}</span>
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          <span className="text-muted-foreground">{FAMILY_LABEL[active.family]}</span>
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          <span className="text-muted-foreground">{active.productsPerPage}/pág</span>
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              data-testid="magazine-template-swap-trigger"
              className={cn(
                PG_BTN_OUTLINE,
                'h-9 min-h-0 gap-1.5 rounded-md border-primary/40 px-3 text-[12px] text-primary hover:border-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              )}
              aria-label="Trocar template da revista"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls="magazine-template-swap-popover"
              disabled={readOnly}
            >
              Trocar template
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
                aria-hidden
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            id="magazine-template-swap-popover"
            align="start"
            sideOffset={8}
            aria-labelledby="magazine-template-swap-heading"
            className="pg-module w-[min(720px,calc(100vw-2rem))] rounded-xl border-border bg-popover p-3 shadow-lg"
          >
            <div className="mb-2.5 flex items-baseline justify-between px-1">
              <p id="magazine-template-swap-heading" className={PG_OVERLINE}>
                Trocar template
              </p>
              <span className="text-[11px] text-muted-foreground">
                Aplica instantaneamente — sem perder produtos.
              </span>
            </div>
            <div
              role="radiogroup"
              aria-label="Escolher template"
              className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4"
            >
              {all.map((t) => {
                const selected = t.id === magazine.templateId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    disabled={readOnly}
                    aria-checked={selected}
                    aria-label={`${t.name}, ${FAMILY_LABEL[t.family]}, ${t.productsPerPage} por página${selected ? ' (selecionado)' : ''}`}
                    onClick={() => {
                      onChangeTemplate(t.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'group relative flex items-start gap-2 rounded-md border bg-card-elevated p-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      selected
                        ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20'
                        : 'border-border hover:border-border-strong',
                    )}
                  >
                    <Layers
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        selected ? 'text-primary' : 'text-muted-foreground',
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className="block truncate text-[12px] font-semibold text-foreground">
                        {t.name}
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="inline-flex h-5 items-center rounded-sm border border-border bg-background px-1.5 text-[10px] text-muted-foreground">
                          {FAMILY_LABEL[t.family]}
                        </span>
                        <span className="inline-flex h-5 items-center rounded-sm border border-border bg-background px-1.5 text-[10px] text-muted-foreground">
                          {t.productsPerPage}/pág
                        </span>
                      </div>
                    </div>
                    {selected && (
                      <span
                        className="absolute right-1.5 top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
                        aria-hidden
                      >
                        <Check className="h-2.5 w-2.5" aria-hidden />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </section>
  );
}
