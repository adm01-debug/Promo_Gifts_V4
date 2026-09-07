/**
 * pg — classes compartilhadas do Blue Premium no módulo Magazine.
 *
 * Centraliza os "magic numbers" de radius/altura/estado (DS §49.3) para que
 * páginas, cards, toolbars e painéis compartilhem a mesma geometria. Tudo em
 * tokens semânticos; nenhuma cor literal (DS §50).
 */

import { cn } from '@/lib/utils';

/** Raiz de página do módulo — inclui `.pg-module` (neutralizações CSS). */
export const PG_PAGE =
  'pg-module mx-auto w-full max-w-[1920px] animate-fade-in px-4 py-5 motion-reduce:animate-none sm:px-6 lg:px-8';

/** Painel (§60): radius 14, surface-1, borda default. */
export const PG_PANEL = 'rounded-xl border border-border bg-card';

/** Card (§19/§60): radius 12, surface-1, borda default. */
export const PG_CARD = 'rounded-lg border border-border bg-card';

/** Card interativo (§19 hover): borda sobe, sombra leve, sem escala. */
export const PG_CARD_HOVER =
  'transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-md';

/** Superfície nível 2 (linhas, controles, cartões internos). */
export const PG_SURFACE_2 = 'rounded-md border border-border bg-card-elevated';

/** Ícone contextual de page header (§14): 44px, radius 10, azul soft. */
export const PG_ICON_BOX =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary';

/** Ícone de KPI (§15): 36px. */
export const PG_ICON_BOX_SM =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary';

/** Input/select (§18): 40px, radius 10, fundo profundo, foco azul discreto. */
export const PG_INPUT =
  'h-10 rounded-md border-border bg-background px-3 text-[13px] font-medium shadow-none placeholder:text-muted-foreground hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15';

/** Select trigger com o mesmo DNA do input. */
export const PG_SELECT =
  'h-10 rounded-md border-border bg-background px-3 text-[13px] font-medium shadow-none hover:translate-y-0 hover:border-border-strong hover:shadow-none focus:ring-2 focus:ring-primary/15';

/** Botão: peso 600 e sem lift (tailwind-merge resolve os conflitos com o base). */
export const PG_BTN = 'font-semibold hover:translate-y-0 hover:shadow-none active:scale-[0.99]';

/** Outline neutro (§17.2): borda cinza-azul, texto claro. */
export const PG_BTN_OUTLINE = cn(
  PG_BTN,
  'border border-border bg-card text-foreground hover:border-border-strong hover:bg-card-elevated active:bg-card-elevated',
);

/** Outline azul (§17.2) — ações secundárias importantes (Explorar, Voltar). */
export const PG_BTN_OUTLINE_PRIMARY = cn(
  PG_BTN,
  'border border-primary/40 bg-card text-primary hover:border-primary hover:bg-primary/10 active:bg-primary/15',
);

/** Icon button 40px (§17.5). */
export const PG_ICON_BTN = cn(
  PG_BTN,
  'h-10 w-10 min-h-0 min-w-0 rounded-md border border-border bg-card text-muted-foreground hover:border-border-strong hover:bg-card-elevated hover:text-foreground',
);

/** Pill de filtro (§16): ativo azul sólido, inativo surface-2. */
export function pgPill(active: boolean, extra?: string): string {
  return cn(
    'inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
    active
      ? 'border-primary bg-primary text-primary-foreground'
      : 'border-border bg-card-elevated text-muted-foreground hover:border-border-strong hover:text-foreground',
    extra,
  );
}

/** Contador dentro de pill. */
export function pgPillCount(active: boolean): string {
  return cn(
    'inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold tabular-nums',
    active
      ? 'bg-primary-foreground/20 text-primary-foreground'
      : 'bg-background text-muted-foreground',
  );
}

/** Toggle icon button (grid/lista, direção) — ativo azul soft. */
export function pgToggleIcon(active: boolean): string {
  return cn(
    PG_ICON_BTN,
    active && 'border-primary/50 bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary',
  );
}

/** Badge de status (§33). */
export function pgStatusBadge(status: 'archived' | 'draft' | 'published'): string {
  return cn(
    'inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-semibold',
    status === 'published' && 'border-success/25 bg-success/15 text-success',
    status === 'draft' && 'border-border-strong bg-card-elevated text-foreground',
    status === 'archived' && 'border-border bg-background/80 text-muted-foreground',
  );
}

/** Label de formulário (§18). */
export const PG_LABEL = 'text-[13px] font-semibold text-foreground';

/** Helper text (§18). */
export const PG_HELP = 'text-[11px] leading-snug text-muted-foreground';

/** Overline pequeno (§10.2). */
export const PG_OVERLINE =
  'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

/** Título de painel (§10.1 Panel title). */
export const PG_PANEL_TITLE = 'text-[16px] font-semibold leading-tight text-foreground';

/** Título de seção (§10.1 Section H2). */
export const PG_SECTION_TITLE = 'font-display text-[20px] font-bold leading-tight text-foreground';

/** Subtítulo de painel/seção. */
export const PG_SUBTITLE = 'text-[13px] text-muted-foreground';
