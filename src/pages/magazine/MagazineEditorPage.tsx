/**
 * MagazineEditorPage — /magazine/:id
 * Studio shell (Blue Premium §24–§31): header do editor + stepper em uma
 * linha + workspace cuja composição muda por etapa:
 *   identity  → CONFIGURAÇÃO | PREVIEW A4 | PÁGINAS
 *   products  → CATÁLOGO | NA REVISTA (preview pelo drawer)
 *   content   → TOGGLES | PREVIEW + PÁGINAS
 *   design    → TEMPLATES | PREVIEW + PÁGINAS
 *   layout    → LISTA ORDENÁVEL | PREVIEW A4 | PÁGINAS
 * Wizard 5 etapas + validação por step + a11y.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Download,
  Eye,
  LayoutTemplate,
  Loader2,
  MoreHorizontal,
  Save,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageSEO } from '@/components/seo/PageSEO';
import { cn } from '@/lib/utils';
import { useMagazineEditor } from './useMagazineEditor';
import { useMagazinePublish } from './useMagazinePublish';
import { paginateMagazine } from './pagination';
import { PreviewSidebar } from './components/PreviewSidebar';
import { PagesRail } from './components/PagesRail';
import { EditorHero } from './components/EditorHero';
import { IdentityStep } from './components/steps/IdentityStep';
import { ProductsStep } from './components/steps/ProductsStep';
import { ContentStep } from './components/steps/ContentStep';
import { DesignStep } from './components/steps/DesignStep';
import { LayoutStep } from './components/steps/LayoutStep';
import { canPublish, validateStep, type StepId, type StepValidation } from './utils/stepValidation';
import { TEMPLATE_REGISTRY } from './components/templates/TemplateRegistry';
import type { MagazineTemplateId } from '@/types/magazine';
import { useBluePremiumTheme } from './hooks/useBluePremiumTheme';
import { PG_BTN, PG_BTN_OUTLINE, PG_ICON_BTN, PG_PAGE, PG_PANEL } from './pg';
import './magazine.css';

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: 'identity', label: 'Identidade' },
  { id: 'products', label: 'Produtos' },
  { id: 'content', label: 'Conteúdo' },
  { id: 'design', label: 'Design' },
  { id: 'layout', label: 'Layout & Gerar' },
];

/** Composição do workspace por etapa (§24: não forçar a mesma grade). */
type WorkspaceLayout = 'one' | 'three' | 'two';
const STEP_LAYOUT: Record<StepId, WorkspaceLayout> = {
  identity: 'three',
  products: 'one',
  content: 'two',
  design: 'two',
  layout: 'three',
};

/**
 * Validação neutra enquanto a revista ainda não hidratou.
 * Constante de módulo → referência estável, não gera re-render.
 */
const EMPTY_VALIDATION: StepValidation = { blocks: [], warnings: [] };

