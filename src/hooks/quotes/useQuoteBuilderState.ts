/**
 * useQuoteBuilderState — Estado centralizado do QuoteBuilder
 * Extrai toda a lógica de estado, cálculos e ações do QuoteBuilderPage.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import {
  useAutoSaveQuote,
  useQuoteItems,
  useQuotes,
  useSellerDiscountLimits,
  type Quote,
  type QuoteItem,
} from '@/hooks/quotes';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ConflictInfo } from '@/hooks/quotes/useQuoteConcurrencyGuard';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/security/sanitize-error';
import { formatCurrency as fmtCurrency } from '@/lib/format';
import { validateQuoteForm, QUOTE_FIELD_LABELS } from '@/lib/validations';
import { useAuth } from '@/contexts/AuthContext';
import type { ExternalVariantStock } from '@/hooks/products';
import { useDebounce } from '@/hooks/common';
import type {
  SelectedCompanyInfo,
  SelectedContactInfo,
} from '@/components/quotes/CompanyContactSelector';
import { getPriceFreshness } from '@/utils/price-freshness';
import * as QuoteCalc from '@/logic/quotes/calculations';
import { isValidQuoteTransition, getQuoteStatusLabel } from '@/lib/quote-status-config';
import type { QuoteStatus } from '@/types/quote';

import { logger } from '@/lib/logger';
import { trackQuoteHandoff } from '@/lib/telemetry/quoteHandoffTelemetry';

import {
  syncValidityDaysFromDate,
  loadQuoteSearchProducts,
  useQuoteBuilderSteps,
  buildSimulatorQuoteItem,
  mapCartItemsToQuoteItems,
  mapCollectionProductsToQuoteItems,
  parseUrlItemsParam,
  buildUrlParamQuoteItem,
  applyLoadedQuote,
  type Product,
} from './useQuoteBuilderState.helpers';

export function useQuoteBuilderState() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: quoteId } = useParams();
  const [searchParams] = useSearchParams();
  const isEditMode = Boolean(quoteId);

  const { user } = useAuth();
  const { createQuote, updateQuote, fetchQuote, isLoading: quotesLoading } = useQuotes();

  const { myLimit: maxDiscountPercent } = useSellerDiscountLimits();

  // ── State ──
  const [clientId, setClientId] = useState('');
  const [contactId, setContactId] = useState('');
  const [companyInfo, setCompanyInfo] = useState<SelectedCompanyInfo | null>(null);
  const [contactInfo, setContactInfo] = useState<SelectedContactInfo | null>(null);

  // QBP-08 FIX: rastrear versão carregada do quote para ativar o lock server-side
  const quoteVersionRef = useRef<number | null>(null);

  // Detecção de concorrência: armazena updated_at ao abrir o orçamento
  const baselineUpdatedAtRef = useRef<string | null>(null);
  // BUG-011: Prevents double-submit when the user clicks "Save" twice rapidly
  const isSavingRef = useRef(false);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const pendingSaveStatusRef = useRef<'draft' | 'pending_approval' | 'pending'>('draft');
  const pendingSellerNotesRef = useRef<string | undefined>(undefined);
  const [validityDays, setValidityDays] = useState('7');
  const [validUntil, setValidUntil] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [negotiationMarkup, setNegotiationMarkup] = useState(0);
  const [notes, setNotes] = useState('');
  const {
    items,
    setItems,
    activeItemIndex,
    setActiveItemIndex,
    expandedItems,
    setExpandedItems,
    toggleExpanded,
    addProductWithColor: addProductWithColorInternal,
    updateItemQuantity,
    updateItemPrice,
    removeItem,
    handlePersonalizationsChange,
    confirmItemPrice,
  } = useQuoteItems();

  const [quoteNumber, setQuoteNumber] = useState('');
  const [currentStatus, setCurrentStatus] = useState('draft');

  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<'data' | 'prazo'>('prazo');
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
  const [shippingType, setShippingType] = useState('');
  const [shippingCost, setShippingCost] = useState(0);

  // QBP-07 FIX: defer shippingType restore via state+useEffect com cleanup
  // Evita chamar setShippingType em componente desmontado (setTimeout sem cleanup)
  const [pendingShippingTypeRestore, setPendingShippingTypeRestore] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingShippingTypeRestore) return;
    let mounted = true;
    const id = setTimeout(() => {
      if (mounted) {
        setShippingType(pendingShippingTypeRestore);
        setPendingShippingTypeRestore(null);
      }
    }, 0);
    return () => {
      mounted = false;
      clearTimeout(id);
    };
  }, [pendingShippingTypeRestore]);

  const handleDeliveryModeChange = useCallback((mode: 'data' | 'prazo') => {
    setDeliveryMode(mode);
    setDeliveryTime('');
    setDeliveryDate(undefined);
  }, []);

  const handleDeliveryDateChange = useCallback((date: Date | undefined) => {
    if (date) {
      // FIX-E07: normalize to LOCAL noon to prevent UTC-midnight dates (returned by some
      // Calendar implementations) from shifting the day in UTC-3 (Brazil) timezone.
      // Without this, a UTC midnight date like 2026-07-15T00:00:00Z would format as
      // July 14 with date-fns (local time), silently storing the wrong day.
      const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
      setDeliveryDate(normalized);
      setDeliveryTime(`date:${format(normalized, 'yyyy-MM-dd')}`);
    } else {
      setDeliveryDate(undefined);
      setDeliveryTime('');
    }
  }, []);

  const handleShippingTypeChange = useCallback(
    (value: string) => {
      setShippingType(value);
      if (value !== 'fob_pre' && shippingCost !== 0) {
        setShippingCost(0);
      }
      toast.success(
        `Frete alterado para: ${
          value === 'cif' ? 'CIF' : value === 'fob' ? 'FOB' : 'FOB Pré-negociado'
        }`,
        {
          description:
            value === 'fob_pre'
              ? 'Lembre-se de informar o valor acordado.'
              : 'O custo será zerado no orçamento.',
        },
      );
    },
    [shippingCost],
  );

  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductForColor, setSelectedProductForColor] = useState<Product | null>(null);

  const [loadingQuote, setLoadingQuote] = useState(isEditMode);

  const debouncedProductSearch = useDebounce(productSearch, 400);

  // ── Stepper ──
  const {
    currentStep,
    setCurrentStep,
    activeStep,
    completedSteps,
    validateStep,
    nextStep,
    prevStep,
    goToStep,
  } = useQuoteBuilderSteps({
    clientId,
    contactId,
    items,
    paymentMethod,
    paymentTerms,
    deliveryTime,
    shippingType,
    shippingCost,
    validUntil,
  });

  // ── AutoSave ──
  // RACE-PROOF: quando o reorder granular está em voo (drag-and-drop ou
  // "Agrupar"), o autosave global NÃO deve persistir `sort_order` — caso
  // contrário o LocalStorage (e qualquer save posterior) sobrescreveria
  // a ordem recém-gravada pelo persistItemsOrder com um snapshot intermediário.
  // O componente de Resumo liga/desliga essa flag em volta do drag.
  const [skipAutosaveSortOrder, setSkipAutosaveSortOrder] = useState(false);
  const autosaveItems = useMemo(
    () =>
      skipAutosaveSortOrder
        ? items.map(({ sort_order: _omit, ...rest }) => rest as QuoteItem)
        : items,
    [items, skipAutosaveSortOrder],
  );

  const { clearAutoSave } = useAutoSaveQuote({
    enabled: (!!clientId || items.length > 0) && !isEditMode,
    data: {
      clientId,
      contactId,
      contactInfo,
      companyInfo,
      items: autosaveItems,
      discountType,
      discountValue,
      negotiationMarkup,
      paymentMethod,
      paymentTerms,
      deliveryTime,
      shippingType,
      shippingCost,
      notes,
      validUntil,
    },

    onRestore: (saved) => {
      if (!isEditMode) {
        if (saved.clientId) setClientId(saved.clientId);
        if (saved.contactId) setContactId(saved.contactId);
        if (saved.companyInfo) setCompanyInfo(saved.companyInfo);
        if (saved.contactInfo) setContactInfo(saved.contactInfo);
        if (saved.items) setItems(saved.items);
        if (saved.discountType) setDiscountType(saved.discountType);
        if (typeof saved.discountValue === 'number') setDiscountValue(saved.discountValue);
        if (typeof saved.negotiationMarkup === 'number' && saved.negotiationMarkup > 0)
          setNegotiationMarkup(saved.negotiationMarkup);
        if (saved.paymentMethod) setPaymentMethod(saved.paymentMethod);
        if (saved.paymentTerms) setPaymentTerms(saved.paymentTerms);
        if (saved.deliveryTime) {
          setDeliveryTime(saved.deliveryTime);
          if (saved.deliveryTime.startsWith('date:')) {
            setDeliveryMode('data');
            try {
              setDeliveryDate(new Date(`${saved.deliveryTime.slice(5)}T12:00:00`));
            } catch (e) {
              logger.warn('Failed to restore delivery date', e);
            }
          } else {
            setDeliveryMode('prazo');
          }
        }
        if (saved.shippingType) {
          // QBP-07 FIX: usar state pendente + useEffect com cleanup (evita setState em desmontado)
          setPendingShippingTypeRestore(saved.shippingType);
        }
        if (saved.shippingCost) setShippingCost(saved.shippingCost);
        if (saved.validUntil) {
          setValidUntil(saved.validUntil);
          // QBP-12 FIX: sincronizar validityDays Select ao restaurar AutoSave
          // Antes: o Select ficava em "Selecione" mesmo com data válida restaurada
          setValidityDays(syncValidityDaysFromDate(saved.validUntil));
        }
        if (saved.notes) setNotes(saved.notes);
      }
    },
  });

  // ── Load existing quote ──
  useEffect(() => {
    if (!isEditMode || !quoteId) return;
    let isMounted = true;
    setLoadingQuote(true);
    fetchQuote(quoteId)
      .then((quote) => {
        if (!isMounted) return;
        if (quote) {
          applyLoadedQuote(quote, {
            setClientId,
            setContactId,
            setValidUntil,
            setValidityDays,
            setNotes,
            setQuoteNumber,
            setCurrentStatus,
            setContactInfo,
            setCompanyInfo,
            setDiscountType,
            setDiscountValue,
            setNegotiationMarkup,
            setPaymentMethod,
            setPaymentTerms,
            setShippingType,
            setShippingCost,
            setDeliveryMode,
            setDeliveryDate,
            setDeliveryTime,
            setItems,
            baselineUpdatedAtRef,
            quoteVersionRef,
          });
        }
        setLoadingQuote(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        logger.error('[useQuoteBuilderState] fetchQuote failed:', err);
        setLoadingQuote(false);
      });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, quoteId, fetchQuote]);

  // ── Pre-fill from simulator ──
  useEffect(() => {
    const state = location.state as {
      fromSimulator?: boolean;
      simulationData?: {
        product?: { id: string; name: string; sku?: string; imageUrl?: string; price?: number };
        quantity?: number;
        personalizations?: Array<{
          technique?: { id: string; name: string };
          location?: { locationCode?: string; locationName?: string } | null;
          specs?: { colors?: number; width?: number; height?: number };
          pricing?: { setupPrice?: number; unitPrice?: number; totalPrice?: number };
        }>;
      };
    } | null;
    if (!state?.fromSimulator || !state.simulationData) return;
    const { product } = state.simulationData;
    if (!product) return;
    // TELEMETRY: handoff simulador → orçamento (persistido em frontend_telemetry
    // para auditoria em `/admin/telemetria`).
    trackQuoteHandoff('fromSimulator', {
      product_id: product.id,
      items_count: 1,
    });
    clearAutoSave();
    const built = buildSimulatorQuoteItem(state.simulationData);
    if (!built) return;
    const { item: newItem, personalizationsCount } = built;
    setItems([newItem]);
    setActiveItemIndex(0);
    if (personalizationsCount > 0) setExpandedItems(new Set([0]));
    toast.success(
      `Produto "${product.name}" importado do simulador com ${personalizationsCount} gravação(ões)`,
    );
    window.history.replaceState({}, document.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // ── Pre-fill from cart ──
  useEffect(() => {
    const state = location.state as {
      fromCart?: boolean;
      companyId?: string;
      companyName?: string;
      companyLocation?: string;
      items?: Array<{
        product_id: string;
        product_name: string;
        product_sku?: string;
        product_image_url?: string;
        quantity: number;
        unit_price: number;
        color_name?: string;
        color_hex?: string;
      }>;
    } | null;
    if (!state?.fromCart || !state.items?.length) return;
    // BUG-CART-HANDOFF FIX: descarta autosave anterior para não sobrescrever o
    // cliente/itens vindos do carrinho quando o hook de autosave habilita.
    // TELEMETRY: registrar handoff carrinho → orçamento (persistido em
    // frontend_telemetry) para detectar regressões do autosave em PROD.
    trackQuoteHandoff('fromCart', {
      company_id: state.companyId ?? null,
      company_name: state.companyName ?? null,
      items_count: state.items.length,
    });
    clearAutoSave();
    if (state.companyId) setClientId(state.companyId);
    const cartItems = mapCartItemsToQuoteItems(state.items);
    setItems(cartItems);
    const companyLabel = state.companyName
      ? state.companyLocation
        ? `${state.companyName} – ${state.companyLocation}`
        : state.companyName
      : '';
    toast.success(`${cartItems.length} item(ns) importado(s) do carrinho`, {
      description: companyLabel || undefined,
    });
    window.history.replaceState({}, document.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // ── Pre-fill from collection ──
  useEffect(() => {
    const state = location.state as {
      fromCollection?: string;
      preloadProducts?: Array<{
        product_id: string;
        product_name: string;
        product_sku?: string;
        product_image_url?: string | null;
        unit_price: number;
        quantity: number;
        color_name?: string | null;
        color_hex?: string | null;
      }>;
    } | null;
    if (!state?.fromCollection || !state.preloadProducts?.length) return;
    trackQuoteHandoff('fromCollection', {
      collection_name: state.fromCollection,
      items_count: state.preloadProducts.length,
    });
    clearAutoSave();
    const collectionItems = mapCollectionProductsToQuoteItems(state.preloadProducts);
    setItems(collectionItems);
    toast.success(
      `${collectionItems.length} produto(s) importado(s) da coleção "${state.fromCollection}"`,
    );
    window.history.replaceState({}, document.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // ── Pre-fill from URL params ──
  useEffect(() => {
    if (isEditMode) return;
    if (items.length > 0) return;

    const rawItems = searchParams.getAll('items[]');
    if (rawItems.length > 0) {
      try {
        const parsedItems = parseUrlItemsParam(rawItems);
        if (parsedItems.length > 0) {
          trackQuoteHandoff('fromUrlParams', {
            items_count: parsedItems.length,
          });
          clearAutoSave();
          setItems(parsedItems);
          setActiveItemIndex(0);
          toast.success(
            `${parsedItems.length} produto${parsedItems.length > 1 ? 's' : ''} adicionado${parsedItems.length > 1 ? 's' : ''} ao orçamento`,
          );
          window.history.replaceState({}, document.title, location.pathname);
          return;
        }
      } catch {
        logger.warn('Failed to parse items[] params');
      }
    }

    const built = buildUrlParamQuoteItem(searchParams);
    if (!built) return;
    const { newItem, productId, productName, colorName } = built;
    trackQuoteHandoff('fromUrlParamsSingle', {
      product_id: productId,
      has_color: !!colorName,
      items_count: 1,
    });
    clearAutoSave();
    setItems([newItem]);
    setActiveItemIndex(0);
    if (productName) {
      toast.success(
        `Produto "${productName}" adicionado ao orçamento${colorName ? ` — ${colorName}` : ''}`,
      );
    }
    window.history.replaceState({}, document.title, location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: products } = useQuery({
    queryKey: ['quote-products-promobrind-search', debouncedProductSearch],
    queryFn: () => loadQuoteSearchProducts(debouncedProductSearch),
    enabled: productSearchOpen,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const filteredProducts = useMemo(() => {
    return products || [];
  }, [products]);

  // ── Calculations ──
  const formatCurrency = useCallback((value: number) => {
    return fmtCurrency(value);
  }, []);

  const calculateItemPersonalizationTotal = useCallback((item: QuoteItem) => {
    return QuoteCalc.calculateItemPersonalizationTotal(item);
  }, []);

  const calculateItemTotal = useCallback((item: QuoteItem) => {
    return QuoteCalc.calculateItemTotal({
      quantity: item.quantity,
      unitPrice: item.unit_price,
      personalizations: item.personalizations,
    });
  }, []);

  const realSubtotal = useMemo(
    () =>
      QuoteCalc.calculateSubtotal(
        items.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unit_price,
          personalizations: item.personalizations,
        })),
      ),
    [items],
  );

  const subtotal = useMemo(
    () => QuoteCalc.applyMarkup(realSubtotal, negotiationMarkup),
    [realSubtotal, negotiationMarkup],
  );

  const discountAmount = useMemo(
    () => QuoteCalc.calculateDiscountAmount(subtotal, discountType, discountValue),
    [subtotal, discountType, discountValue],
  );

  const total = useMemo(() => {
    const baseTotal = QuoteCalc.round2(subtotal - discountAmount);
    const shipping = shippingType === 'fob_pre' ? QuoteCalc.round2(shippingCost) : 0;
    return QuoteCalc.round2(baseTotal + shipping);
  }, [subtotal, discountAmount, shippingCost, shippingType]);

  const realDiscountPercent = useMemo(
    () => QuoteCalc.calculateRealDiscountPercent(realSubtotal, subtotal, discountAmount),
    [realSubtotal, subtotal, discountAmount],
  );

  // BUG-032 FIX: Clamp amount-mode discount when markup decreases below discountValue.
  // FIX-E09: notify the user when the clamp actually fires so they're not surprised.
  useEffect(() => {
    if (discountType !== 'amount') return;
    setDiscountValue((prev) => {
      if (prev > subtotal) {
        const clamped = QuoteCalc.round2(subtotal);
        toast.warning('Desconto ajustado automaticamente', {
          description: `O desconto foi reduzido para ${formatCurrency(clamped)} pois a margem de negociação diminuiu.`,
          duration: 5000,
        });
        return clamped;
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, discountType]); // formatCurrency omitted: stable reference; toast omitted: stable

  const handleProductClick = useCallback((product: Product) => {
    setSelectedProductForColor(product);
  }, []);

  // ── Item actions ──
  const addProductWithColor = useCallback(
    (product: Product, variant: ExternalVariantStock | null) => {
      addProductWithColorInternal(product, variant);
      setSelectedProductForColor(null);
      setProductSearchOpen(false);
      setProductSearch('');
    },
    [addProductWithColorInternal],
  );

  const confirmAllStalePrices = useCallback(() => {
    const ts = new Date().toISOString();
    setItems((prev) =>
      prev.map((item) => {
        // BUG-STALE-CONFIRM FIX: skip only when confirmed AND confirmation postdates
        // the last price update. If price was updated AFTER confirmation, the confirmation
        // is stale and the warning must re-appear.
        if (
          item.price_confirmed_at &&
          (!item.price_updated_at || item.price_confirmed_at >= item.price_updated_at)
        )
          return item;
        const f = getPriceFreshness(item.price_updated_at, item.price_freshness_threshold_days);
        return f.shouldWarn ? { ...item, price_confirmed_at: ts } : item;
      }),
    );
  }, [setItems]);

  // ── Validation ──
  const validationErrors = useMemo(
    () =>
      validateQuoteForm({
        clientId,
        contactId,
        paymentMethod,
        paymentTerms,
        deliveryTime,
        shippingType,
        shippingCost,
        itemsCount: items.length,
      }),
    [
      clientId,
      contactId,
      paymentMethod,
      paymentTerms,
      deliveryTime,
      shippingType,
      shippingCost,
      items,
    ],
  );

  const isFormValid = validationErrors.length === 0;
  const isDraftValid = !!clientId;

  const isDiscountExceeded = useMemo(() => {
    if (maxDiscountPercent === null) return false;
    return realDiscountPercent > maxDiscountPercent;
  }, [maxDiscountPercent, realDiscountPercent]);

  // ── Save ──
  const handleSaveQuote = useCallback(
    async (status: 'draft' | 'pending_approval' | 'pending' = 'draft', sellerNotes?: string) => {
      if (isSavingRef.current) {
        toast.error('Salvamento em andamento. Aguarde.');
        return;
      }
      isSavingRef.current = true;
      try {
        if (status === 'draft') {
          if (!isDraftValid) {
            toast.error('Selecione uma empresa para salvar o rascunho.');
            return;
          }
        } else if (!isFormValid) {
          const missing = validationErrors.map((e) => QUOTE_FIELD_LABELS[e] || e).join(', ');
          toast.error(`Preencha os campos obrigatórios: ${missing}`);
          return;
        }

        // BUG-Q FIX: require validUntil for non-draft saves (empty was silently ignored)
        // BUG-015 FIX: Block sending with past validity date
        // FIX-C04: usar T23:59:59 (hora local) para não bloquear no mesmo dia da validade.
        // new Date('yyyy-MM-dd') = midnight UTC = 21h BRT do dia anterior — causava
        // bloqueio indevido quando o usuário tentava enviar no próprio dia da validade.
        if (status !== 'draft') {
          if (!validUntil) {
            toast.error('Informe a data de validade da proposta antes de finalizar.');
            return;
          }
          if (new Date(`${validUntil}T23:59:59`) < new Date()) {
            toast.error(
              'A data de validade da proposta está no passado. Atualize a validade antes de enviar.',
            );
            return;
          }
        }

        // BUG-008 FIX: Validate status transition before hitting DB
        if (isEditMode && quoteId && currentStatus && currentStatus !== status) {
          if (!isValidQuoteTransition(currentStatus as QuoteStatus, status as QuoteStatus)) {
            toast.error(
              `Não é possível alterar o status de "${getQuoteStatusLabel(currentStatus)}" para "${getQuoteStatusLabel(status)}".`,
            );
            return;
          }
        }

        // Bloqueio de fechamento: preços defasados precisam de confirmação
        if (status !== 'draft') {
          const staleUnconfirmed = items.filter((item) => {
            // BUG-STALE-CONFIRM FIX: a confirmation is only valid when it postdates
            // the last price update. If price_updated_at is newer, re-flag as unconfirmed.
            if (
              item.price_confirmed_at &&
              (!item.price_updated_at || item.price_confirmed_at >= item.price_updated_at)
            )
              return false;
            const f = getPriceFreshness(item.price_updated_at, item.price_freshness_threshold_days);
            return f.isStale;
          });
          if (staleUnconfirmed.length > 0) {
            const names = staleUnconfirmed
              .slice(0, 3)
              .map((i) => i.product_name)
              .filter(Boolean)
              .join(', ');
            const extra =
              staleUnconfirmed.length > 3 ? ` e mais ${staleUnconfirmed.length - 3}` : '';
            toast.error('Confirme os preços defasados antes de fechar o orçamento', {
              description: `${staleUnconfirmed.length} ${staleUnconfirmed.length === 1 ? 'item está' : 'itens estão'} com preço possivelmente defasado: ${names}${extra}. Use o botão "Confirmar com fornecedor" em cada item ou "Confirmar todos" no resumo.`,
              duration: 8000,
            });
            return;
          }
        }

        const effectiveStatus = status === 'pending_approval' ? 'pending_approval' : status;

        const quoteData: Partial<Quote> = {
          client_id: clientId || undefined,
          contact_id: contactId || undefined,
          client_name: contactInfo?.name || undefined,
          client_company: companyInfo?.name || undefined,
          client_cnpj: companyInfo?.cnpj || undefined,
          client_email: contactInfo?.email || undefined,
          client_phone: contactInfo?.phone || undefined,
          status: effectiveStatus,
          discount_percent: discountType === 'percent' ? discountValue : 0,
          discount_amount: discountType === 'amount' ? discountAmount : 0,
          negotiation_markup_percent: Math.min(50, Math.max(0, negotiationMarkup || 0)),
          notes: notes || undefined,
          valid_until: validUntil || undefined,
          payment_method: paymentMethod || undefined,
          payment_terms: paymentTerms || undefined,
          delivery_time: deliveryTime || undefined,
          shipping_type: shippingType || undefined,
          shipping_cost: shippingType === 'fob_pre' ? shippingCost || 0 : 0,
        };
        let result;
        if (isEditMode && quoteId) {
          // Detecção de concorrência via updated_at baseline
          if (baselineUpdatedAtRef.current) {
            // BUG-CONFLICT-CHECK-SILENT-FAIL FIX: previously { error } was not destructured.
            // A network failure or RLS denial returned { data: null, error } silently,
            // disabling concurrency protection for this save without any log trace.
            const { data: remoteQuote, error: conflictCheckErr } = await supabase
              .from('quotes') // rls-allow: SELECT por id (conflict check); RLS valida ownership
              .select('updated_at')
              .eq('id', quoteId)
              .single();
            if (conflictCheckErr)
              logger.warn(
                'Conflict check query failed, proceeding without check:',
                conflictCheckErr,
              );

            const remoteTs = remoteQuote?.updated_at;
            if (remoteTs && new Date(remoteTs) > new Date(baselineUpdatedAtRef.current)) {
              const label = new Date(remoteTs).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Sao_Paulo',
              });
              pendingSaveStatusRef.current = status;
              pendingSellerNotesRef.current = sellerNotes;
              setConflictInfo({ modifiedAt: remoteTs, label });
              return;
            }
          }
          // QBP-08 FIX: passar versão ao atualizar para ativar lock server-side
          result = await updateQuote(
            quoteId,
            quoteData,
            items,
            quoteVersionRef.current ?? undefined,
            status === 'pending_approval' ? sellerNotes : undefined,
          );
        } else {
          result = await createQuote(
            quoteData,
            items,
            status === 'pending_approval' ? sellerNotes : undefined,
          );
        }

        if (result?.id) {
          clearAutoSave();
          navigate(`/orcamentos/${result.id}`);
        }

        // Atualizar versão após save bem-sucedido
        const newVersion = result?.version;
        if (newVersion !== null && newVersion !== undefined) quoteVersionRef.current = newVersion;

        return result?.updated_at ?? undefined;
      } catch (error) {
        // BUG-SAVE-CATCH FIX: handleSaveQuote previously had no catch block — any
        // network error, RLS denial or DB error from createQuote/updateQuote would
        // propagate uncaught, crashing the component with no user feedback.
        logger.error('Erro ao salvar orçamento:', error);
        toast.error('Erro ao salvar orçamento. Tente novamente.', {
          description: sanitizeError(error),
        });
      } finally {
        isSavingRef.current = false;
      }
    },
    [
      isDraftValid,
      isFormValid,
      validationErrors,
      clientId,
      contactId,
      contactInfo,
      companyInfo,
      discountType,
      discountValue,
      discountAmount,
      negotiationMarkup,
      notes,
      validUntil,
      paymentMethod,
      paymentTerms,
      deliveryTime,
      shippingType,
      shippingCost,
      isEditMode,
      quoteId,
      currentStatus,
      items,
      navigate,
      updateQuote,
      createQuote,
      clearAutoSave,
    ],
  );

  const isBuilderBootstrapping = loadingQuote;

  /**
   * Limpa todos os campos do orçamento em construção (empresa, contato,
   * itens, condições de pagamento/entrega, frete, desconto, markup, notas)
   * e descarta o autosave local. Em modo edição, navega para `/orcamentos/novo`
   * para garantir que o orçamento persistido NÃO seja sobrescrito.
   */
  const resetQuote = useCallback(() => {
    if (isEditMode) {
      navigate('/orcamentos/novo');
      return;
    }
    clearAutoSave();
    setClientId('');
    setContactId('');
    setCompanyInfo(null);
    setContactInfo(null);
    setItems([]);
    setNotes('');
    setPaymentMethod('');
    setPaymentTerms('');
    setDeliveryTime('');
    setDeliveryMode('prazo');
    setDeliveryDate(undefined);
    setShippingType('');
    setShippingCost(0);
    setDiscountType('percent');
    setDiscountValue(0);
    setNegotiationMarkup(0);
    setValidityDays('7');
    setValidUntil(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
    setActiveItemIndex(0);
    setExpandedItems(new Set());
    setProductSearch('');
    setProductSearchOpen(false);
    setSelectedProductForColor(null);
    setCurrentStep('client');
    setConflictInfo(null);
  }, [
    isEditMode,
    navigate,
    clearAutoSave,
    setClientId,
    setContactId,
    setCompanyInfo,
    setContactInfo,
    setItems,
    setExpandedItems,
    setActiveItemIndex,
    setCurrentStep,
  ]);

  return {
    resetQuote,
    navigate,
    quoteId,
    isEditMode,
    loadingQuote: isBuilderBootstrapping,
    currentStep,
    setCurrentStep,
    user,
    clientId,
    setClientId,
    contactId,
    setContactId,
    companyInfo,
    setCompanyInfo,
    contactInfo,
    setContactInfo,
    validityDays,
    setValidityDays,
    validUntil,
    setValidUntil,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    negotiationMarkup,
    setNegotiationMarkup,
    notes,
    setNotes,
    items,
    setItems,
    skipAutosaveSortOrder,
    setSkipAutosaveSortOrder,

    quoteNumber,
    currentStatus,
    paymentMethod,
    setPaymentMethod,
    paymentTerms,
    setPaymentTerms,
    deliveryTime,
    setDeliveryTime,
    deliveryMode,
    handleDeliveryModeChange,
    deliveryDate,
    handleDeliveryDateChange,
    shippingType,
    setShippingType: handleShippingTypeChange,
    shippingCost,
    setShippingCost,
    productSearchOpen,
    setProductSearchOpen,
    productSearch,
    setProductSearch,
    selectedProductForColor,
    setSelectedProductForColor,
    expandedItems,
    setExpandedItems,
    activeItemIndex,
    setActiveItemIndex,
    completedSteps,
    activeStep,
    filteredProducts,
    subtotal,
    realSubtotal,
    discountAmount,
    total,
    realDiscountPercent,
    validationErrors,
    isFormValid,
    isDraftValid,
    quotesLoading,
    maxDiscountPercent,
    isDiscountExceeded,
    validateStep,
    nextStep,
    prevStep,
    goToStep,
    formatCurrency,
    calculateItemPersonalizationTotal,
    calculateItemTotal,
    toggleExpanded,
    handlePersonalizationsChange,
    handleProductClick,
    addProductWithColor,
    updateItemQuantity,
    updateItemPrice,
    removeItem,
    confirmItemPrice,
    confirmAllStalePrices,
    handleSaveQuote,
    conflictInfo,
    dismissConflict: () => setConflictInfo(null),
    overwriteAndSave: async (status?: 'draft' | 'pending_approval' | 'pending') => {
      const effectiveStatus = status ?? pendingSaveStatusRef.current;
      const sellerNotes =
        effectiveStatus === 'pending_approval' ? pendingSellerNotesRef.current : undefined;
      setConflictInfo(null);
      const previousBaseline = baselineUpdatedAtRef.current;
      const previousVersion = quoteVersionRef.current;
      try {
        if (!quoteId) throw new Error('Orçamento ausente para sobrescrita');
        // Uma sobrescrita explícita ainda usa CAS. Primeiro adota o snapshot remoto
        // mais recente; qualquer nova corrida entre esta leitura e a RPC será
        // rejeitada pelo _expected_version no banco.
        const { data: remote, error: refreshError } = await supabase
          .from('quotes') // rls-allow: filtrado por quoteId; RLS garante seller scope
          .select('updated_at,version')
          .eq('id', quoteId)
          .single();
        if (refreshError || !remote) {
          throw refreshError ?? new Error('Orçamento não encontrado para sobrescrita');
        }
        baselineUpdatedAtRef.current = remote.updated_at;
        quoteVersionRef.current = remote.version;
        const savedUpdatedAt = await handleSaveQuote(effectiveStatus, sellerNotes);
        if (!savedUpdatedAt) {
          baselineUpdatedAtRef.current = previousBaseline;
          quoteVersionRef.current = previousVersion;
          return;
        }
        baselineUpdatedAtRef.current = savedUpdatedAt;
      } catch (err) {
        baselineUpdatedAtRef.current = previousBaseline;
        quoteVersionRef.current = previousVersion;
        throw err;
      }
    },
  };
}
