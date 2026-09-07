/**
 * Step 4 — Design (Blue Premium §29): template atual, categoria semântica
 * (14 tokens Abreez-inspired que colorem SidebarChrome/PageNumberBadge),
 * galeria compacta dos 12 templates por família (sem miniaturas) e CTA para
 * a galeria completa com preview real.
 *
 * A miniatura FIEL (`TemplateThumbnail`) foi removida deste step a pedido do PO:
 * o preview real vive no stage ao lado e as miniaturas geravam duplicidade.
 * Cards exibem apenas metadados (nome, família, produtos/página, fontes).
 */

import { Check, Layers, LayoutTemplate } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Magazine, MagazineCategory, MagazineTemplateId } from '@/types/magazine';
import { templatesByFamily } from '../templates/TemplateRegistry';
import { MAGAZINE_CATEGORY_META } from '../templates/chrome';
import { PG_BTN_OUTLINE, PG_OVERLINE, PG_PANEL } from '../../pg';

interface Props {
  magazine: Magazine;
  onChange: (id: MagazineTemplateId) => void;
  onCategoryChange: (category: MagazineCategory) => void;
}

const FAMILY_LABELS: Record<'catalog' | 'corporate' | 'editorial', string> = {
  editorial: 'Editorial (luxo)',
  catalog: 'Catálogo comercial',
  corporate: 'Corporativo / B2B',
};

const FAMILY_HINT: Record<'catalog' | 'corporate' | 'editorial', string> = {
  editorial: 'Fotografia dominante, 1–5 produtos por página. Ideal para lançamentos.',
  catalog: 'Densidade alta, foco em preço e código. Ideal para pedidos.',
  corporate: 'Marca do cliente em destaque, layouts B2B sóbrios.',
};

const CATEGORY_LIST: MagazineCategory[] = [
  'technology',
  'drinkwares',
  'general',
  'wearables',
  'pins',
  'awards',
  'packaging',
  'stationery',
  'bags',
  'clocks',
  'signs',
  'id',
  'giftsets',
  'customized',
];

const CHIP =
  'inline-flex h-5 items-center rounded-sm border border-border bg-background px-1.5 text-[10px] text-muted-foreground';

export function DesignStep({ magazine, onChange, onCategoryChange }: Props) {
  const grouped = templatesByFamily();
  const currentCategory = magazine.branding?.category ?? 'technology';

  return (
    <div className="space-y-4">
      {/* CTA para galeria de templates com preview real */}
      <div
        className={cn(
          PG_PANEL,
          'flex flex-wrap items-center justify-between gap-3 border-primary/30 bg-primary/5 p-4',
        )}
      >
        <div className="flex items-start gap-3">
          <LayoutTemplate className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
          <div>
            <p className="text-[13px] font-semibold text-foreground">
              Explore os 12 templates com preview real
            </p>
            <p className="text-[12px] text-muted-foreground">
              Veja cada layout ilustrado com produtos de exemplo antes de escolher.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          asChild
          className={cn(PG_BTN_OUTLINE, 'h-9 min-h-0 rounded-md text-[12px]')}
        >
          <Link
            to={`/magazine/templates?returnTo=/magazine/${magazine.id}`}
            className="link-unstyled"
          >
            Ver galeria completa
          </Link>
        </Button>
      </div>

      {/* Seletor de categoria semântica — obrigatório (Abreez SSOT) */}
      <section aria-labelledby="magazine-category-picker" className={cn(PG_PANEL, 'p-4')}>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="magazine-category-picker" className={PG_OVERLINE}>
            Categoria da revista
          </h3>
          <span className="text-[11px] text-muted-foreground">
            Define a cor da sidebar vertical, do número de página e dos rótulos.
          </span>
        </div>
        <div
          role="radiogroup"
          aria-label="Categoria da revista"
          className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7"
          onKeyDown={(e) => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
            e.preventDefault();
            const els = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]'));
            const idx = els.findIndex((el) => el === document.activeElement);
            if (idx < 0) return;
            const next =
              e.key === 'ArrowLeft' || e.key === 'ArrowUp'
                ? (idx - 1 + els.length) % els.length
                : (idx + 1) % els.length;
            els[next]?.focus();
            els[next]?.click();
          }}
        >
          {CATEGORY_LIST.map((cat) => {
            const meta = MAGAZINE_CATEGORY_META[cat];
            const selected = currentCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => onCategoryChange(cat)}
                className={cn(
                  'group flex flex-col items-center gap-1.5 rounded-md border p-2 text-[11px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  selected
                    ? 'border-primary/50 bg-primary/10 text-foreground ring-1 ring-primary/20'
                    : 'border-border bg-card-elevated text-muted-foreground hover:border-border-strong hover:text-foreground',
                )}
              >
                <span
                  aria-hidden
                  className="h-7 w-full rounded-sm ring-1 ring-border-strong"
                  style={{ background: meta.hex }}
                />
                <span className="text-center leading-tight">{meta.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {(Object.keys(grouped) as Array<keyof typeof grouped>).map((family) => (
        <section key={family} aria-labelledby={`family-${family}`} className={cn(PG_PANEL, 'p-4')}>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 id={`family-${family}`} className={PG_OVERLINE}>
              {FAMILY_LABELS[family]}
            </h3>
            <span className="text-[11px] text-muted-foreground">{FAMILY_HINT[family]}</span>
          </div>
          <div
            role="radiogroup"
            aria-labelledby={`family-${family}`}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
            onKeyDown={(e) => {
              if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
              e.preventDefault();
              const els = Array.from(
                e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]'),
              );
              const idx = els.findIndex((el) => el === document.activeElement);
              if (idx < 0) return;
              const next =
                e.key === 'ArrowLeft' || e.key === 'ArrowUp'
                  ? (idx - 1 + els.length) % els.length
                  : (idx + 1) % els.length;
              els[next]?.focus();
              els[next]?.click();
            }}
          >
            {grouped[family].map((t) => {
              const selected = magazine.templateId === t.id;
              return (
                <div
                  key={t.id}
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => onChange(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onChange(t.id);
                    }
                  }}
                  className={cn(
                    'cursor-pointer rounded-md border p-3 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    selected
                      ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20'
                      : 'border-border bg-card-elevated hover:border-border-strong',
                  )}
                  data-testid={`magazine-template-${t.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Layers
                        className={cn(
                          'h-4 w-4 shrink-0',
                          selected ? 'text-primary' : 'text-muted-foreground',
                        )}
                        aria-hidden
                      />
                      <span className="truncate text-[13px] font-semibold text-foreground">
                        {t.name}
                      </span>
                    </div>
                    {selected && (
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" aria-hidden />
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                    {t.description}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={CHIP}>{t.productsPerPage} / pág</span>
                    <span className={CHIP}>{t.fonts.heading}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