export default function MagazineEditorPage() {
  // ─────────────────────────────────────────────────────────────────
  // ZONA DE HOOKS — TODOS os hooks DEVEM ficar aqui, ANTES de
  // qualquer early return. React compara a contagem/ordem de hooks
  // entre renders; se um hook roda no render 2 mas não no render 1
  // (porque um early return pulou ele), crash #310.
  //
  // REGRA: NUNCA adicionar useState/useEffect/useMemo/useCallback
  //        ou custom hooks (useMagazinePublish, etc.) ABAIXO da
  //        linha "── NENHUM HOOK ABAIXO DESTE PONTO ──".
  //
  // Guard-rail: `react-hooks/rules-of-hooks` é 'error' no ESLint.
  // ─────────────────────────────────────────────────────────────────
  useBluePremiumTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<StepId>('identity');
  const [previewIdx, setPreviewIdx] = useState(0);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const editor = useMagazineEditor(id);

  // `magazine` é null enquanto carrega e quando o id não existe.
  const magazine = editor.magazine;

  // Aplica template vindo da galeria (`?applyTemplate=<id>`) uma vez após hidratar.
  useEffect(() => {
    const applyId = searchParams.get('applyTemplate');
    if (!applyId || !magazine) return;
    // FIX(lint): prefer-object-has-own — Object.hasOwn é mais direto e
    // seguro que Object.prototype.hasOwnProperty.call (prefer-object-has-own).
    if (Object.hasOwn(TEMPLATE_REGISTRY, applyId)) {
      const typedId = applyId as MagazineTemplateId;
      if (magazine.templateId !== typedId) {
        editor.setTemplate(typedId);
        toast.success(`Template "${TEMPLATE_REGISTRY[typedId].name}" aplicado.`);
      }
      setStep('design');
    }
    // limpa o param para não reaplicar em navegações futuras
    const next = new URLSearchParams(searchParams);
    next.delete('applyTemplate');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magazine?.id]);

  // Atalhos globais leves — Cmd/Ctrl+S salva imediato (autosave já roda)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key === 's') {
        e.preventDefault();
        toast('Alterações salvas automaticamente.');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Deps enxutas: a referência de `items` já cobre mudança de contagem
  const pages = useMemo(
    () => paginateMagazine(magazine),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [magazine?.items, magazine?.templateId, magazine?.title, magazine?.content?.groupByCategory],
  );

  // Deps espelham os campos realmente lidos por validateStep
  const validation = useMemo(
    () => (magazine ? validateStep(step, magazine) : EMPTY_VALIDATION),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, magazine?.title, magazine?.items?.length, magazine?.branding?.clientLogoUrl],
  );

  // Onda 1 — hover em produto no LayoutStep → salta preview p/ página que o contém.
  useEffect(() => {
    if (!highlightedItemId) return;
    const idx = pages.findIndex((p) => p.items.some((it) => it.id === highlightedItemId));
    if (idx >= 0) setPreviewIdx(idx);
  }, [highlightedItemId, pages]);

  // ── CORREÇÃO React #310 (2026-07-16) ──────────────────────────────
  // `publishable` e `useMagazinePublish` PRECISAM rodar incondicionalmente.
  // `canPublish` aceita Magazine; quando magazine é null, usamos false.
  // `useMagazinePublish` tem useState+useCallback internos — se ficar
  // após early return, a contagem de hooks muda entre renders → crash.
  // ──────────────────────────────────────────────────────────────────
  const publishable = magazine ? canPublish(magazine) : false;

  const { publishing, publish } = useMagazinePublish({
    publishable,
    publishFn: editor.publish,
  });

  // currentIdx derivado — sem hook, puro cálculo
  const currentIdx = STEPS.findIndex((s) => s.id === step);

  // goToStep como useCallback para estabilidade referencial
  const goToStep = useCallback(
    (target: StepId) => {
      const targetIdx = STEPS.findIndex((s) => s.id === target);
      if (targetIdx > currentIdx) {
        const blocking = magazine ? validateStep(step, magazine).blocks : [];
        if (blocking.length > 0) {
          toast.warning(blocking[0]);
          return;
        }
      }
      setPreviewSheetOpen(false);
      setStep(target);
    },
    [currentIdx, magazine, step],
  );

  const goToDesign = useCallback(() => goToStep('design'), [goToStep]);

  // ── NENHUM HOOK ABAIXO DESTE PONTO ────────────────────────────────
  // Todo useState/useEffect/useMemo/useCallback/custom hook DEVE ficar
  // ACIMA desta linha. Abaixo: apenas early returns, cálculos puros e JSX.
  // ──────────────────────────────────────────────────────────────────

  if (!editor.loaded) {
    return (
      <div
        className={cn(
          PG_PAGE,
          'flex h-[60vh] items-center justify-center text-[13px] text-muted-foreground',
        )}
        role="status"
      >
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> Carregando revista…
      </div>
    );
  }
  if (!magazine) {
    return (
      <div className={cn(PG_PAGE, 'flex justify-center')}>
        <div className={cn(PG_PANEL, 'mt-10 max-w-md p-8 text-center')}>
          <h1 className="mb-2 text-[18px] font-semibold text-foreground">Revista não encontrada</h1>
          <p className="mb-6 text-[13px] text-muted-foreground">
            Ela pode ter sido excluída ou não pertence a este usuário.
          </p>
          <Button onClick={() => navigate('/magazine')} className={cn(PG_BTN, 'rounded-md')}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Voltar
          </Button>
        </div>
      </div>
    );
  }

  const safePreviewIdx = Math.min(previewIdx, Math.max(0, pages.length - 1));
  const canPrev = currentIdx > 0;
  const canNext = currentIdx < STEPS.length - 1 && validation.blocks.length === 0;
  const layout = STEP_LAYOUT[step];
  const itemCount = (magazine.items ?? []).length;

  const openPrint = () => window.open(`/magazine/${magazine.id}/print`, '_blank');

  const savedAgo = magazine.updatedAt
    ? formatDistanceToNow(new Date(magazine.updatedAt), {
        addSuffix: true,
        locale: ptBR,
        includeSeconds: true,
      })
    : null;

  const previewProps = {
    magazine,
    pages,
    activeIdx: safePreviewIdx,
    onSelect: setPreviewIdx,
    onOpenAll: openPrint,
    highlightedItemId,
  };

  return (
    <>
      <PageSEO
        title={`${magazine.title} — Magazine`}
        description="Editor de revistas de produtos personalizadas."
        path={`/magazine/${magazine.id}`}
      />

      <div className={cn(PG_PAGE, 'pb-6 pt-3')}>
        {/* Studio header (§24) */}
        <div
          className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
          data-testid="magazine-editor-hero-row"
        >
          <div className="min-w-0 flex-1">
            <EditorHero magazine={magazine} onChangeTemplate={editor.setTemplate} />
          </div>
          <div className="flex flex-wrap items-center gap-2.5 lg:pb-0.5">
            {/* Status de salvamento — sempre visível */}
            <span
              role="status"
              aria-live="polite"
              className="mr-1 flex items-center gap-2 text-[12px] text-muted-foreground"
            >
              {editor.saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  <span className="text-foreground">Salvando…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
                  <span className="flex flex-col leading-tight">
                    <span className="text-[12px] font-medium text-foreground">
                      Salvo automaticamente
                    </span>
                    {savedAgo && (
                      <span className="text-[11px] text-muted-foreground">{savedAgo}</span>
                    )}
                  </span>
                </>
              )}
            </span>

            {/*
             * Botões do header mudam por etapa (§24):
             *   identity / layout  → Preview | PDF | Publicar | ⋯
             *   products / content / design → PDF | Ver preview | Salvar rascunho | Continuar →
             */}
            {step === 'products' || step === 'content' || step === 'design' ? (
              <>
                {/* PDF */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openPrint}
                  disabled={itemCount === 0}
                  className={cn(PG_BTN_OUTLINE, 'h-11 min-h-0 rounded-md px-4 text-[14px]')}
                >
                  <Download className="mr-2 h-4 w-4" aria-hidden /> PDF
                </Button>

                {/* Ver preview (drawer) */}
                <Sheet open={previewSheetOpen} onOpenChange={setPreviewSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(PG_BTN_OUTLINE, 'h-11 min-h-0 rounded-md px-4 text-[14px]')}
                    >
                      <Eye className="mr-2 h-4 w-4" aria-hidden /> Ver preview
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="pg-module flex h-full w-[min(600px,100vw)] max-w-full flex-col gap-0 border-border bg-background p-4 sm:max-w-none"
                  >
                    <SheetHeader className="mb-3 shrink-0">
                      <SheetTitle className="text-[14px] font-semibold">
                        Preview da revista
                      </SheetTitle>
                    </SheetHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto">
                      <PreviewSidebar {...previewProps} variant="drawer" />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Salvar rascunho — autosave já roda, botão é confirmação visual */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toast('Rascunho salvo.')}
                  className="h-11 min-h-0 rounded-md px-4 text-[14px] text-muted-foreground hover:text-foreground"
                >
                  <Save className="mr-2 h-4 w-4" aria-hidden /> Salvar rascunho
                </Button>

                {/* Continuar → */}
                {canNext && (
                  <Button
                    size="sm"
                    onClick={() => goToStep(STEPS[Math.min(STEPS.length - 1, currentIdx + 1)].id)}
                    className={cn(PG_BTN, 'h-11 min-h-0 rounded-md px-5 text-[14px]')}
                  >
                    Continuar <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Button>
                )}
              </>
            ) : (
              <>
                {/* Preview em drawer — identity / layout */}
                <Sheet open={previewSheetOpen} onOpenChange={setPreviewSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(PG_BTN_OUTLINE, 'h-11 min-h-0 rounded-md px-4 text-[14px]')}
                    >
                      <Eye className="mr-2 h-4 w-4" aria-hidden /> Preview
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="pg-module flex h-full w-[min(600px,100vw)] max-w-full flex-col gap-0 border-border bg-background p-4 sm:max-w-none"
                  >
                    <SheetHeader className="mb-3 shrink-0">
                      <SheetTitle className="text-[14px] font-semibold">
                        Preview da revista
                      </SheetTitle>
                    </SheetHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto">
                      <PreviewSidebar {...previewProps} variant="drawer" />
                    </div>
                  </SheetContent>
                </Sheet>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openPrint}
                  disabled={itemCount === 0}
                  className={cn(PG_BTN_OUTLINE, 'h-11 min-h-0 rounded-md px-4 text-[14px]')}
                >
                  <Download className="mr-2 h-4 w-4" aria-hidden /> PDF
                </Button>
                <Button
                  size="sm"
                  onClick={publish}
                  disabled={!publishable || publishing}
                  aria-busy={publishing}
                  className={cn(PG_BTN, 'h-11 min-h-0 rounded-md px-5 text-[14px]')}
                >
                  {publishing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Publicando…
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" aria-hidden /> Publicar
                    </>
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(PG_ICON_BTN, 'h-11 w-11')}
                      aria-label="Mais ações"
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="pg-module w-60 rounded-lg border-border bg-popover p-1.5"
                  >
                    <DropdownMenuItem
                      onSelect={() =>
                        navigate(`/magazine/templates?returnTo=/magazine/${magazine.id}`)
                      }
                      className="h-9 rounded-md text-[13px]"
                    >
                      <LayoutTemplate className="mr-2 h-4 w-4" aria-hidden /> Galeria de templates
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => navigate('/magazine')}
                      className="h-9 rounded-md text-[13px]"
                    >
                      <BookOpen className="mr-2 h-4 w-4" aria-hidden /> Voltar para revistas
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        {/* Stepper (§25) */}
        <nav aria-label="Etapas do editor" className={cn(PG_PANEL, 'mb-4 px-2 py-2')}>
          <ol className="m-0 flex list-none items-center gap-1 overflow-x-auto p-0">
            {STEPS.map((s, idx) => {
              const active = s.id === step;
              const done = idx < currentIdx;
              return (
                <li key={s.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => goToStep(s.id)}
                    aria-current={active ? 'step' : undefined}
                    aria-label={`Etapa ${idx + 1} de ${STEPS.length}: ${s.label}${done ? ' (concluída)' : active ? ' (atual)' : ''}`}
                    className={cn(
                      'flex h-10 items-center gap-2.5 whitespace-nowrap rounded-md px-3.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : done
                          ? 'text-foreground hover:bg-card-elevated'
                          : 'text-muted-foreground hover:bg-card-elevated hover:text-foreground',
                    )}
                    data-testid={`magazine-step-${s.id}`}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
                        active
                          ? 'bg-primary-foreground text-primary'
                          : done
                            ? 'bg-success/15 text-success'
                            : 'border border-border-strong text-muted-foreground',
                      )}
                      aria-hidden
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                    </span>
                    {s.label}
                  </button>
                  {idx < STEPS.length - 1 && (
                    <span aria-hidden className="mx-1 hidden h-px w-6 bg-border-strong sm:block" />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* aria-live para anunciar mudança de etapa a leitores de tela */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          Etapa {currentIdx + 1} de {STEPS.length}: {STEPS[currentIdx].label}
        </div>

        {/* Alertas suaves de validação */}
        {(validation.blocks.length > 0 || validation.warnings.length > 0) && (
          <div
            className={cn(
              'mb-4 flex items-start gap-3 rounded-md border px-3.5 py-2.5 text-[13px]',
              validation.blocks.length > 0
                ? 'border-warning/40 bg-warning/10 text-foreground'
                : 'border-border bg-card-elevated text-muted-foreground',
            )}
            role="status"
          >
            <AlertTriangle
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0',
                validation.blocks.length > 0 ? 'text-warning' : 'text-muted-foreground',
              )}
              aria-hidden
            />
            <ul className="m-0 list-none space-y-0.5 p-0">
              {validation.blocks.map((b) => (
                <li key={b}>{b}</li>
              ))}
              {validation.warnings.map((w) => (
                <li key={w} className="opacity-80">
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Workspace (§24/§26/§27/§30) */}
        <div
          className={cn(
            'grid grid-cols-1 gap-4',
            layout === 'three' &&
              'xl:grid-cols-[minmax(340px,0.85fr)_minmax(0,1.35fr)_minmax(260px,0.62fr)] xl:items-start',
            layout === 'two' && 'xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] xl:items-start',
          )}
          data-testid="magazine-editor-workspace"
        >
          <div className="min-w-0" data-testid="magazine-editor-main-col">
            {step === 'identity' && (
              <IdentityStep
                magazine={magazine}
                onTitle={editor.setTitle}
                onSubtitle={editor.setSubtitle}
                onBranding={editor.setBranding}
              />
            )}
            {step === 'products' && (
              <ProductsStep
                magazine={magazine}
                onAdd={editor.addProducts}
                onRemove={editor.removeItem}
                onUpdateItem={editor.updateItem}
                onGoToDesign={goToDesign}
              />
            )}
            {step === 'content' && <ContentStep magazine={magazine} onChange={editor.setContent} />}
            {step === 'design' && (
              <DesignStep
                magazine={magazine}
                onChange={editor.setTemplate}
                onCategoryChange={(category) => editor.setBranding({ category })}
              />
            )}
            {step === 'layout' && (
              <LayoutStep
                magazine={magazine}
                onReorder={editor.reorderItems}
                onRemove={editor.removeItem}
                onItemHover={setHighlightedItemId}
                highlightedItemId={highlightedItemId}
              />
            )}
          </div>

          {layout !== 'one' && (
            <aside className="hidden min-w-0 xl:block" data-testid="magazine-preview-aside">
              <PreviewSidebar
                {...previewProps}
                variant={layout === 'three' ? 'stage' : 'sidebar'}
              />
            </aside>
          )}

          {layout === 'three' && (
            <aside className="hidden min-w-0 xl:block" data-testid="magazine-pages-rail">
              <PagesRail
                magazine={magazine}
                pages={pages}
                activeIdx={safePreviewIdx}
                onSelect={setPreviewIdx}
                highlightedItemId={highlightedItemId}
                className="sticky top-2 max-h-[calc(100vh-24px)]"
              />
            </aside>
          )}
        </div>

        {/* Navegação entre etapas */}
        <div className={cn(PG_PANEL, 'mt-4 flex items-center justify-between px-4 py-3')}>
          <Button
            variant="outline"
            disabled={!canPrev}
            onClick={() => goToStep(STEPS[Math.max(0, currentIdx - 1)].id)}
            className={cn(PG_BTN_OUTLINE, 'h-11 min-h-0 rounded-md px-4 text-[14px]')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Voltar
          </Button>
          {canNext ? (
            <Button
              onClick={() => goToStep(STEPS[Math.min(STEPS.length - 1, currentIdx + 1)].id)}
              className={cn(PG_BTN, 'h-11 min-h-0 rounded-md px-5 text-[14px]')}
            >
              Continuar <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Button>
          ) : (
            <Button
              onClick={publish}
              disabled={!publishable || publishing}
              aria-busy={publishing}
              className={cn(PG_BTN, 'h-11 min-h-0 rounded-md px-5 text-[14px]')}
            >
              {publishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Publicando…
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" aria-hidden /> Publicar revista
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
