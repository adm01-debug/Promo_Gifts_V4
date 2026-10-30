/**
 * QuoteBuilderSummaryColumn — Coluna 3: Resumo com cards de itens, desconto e CTAs
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronsDownUp,
  ChevronsUpDown,
  Layers,
  Loader2,
  Save,
  Send,
  Shield,
  ShoppingCart,
  Plus,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { QuoteItem } from '@/hooks/quotes';
import { useQuoteSummaryState } from './useQuoteSummaryState';
import { QuoteBuilderSummaryItems } from './QuoteBuilderSummaryItems';
import { QuoteBuilderSummaryPricing } from './QuoteBuilderSummaryPricing';
import { QuoteBuilderSummaryDialogs } from './QuoteBuilderSummaryDialogs';

interface Props {
  items: QuoteItem[];
  activeItemIndex: number | null;
  setActiveItemIndex: (i: number | null) => void;
  removeItem: (i: number) => void;
  discountType: 'amount' | 'percent';
  setDiscountType: (v: 'amount' | 'percent') => void;
  discountValue: number;
  setDiscountValue: (v: number) => void;
  discountAmount: number;
  total: number;
  isFormValid: boolean;
  isDraftValid: boolean;
  validationErrors: string[];
  quotesLoading: boolean;
  isEditMode: boolean;
  formatCurrency: (v: number) => string;
  calculateItemPersonalizationTotal: (item: QuoteItem) => number;
  calculateItemTotal: (item: QuoteItem) => number;
  onSave: (status: 'draft' | 'pending_approval' | 'pending', sellerNotes?: string) => void;
  maxDiscountPercent?: number | null;
  isDiscountExceeded?: boolean;
  negotiationMarkup?: number;
  setNegotiationMarkup?: (v: number) => void;
  realSubtotal?: number;
  realDiscountPercent?: number;
  /** Marca um item como "preço confirmado com fornecedor" — suprime alerta stale. */
  confirmItemPrice?: (index: number) => void;
  /** Marca todos os itens com preço aging/stale como confirmados. */
  confirmAllStalePrices?: () => void;
  shippingType?: string;
  shippingCost?: number;
  /** Reordena os itens do orçamento (drag-and-drop ou agrupamento). Recebe o novo array completo. */
  onReorder?: (items: QuoteItem[]) => void;
  /** ID do orçamento persistido, usado também para a chave do estado visual recolhido. */
  quoteId?: string | null;
  /** Compatibilidade com o editor: garante que `sort_order` participe do próximo
   * save transacional depois de drag-and-drop ou agrupamento. */
  setSkipAutosaveSortOrder?: (v: boolean) => void;
  /** Abre o seletor de produtos para adicionar um novo item ao orçamento. */
  onAddProduct?: () => void;
  /** Restaura um item removido no índice original — usado pelo undo do toast. */
  onRestore?: (item: QuoteItem, index: number) => void;
}

export function QuoteBuilderSummaryColumn({
  items,
  activeItemIndex,
  setActiveItemIndex,
  removeItem,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  discountAmount,
  total,
  isFormValid,
  isDraftValid,
  validationErrors,
  quotesLoading,
  isEditMode,
  formatCurrency,
  calculateItemPersonalizationTotal,
  calculateItemTotal: _calculateItemTotal,
  onSave,
  maxDiscountPercent,
  isDiscountExceeded,
  negotiationMarkup = 0,
  setNegotiationMarkup,
  realSubtotal = 0,
  realDiscountPercent = 0,
  confirmItemPrice,
  confirmAllStalePrices,
  shippingType,
  shippingCost = 0,
  onReorder,
  quoteId,
  setSkipAutosaveSortOrder,
  onAddProduct,
  onRestore,
}: Props) {
  const {
    approvalDialogOpen,
    setApprovalDialogOpen,
    sellerNotes,
    setSellerNotes,
    confirmAllOpen,
    setConfirmAllOpen,
    confirmSaveDraftOpen,
    setConfirmSaveDraftOpen,
    saveDraftBtnRef,
    showOnlyStale,
    setShowOnlyStale,
    groupedByProduct,
    setActiveDragId,
    collapsedItemKeys,
    toggleItemCollapsed,
    allCollapsed,
    toggleAllCollapsed,
    dndSensors,
    handleDragStart,
    handleDragEnd,
    groupByProductId,
    groupByCategory,
    activeItemForOverlay,
    presentedSubtotal,
    handleDiscountTypeChange,
    staleIndexes,
    staleCount,
    visibleItems,
    handleRequestApproval,
    handleApprovalDialogChange,
    handleConfirmAllDialogChange,
  } = useQuoteSummaryState({
    items,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    negotiationMarkup,
    realSubtotal,
    onSave,
    onReorder,
    quoteId,
    setSkipAutosaveSortOrder,
  });

  /**
   * SCROLL-FIX: altura da sticky column calculada via CSS var para garantir
   * que o INNER scroll container tenha altura EXPLÍCITA — sem depender de
   * `h-full` dentro de `overflow-hidden`, que falha em alguns contextos.
   */
  const STICKY_HEIGHT = 'lg:max-h-[calc(100vh-var(--header-h,56px)-var(--breadcrumb-h,40px)-2rem)]';

  return (
    <div data-testid="quote-builder-summary-column" className="min-w-0 lg:col-span-7">
      {/*
       * SCROLL-FIX-01: Removido `lg:overflow-hidden` deste wrapper.
       *
       * PROBLEMA ORIGINAL: `overflow: hidden` criava um Block Formatting
       * Context (BFC). Dentro de um BFC, `height: 100%` no filho inner
       * resolvia de forma inconsistente entre browsers, desabilitando o
       * scroll interno.
       *
       * SOLUÇÃO: O `overflow-clip` substitui `overflow-hidden` SEM criar
       * scroll container, mantendo o clipping visual da sombra do inner div.
       * Browsers modernos (Chrome 90+, Firefox 102+, Safari 16+) suportam
       * `overflow: clip`; Tailwind expõe via `overflow-clip`.
       */}
      <div
        data-testid="quote-builder-summary-sticky"
        className="lg:sticky lg:top-[calc(var(--header-h,56px)+var(--breadcrumb-h,40px)+1rem)] lg:self-start"
      >
        {/*
         * SCROLL-FIX-02: `lg:h-full` substituído por `lg:max-h-[calc(...)]`.
         *
         * PROBLEMA ORIGINAL: `h-full` dentro de `overflow-hidden` (pai) é
         * ambíguo — o BFC do pai impedia o browser de resolver a altura corretamente,
         * fazendo o conteúdo crescer além da tela sem criar scrollbar.
         *
         * SOLUÇÃO: `max-h-[calc(100vh-header-breadcrumb-2rem)]` é aplicado
         * diretamente no scroll container, dando ao browser um limite EXPLÍCITO
         * para resolver o overflow-y-auto sem depender do pai.
         */}
        <div
          data-testid="quote-builder-summary-scroll"
          className={cn(
            'flex flex-col rounded-2xl border border-border/50 bg-card shadow-xl',
            'lg:overflow-y-auto [@media(min-height:700px)]:lg:overflow-hidden',
            STICKY_HEIGHT,
          )}
        >
          {/* Header — sticky top do scroll container (sempre visível ao rolar) */}
          <div
            data-testid="quote-summary-header"
            className="sticky top-0 z-20 flex shrink-0 items-center gap-2 rounded-t-2xl border-b border-border/50 bg-card/95 p-4 pb-3 shadow-[0_16px_24px_-24px_hsl(var(--foreground)/0.55)] backdrop-blur supports-[backdrop-filter]:bg-card/85"
          >
            <div className="rounded-lg bg-primary/10 p-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-display text-base font-semibold">Resumo</h3>
            <div className="ml-auto flex items-center gap-2">
              {onAddProduct && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onAddProduct}
                  disabled={quotesLoading}
                  aria-disabled={quotesLoading}
                  aria-label="Adicionar novo produto ao orçamento"
                  title="Adicionar novo produto ao orçamento"
                  data-testid="quote-add-product-button-summary"
                  className="group h-7 gap-1.5 rounded-full border-[1.5px] border-primary/70 bg-transparent px-3 text-xs text-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.12),0_0_18px_hsl(var(--primary)/0.35)] transition-all hover:border-primary hover:bg-primary/5 hover:text-primary hover:shadow-[0_0_0_4px_hsl(var(--primary)/0.18),0_0_24px_hsl(var(--primary)/0.55)] focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="font-medium">Produto</span>
                </Button>
              )}
              {items.length >= 1 &&
                (() => {
                  const openCount = items.length - collapsedItemKeys.size;
                  const tooltipMsg = allCollapsed
                    ? 'Todos os itens estão recolhidos — clique para abrir todos'
                    : openCount === 1
                      ? '1 produto aberto — clique para recolher todos'
                      : `${openCount} produtos abertos — clique para recolher todos`;
                  return (
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5 px-2.5 text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                            onClick={toggleAllCollapsed}
                            aria-pressed={allCollapsed}
                            aria-expanded={!allCollapsed}
                            aria-label={
                              allCollapsed
                                ? `Expandir todos os ${items.length} itens do resumo`
                                : `Recolher ${openCount} ${openCount === 1 ? 'item aberto' : 'itens abertos'} do resumo`
                            }
                            data-testid="quote-summary-collapse-all"
                            data-open-count={openCount}
                          >
                            {allCollapsed ? (
                              <ChevronsUpDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronsDownUp className="h-3.5 w-3.5" />
                            )}
                            {allCollapsed ? 'Expandir' : 'Recolher'}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {tooltipMsg}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })()}
              {items.length >= 2 && onReorder && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant={groupedByProduct ? 'secondary' : 'outline'}
                      className="h-7 gap-1.5 px-2.5 text-xs"
                      title="Agrupar itens"
                      data-testid="quote-summary-group-trigger"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Agrupar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onClick={groupByProductId}
                      data-testid="quote-summary-group-by-product"
                    >
                      Por produto (SKU)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={groupByCategory}
                      data-testid="quote-summary-group-by-category"
                    >
                      Por categoria
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Stale price filter */}
          {staleCount > 0 && (
            <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pb-3">
              <button
                type="button"
                onClick={() => setShowOnlyStale((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl border-[1.5px] px-2.5 py-1 text-xs font-medium transition-all',
                  showOnlyStale
                    ? 'border-warning bg-warning/15 text-warning shadow-sm'
                    : 'border-warning/40 bg-warning/5 text-warning hover:bg-warning/10',
                )}
                aria-pressed={showOnlyStale}
                aria-label={`Mostrar apenas ${staleCount} item(ns) com preço a confirmar`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Preços a confirmar</span>
                <Badge
                  variant="secondary"
                  className="h-4 border-0 bg-warning px-1.5 text-[10px] text-warning-foreground"
                >
                  {staleCount}
                </Badge>
                {showOnlyStale && <X className="ml-0.5 h-3 w-3" aria-hidden="true" />}
              </button>
              {confirmAllStalePrices && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 border-warning/40 px-2.5 text-xs text-warning hover:bg-warning/10 hover:text-warning"
                  onClick={() => setConfirmAllOpen(true)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Confirmar todos
                </Button>
              )}
            </div>
          )}

          {/* Product Cards */}
          <QuoteBuilderSummaryItems
            items={items}
            activeItemIndex={activeItemIndex}
            setActiveItemIndex={setActiveItemIndex}
            removeItem={removeItem}
            formatCurrency={formatCurrency}
            calculateItemPersonalizationTotal={calculateItemPersonalizationTotal}
            onReorder={onReorder}
            confirmItemPrice={confirmItemPrice}
            onRestore={onRestore}
            showOnlyStale={showOnlyStale}
            setShowOnlyStale={setShowOnlyStale}
            visibleItems={visibleItems}
            staleIndexes={staleIndexes}
            collapsedItemKeys={collapsedItemKeys}
            toggleItemCollapsed={toggleItemCollapsed}
            dndSensors={dndSensors}
            handleDragStart={handleDragStart}
            handleDragEnd={handleDragEnd}
            setActiveDragId={setActiveDragId}
            activeItemForOverlay={activeItemForOverlay}
          />

          {/* Discount + Markup */}
          <QuoteBuilderSummaryPricing
            items={items}
            discountType={discountType}
            discountValue={discountValue}
            setDiscountValue={setDiscountValue}
            discountAmount={discountAmount}
            presentedSubtotal={presentedSubtotal}
            handleDiscountTypeChange={handleDiscountTypeChange}
            isDiscountExceeded={isDiscountExceeded}
            maxDiscountPercent={maxDiscountPercent}
            negotiationMarkup={negotiationMarkup}
            setNegotiationMarkup={setNegotiationMarkup}
            realSubtotal={realSubtotal}
            realDiscountPercent={realDiscountPercent}
            formatCurrency={formatCurrency}
          />

          {/* Footer — sticky bottom do scroll container */}
          <div
            data-testid="quote-builder-summary-footer"
            className="sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-10 mt-3 shrink-0 space-y-2 bg-card/95 px-4 pb-3 pt-3 backdrop-blur supports-[backdrop-filter]:bg-card/85"
          >
            <div className="flex items-center justify-between text-[11px] uppercase tracking-tight text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-medium tabular-nums">{formatCurrency(presentedSubtotal)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-[11px] text-destructive">
                <span>Desconto</span>
                <span className="font-medium tabular-nums">-{formatCurrency(discountAmount)}</span>
              </div>
            )}

            {shippingType === 'fob_pre' && shippingCost > 0 && (
              <div className="flex items-center justify-between text-[11px] font-medium text-primary">
                <span>Frete (FOB)</span>
                <span className="tabular-nums">+{formatCurrency(shippingCost)}</span>
              </div>
            )}

            <div className="flex items-baseline justify-between gap-2 border-t border-border/30 pt-1.5">
              <div>
                <span className="text-base font-bold">Total</span>
                {/* BUG-R FIX: only show per-unit price for single-product quotes;
                    dividing total by all units across different products is meaningless */}
                {items.length === 1 && items[0].quantity > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    ≈{formatCurrency(total / items[0].quantity)}/un.
                  </p>
                )}
              </div>
              <span
                data-testid="summary-total-value"
                className="text-2xl font-bold tabular-nums tracking-tight text-primary"
              >
                {formatCurrency(total)}
              </span>
            </div>

            {(() => {
              const missingLabels = !isFormValid
                ? (
                    [
                      ['empresa', 'Empresa'],
                      ['contato', 'Contato'],
                      ['forma_pagamento', 'Forma de Pagamento'],
                      ['prazo_pagamento', 'Prazo de Pagamento'],
                      ['prazo_entrega', 'Prazo de Entrega'],
                      ['frete', 'Frete'],
                      ['valor_frete', 'Valor do Frete'],
                      ['itens', 'Itens do Orçamento'],
                    ] as const
                  )
                    .filter(([key]) => validationErrors.includes(key))
                    .map(([, label]) => label)
                : [];

              return (
                <div className="flex w-full items-stretch gap-2">
                  {missingLabels.length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          aria-label={`${missingLabels.length} campo(s) obrigatório(s) pendente(s)`}
                          data-testid="quote-missing-fields-trigger"
                          className="relative h-12 w-12 shrink-0 border-destructive/40 bg-destructive/5 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <AlertTriangle className="h-5 w-5" />
                          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
                            {missingLabels.length}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="top"
                        align="start"
                        sideOffset={8}
                        className="z-50 w-64 border-destructive/40 bg-popover p-3 text-popover-foreground shadow-xl backdrop-blur-none"
                        data-testid="quote-missing-fields-popover"
                      >
                        <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" /> Campos obrigatórios pendentes
                        </p>
                        <ul className="list-inside list-disc space-y-0.5 text-xs text-foreground">
                          {missingLabels.map((label) => (
                            <li key={label}>{label}</li>
                          ))}
                        </ul>
                      </PopoverContent>
                    </Popover>
                  )}
                  {isDiscountExceeded ? (
                    <Button
                      size="lg"
                      data-testid="quote-request-approval-button"
                      className="h-12 flex-1 gap-2 bg-amber-500 text-sm font-bold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600"
                      onClick={() => setApprovalDialogOpen(true)}
                      disabled={quotesLoading || !isFormValid}
                    >
                      {quotesLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Shield className="h-5 w-5" />
                      )}
                      Solicitar Aprovação
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="h-12 flex-1 gap-2 bg-primary text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90"
                      data-testid="quote-save-final"
                      onClick={() => onSave('pending')}
                      disabled={quotesLoading || !isFormValid}
                    >
                      {quotesLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                      {isEditMode ? 'Salvar' : 'Criar'}
                    </Button>
                  )}
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          ref={saveDraftBtnRef}
                          variant="outline"
                          size="lg"
                          className="h-12 flex-1"
                          data-testid="quote-save-draft"
                          aria-label="Salvar Rascunho"
                          onClick={() => {
                            if (isEditMode) {
                              setConfirmSaveDraftOpen(true);
                            } else {
                              onSave('draft');
                            }
                          }}
                          disabled={quotesLoading || !isDraftValid}
                        >
                          {quotesLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Salvar Rascunho
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        {isEditMode
                          ? 'Grava o orçamento inteiro no banco (itens, descontos e notas). Não envia para aprovação.'
                          : 'Cria um rascunho do orçamento no banco para você continuar depois.'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <QuoteBuilderSummaryDialogs
        approvalDialogOpen={approvalDialogOpen}
        handleApprovalDialogChange={handleApprovalDialogChange}
        sellerNotes={sellerNotes}
        setSellerNotes={setSellerNotes}
        handleRequestApproval={handleRequestApproval}
        confirmSaveDraftOpen={confirmSaveDraftOpen}
        setConfirmSaveDraftOpen={setConfirmSaveDraftOpen}
        saveDraftBtnRef={saveDraftBtnRef}
        confirmAllOpen={confirmAllOpen}
        handleConfirmAllDialogChange={handleConfirmAllDialogChange}
        staleCount={staleCount}
        setShowOnlyStale={setShowOnlyStale}
        items={items}
        isFormValid={isFormValid}
        quotesLoading={quotesLoading}
        onSave={onSave}
        maxDiscountPercent={maxDiscountPercent}
        realDiscountPercent={realDiscountPercent}
        confirmAllStalePrices={confirmAllStalePrices}
      />
    </div>
  );
}
