/**
 * useQuoteBuilderState.helpers — helpers puros, mappers de pre-fill e o
 * sub-hook do stepper, extraídos de useQuoteBuilderState.ts
 * (refatoração pura, sem mudança de comportamento).
 */
import { useState, useMemo, useCallback, type MutableRefObject } from 'react';
import Fuse from 'fuse.js';
import { format, addDays, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { findKnownHex } from '@/hooks/products';
import type { Quote, QuoteItem, QuoteItemPersonalization } from '@/hooks/quotes';
import type {
  SelectedCompanyInfo,
  SelectedContactInfo,
} from '@/components/quotes/CompanyContactSelector';
import type { QuoteBuilderStep } from '@/components/quotes/QuoteBuilderStepper';
import {
  createProductFuseOptions,
  dedupeById,
  rankProductSearchResults,
} from '@/utils/product-search';
import { validateQuoteForm } from '@/lib/validations';
import type { PromobrindProduct } from '@/lib/external-db';
import { logger } from '@/lib/logger';

const VALIDITY_PRESETS = ['1', '3', '7', '15', '30'] as const;

export function syncValidityDaysFromDate(dateStr: string): string {
  try {
    const daysFromNow = Math.round(
      (new Date(dateStr).getTime() - startOfDay(new Date()).getTime()) / (1000 * 60 * 60 * 24),
    );
    return VALIDITY_PRESETS.find((p) => parseInt(p, 10) === daysFromNow) ?? '';
  } catch {
    return '';
  }
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  images: string[] | null;
  colors?: { name: string; hex?: string; stock?: number }[];
  minQuantity?: number;
  totalStock?: number;
  categoryId?: string | null;
  categoryName?: string | null;
}

interface RawProductColor {
  name?: string;
  hex?: string;
  stock?: number;
}

function mapQuoteSearchProduct(
  p: PromobrindProduct,
  getProductImageUrl: (product: PromobrindProduct) => string | null,
): Product {
  const imgUrl = getProductImageUrl(p);
  const images = p.images && p.images.length > 0 ? p.images : imgUrl ? [imgUrl] : [];

  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: p.sale_price ?? p.base_price ?? 0,
    images,
    colors: (p.colors || []).map((c: RawProductColor | string) => {
      const name = typeof c === 'string' ? c : c.name || '';
      const hex = (typeof c === 'string' ? undefined : c.hex) || findKnownHex(name) || undefined;
      return { name, hex, stock: typeof c === 'string' ? undefined : c.stock };
    }),
    minQuantity: p.min_quantity ?? 1,
    totalStock:
      p.stock_quantity ??
      (p.colors || []).reduce(
        (sum: number, c: RawProductColor | string) =>
          sum + (typeof c === 'object' ? (c.stock ?? 0) : 0),
        0,
      ),
    categoryId: (p as { category_id?: string | null }).category_id ?? null,
    categoryName: (p as { category_name?: string | null }).category_name ?? null,
  };
}

export async function loadQuoteSearchProducts(search: string): Promise<Product[]> {
  const { fetchPromobrindProducts, getProductImageUrl } = await import('@/lib/external-db');
  const normalizedSearch = search.trim();

  if (!normalizedSearch) {
    const productsData = await fetchPromobrindProducts({ limit: 20 });
    return productsData.map((p) => mapQuoteSearchProduct(p, getProductImageUrl));
  }

  const [prefixResult, broadResult] = await Promise.allSettled([
    fetchPromobrindProducts({ filters: { _name_prefix: normalizedSearch }, limit: 200 }),
    fetchPromobrindProducts({ search: normalizedSearch, limit: 500 }),
  ]);
  const prefixMatches = prefixResult.status === 'fulfilled' ? prefixResult.value : [];
  const broadMatches = broadResult.status === 'fulfilled' ? broadResult.value : [];

  const mergedProducts = dedupeById([...prefixMatches, ...broadMatches]).map((product) =>
    mapQuoteSearchProduct(product, getProductImageUrl),
  );
  const fuse = new Fuse(mergedProducts, createProductFuseOptions<Product>());

  return rankProductSearchResults(mergedProducts, normalizedSearch, fuse);
}

// ============================================
// STEPPER (ex-bloco do hook)
// ============================================
export function useQuoteBuilderSteps(deps: {
  clientId: string;
  contactId: string;
  items: QuoteItem[];
  paymentMethod: string;
  paymentTerms: string;
  deliveryTime: string;
  shippingType: string;
  shippingCost: number;
  validUntil: string;
}) {
  const {
    clientId,
    contactId,
    items,
    paymentMethod,
    paymentTerms,
    deliveryTime,
    shippingType,
    shippingCost,
    validUntil,
  } = deps;

  // ── Stepper ──
  const [currentStep, setCurrentStep] = useState<QuoteBuilderStep>('client');

  const activeStep = useMemo((): QuoteBuilderStep => currentStep, [currentStep]);

  const completedSteps = useMemo((): QuoteBuilderStep[] => {
    const steps: QuoteBuilderStep[] = [];
    if (clientId && contactId) steps.push('client');
    if (paymentMethod && paymentTerms && deliveryTime && shippingType) {
      if (shippingType !== 'fob_pre' || shippingCost > 0) {
        // BUG-005 FIX: validUntil missing from condition check
        // FIX-C04b: usar T23:59:59 (hora local) para evitar falso negativo de validade expirada.
        // new Date('yyyy-MM-dd') é midnight UTC, que em BRT (UTC-3) é 21h do dia anterior,
        // fazendo validUntil=hoje parecer expirado mesmo não sendo.
        const validityOk = validUntil && new Date(`${validUntil}T23:59:59`) > new Date();
        if (validityOk) steps.push('conditions');
      }
    }
    if (items.length > 0) steps.push('items');
    const hasAnyPersonalization = items.some((it) => (it.personalizations?.length ?? 0) > 0);
    if (items.length > 0 && hasAnyPersonalization) steps.push('personalization');
    return steps;
  }, [
    clientId,
    contactId,
    items,
    paymentMethod,
    paymentTerms,
    deliveryTime,
    shippingType,
    shippingCost,
    validUntil,
  ]);

  const announce = useCallback((message: string) => {
    const announcer = document.getElementById('quote-builder-announcer');
    if (announcer) {
      announcer.textContent = message;
    }
  }, []);

  const validateStep = useCallback(
    (step: QuoteBuilderStep): boolean => {
      switch (step) {
        case 'client':
          if (!clientId) {
            toast.error('Selecione um cliente');
            announce('Erro: Selecione um cliente');
            return false;
          }
          if (!contactId) {
            toast.error('Selecione um contato');
            announce('Erro: Selecione um contato');
            return false;
          }
          return true;
        case 'conditions': {
          const errors = validateQuoteForm({
            clientId,
            contactId,
            paymentMethod,
            paymentTerms,
            deliveryTime,
            shippingType,
            shippingCost,
            itemsCount: items.length,
          });

          if (errors.includes('forma_pagamento')) {
            toast.error('Selecione a forma de pagamento');
            return false;
          }
          if (errors.includes('prazo_pagamento')) {
            toast.error('Selecione o prazo de pagamento');
            return false;
          }
          if (errors.includes('prazo_entrega')) {
            toast.error('Defina o prazo de entrega');
            return false;
          }
          if (errors.includes('frete')) {
            toast.error('Selecione a modalidade de frete');
            announce('Erro: Selecione a modalidade de frete');
            return false;
          }
          if (errors.includes('valor_frete')) {
            toast.error('Informe o valor do frete pré-negociado');
            return false;
          }
          return true;
        }
        case 'items':
          if (items.length === 0) {
            toast.error('Adicione pelo menos um item');
            announce('Erro: Adicione pelo menos um item');
            return false;
          }
          return true;
        case 'personalization':
          return true;
        case 'review':
          return true;
        default:
          return true;
      }
    },
    [
      clientId,
      contactId,
      paymentMethod,
      paymentTerms,
      deliveryTime,
      shippingType,
      shippingCost,
      items,
      announce,
    ],
  );

  const nextStep = useCallback(() => {
    const steps: QuoteBuilderStep[] = [
      'client',
      'conditions',
      'items',
      'personalization',
      'review',
    ];
    const currentIndex = steps.indexOf(currentStep);

    if (validateStep(currentStep)) {
      if (currentIndex < steps.length - 1) {
        setCurrentStep(steps[currentIndex + 1]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [currentStep, validateStep]);

  const prevStep = useCallback(() => {
    const steps: QuoteBuilderStep[] = [
      'client',
      'conditions',
      'items',
      'personalization',
      'review',
    ];
    const currentIndex = steps.indexOf(currentStep);

    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  const goToStep = useCallback(
    (step: QuoteBuilderStep) => {
      const steps: QuoteBuilderStep[] = [
        'client',
        'conditions',
        'items',
        'personalization',
        'review',
      ];
      const targetIndex = steps.indexOf(step);
      const currentIndex = steps.indexOf(currentStep);

      if (targetIndex === currentIndex) return;

      if (targetIndex > currentIndex) {
        for (let i = currentIndex; i < targetIndex; i++) {
          if (!validateStep(steps[i])) return;
        }
      }

      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [currentStep, validateStep],
  );

  return {
    currentStep,
    setCurrentStep,
    activeStep,
    completedSteps,
    announce,
    validateStep,
    nextStep,
    prevStep,
    goToStep,
  };
}

// ============================================
// MAPPERS DE PRE-FILL (simulador / carrinho / coleção / URL params)
// ============================================
export interface SimulatorPrefillData {
  product?: { id: string; name: string; sku?: string; imageUrl?: string; price?: number };
  quantity?: number;
  personalizations?: Array<{
    technique?: { id: string; name: string };
    location?: { locationCode?: string; locationName?: string } | null;
    specs?: { colors?: number; width?: number; height?: number };
    pricing?: { setupPrice?: number; unitPrice?: number; totalPrice?: number };
  }>;
}

export function buildSimulatorQuoteItem(simulationData: SimulatorPrefillData): {
  item: QuoteItem;
  personalizationsCount: number;
} | null {
  const { product, quantity, personalizations } = simulationData;
  if (!product) return null;
  const quotePersonalizations: QuoteItemPersonalization[] = (personalizations || []).map((p) => {
    // Fallback: wizard pode vir sem location explícito — usa 'Frente' como padrão
    // consistente para que a proposta SEMPRE exiba Lado A/B/Circular/Frente.
    const locName = p.location?.locationName?.trim() || 'Frente';
    const locCode = p.location?.locationCode?.trim() || undefined;
    const colors = p.specs?.colors && p.specs.colors > 0 ? p.specs.colors : 1;
    return {
      technique_id: p.technique?.id ?? '',
      technique_name: p.technique?.name ?? '',
      location_code: locCode,
      location_name: locName,
      colors_count: colors,
      positions_count: 1,
      width_cm: p.specs?.width || undefined,
      height_cm: p.specs?.height || undefined,
      area_cm2: (p.specs?.width || 0) * (p.specs?.height || 0),
      setup_cost: p.pricing?.setupPrice || 0,
      unit_cost: p.pricing?.unitPrice || 0,
      total_cost: p.pricing?.totalPrice || 0,
    };
  });
  const newItem: QuoteItem = {
    product_id: product.id,
    product_name: product.name,
    product_sku: product.sku || '',
    product_image_url: product.imageUrl || undefined,
    quantity: quantity || 1,
    unit_price: product.price || 0,
    personalizations: quotePersonalizations,
  };
  return { item: newItem, personalizationsCount: quotePersonalizations.length };
}

export interface CartPrefillItem {
  product_id: string;
  product_name: string;
  product_sku?: string;
  product_image_url?: string;
  quantity: number;
  unit_price: number;
  color_name?: string;
  color_hex?: string;
}

export function mapCartItemsToQuoteItems(items: CartPrefillItem[]): QuoteItem[] {
  return items.map((i) => ({
    product_id: i.product_id,
    product_name: i.product_name,
    product_sku: i.product_sku || '',
    product_image_url: i.product_image_url || undefined,
    quantity: i.quantity,
    unit_price: i.unit_price,
    color_name: i.color_name || undefined,
    color_hex: i.color_hex || undefined,
    personalizations: [],
  }));
}

export interface CollectionPrefillProduct {
  product_id: string;
  product_name: string;
  product_sku?: string;
  product_image_url?: string | null;
  unit_price: number;
  quantity: number;
  color_name?: string | null;
  color_hex?: string | null;
}

export function mapCollectionProductsToQuoteItems(
  preloadProducts: CollectionPrefillProduct[],
): QuoteItem[] {
  return preloadProducts.map((p) => ({
    product_id: p.product_id,
    product_name: p.product_name,
    product_sku: p.product_sku || '',
    product_image_url: p.product_image_url || undefined,
    quantity: p.quantity || 1,
    unit_price: p.unit_price || 0,
    color_name: p.color_name || undefined,
    color_hex: p.color_hex || undefined,
    personalizations: [],
  }));
}

export function parseUrlItemsParam(rawItems: string[]): QuoteItem[] {
  return rawItems.map((raw) => {
    const p = JSON.parse(raw);
    return {
      product_id: p.product_id || '',
      product_name: p.product_name || '',
      product_sku: p.product_sku || '',
      product_image_url: p.product_image || undefined,
      quantity: Math.max(1, p.quantity || 1),
      unit_price: parseFloat(p.product_price) || 0,
      color_name: p.color_name || undefined,
      color_hex: p.color_hex || undefined,
      personalizations: [],
    };
  });
}

export function buildUrlParamQuoteItem(searchParams: URLSearchParams): {
  newItem: QuoteItem;
  productId: string;
  productName: string;
  colorName: string | undefined;
} | null {
  const productId = searchParams.get('product_id') || searchParams.get('productId');
  if (!productId) return null;
  const productName = searchParams.get('product_name') || '';
  const colorName = searchParams.get('color_name') || undefined;
  const colorHex = searchParams.get('color_hex') || undefined;
  const newItem: QuoteItem = {
    product_id: productId,
    product_name: productName,
    product_sku: searchParams.get('product_sku') || '',
    product_image_url: searchParams.get('product_image') || undefined,
    quantity: Math.max(1, parseInt(searchParams.get('min_quantity') || '1', 10)),
    unit_price: parseFloat(searchParams.get('product_price') ?? '') || 0,
    color_name: colorName,
    color_hex: colorHex,
    personalizations: [],
  };
  return { newItem, productId, productName, colorName };
}

// ============================================
// LOAD QUOTE (ex-effect de carregamento da quote em edição)
// ============================================
export interface LoadedQuoteSetters {
  setClientId: (v: string) => void;
  setContactId: (v: string) => void;
  setValidUntil: (v: string) => void;
  setValidityDays: (v: string) => void;
  setNotes: (v: string) => void;
  setQuoteNumber: (v: string) => void;
  setCurrentStatus: (v: Quote['status']) => void;
  setContactInfo: (v: SelectedContactInfo | null) => void;
  setCompanyInfo: (v: SelectedCompanyInfo | null) => void;
  setDiscountType: (v: 'amount' | 'percent') => void;
  setDiscountValue: (v: number) => void;
  setNegotiationMarkup: (v: number) => void;
  setPaymentMethod: (v: string) => void;
  setPaymentTerms: (v: string) => void;
  setShippingType: (v: string) => void;
  setShippingCost: (v: number) => void;
  setDeliveryMode: (v: 'data' | 'prazo') => void;
  setDeliveryDate: (v: Date) => void;
  setDeliveryTime: (v: string) => void;
  setItems: (v: QuoteItem[]) => void;
  baselineUpdatedAtRef: MutableRefObject<string | null>;
  quoteVersionRef: MutableRefObject<number | null>;
}

export function applyLoadedQuote(quote: Quote, s: LoadedQuoteSetters): void {
  s.setClientId(quote.client_id || '');
  s.setContactId(quote.contact_id || '');
  s.setValidUntil(quote.valid_until || format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  // BUG-007 FIX: sync validityDays Select ao carregar quote existente
  if (quote.valid_until) {
    s.setValidityDays(syncValidityDaysFromDate(quote.valid_until));
  }
  s.setNotes(quote.notes || '');
  s.setQuoteNumber(quote.quote_number || '');
  s.setCurrentStatus(quote.status);
  if (quote.client_name) {
    s.setContactInfo({
      id: '',
      name: quote.client_name,
      email: quote.client_email || undefined,
      phone: quote.client_phone || undefined,
    });
  }
  if (quote.client_company) {
    s.setCompanyInfo({
      id: quote.client_id || '',
      name: quote.client_company,
      cnpj: quote.client_cnpj || undefined,
      ramo_atividade: undefined,
    });
  }
  // BUG-003 FIX: log quando ambos os campos de desconto estão preenchidos
  if ((quote.discount_percent ?? 0) > 0 && (quote.discount_amount ?? 0) > 0) {
    logger.warn(
      '[useQuoteBuilderState] Both discount_percent and discount_amount are set on loaded quote — possible data corruption. Picking percent.',
      { quoteId: quote.id },
    );
  }
  if (quote.discount_percent && quote.discount_percent > 0) {
    s.setDiscountType('percent');
    s.setDiscountValue(quote.discount_percent);
  } else if (quote.discount_amount && quote.discount_amount > 0) {
    s.setDiscountType('amount');
    s.setDiscountValue(quote.discount_amount);
  }
  if (typeof quote.negotiation_markup_percent === 'number')
    s.setNegotiationMarkup(quote.negotiation_markup_percent);
  if (quote.payment_method) s.setPaymentMethod(quote.payment_method);
  if (quote.payment_terms) s.setPaymentTerms(quote.payment_terms);
  if (quote.shipping_type) s.setShippingType(quote.shipping_type);
  // BUG-004 FIX: falsy check skips 0 (valid for CIF); use explicit null check
  if (quote.shipping_cost !== null && quote.shipping_cost !== undefined)
    s.setShippingCost(quote.shipping_cost);
  if (quote.delivery_time) {
    if (quote.delivery_time.startsWith('date:')) {
      s.setDeliveryMode('data');
      s.setDeliveryDate(new Date(`${quote.delivery_time.slice(5)}T12:00:00`));
    } else {
      s.setDeliveryMode('prazo');
    }
    s.setDeliveryTime(quote.delivery_time);
  }
  if (quote.items) s.setItems(quote.items);
  // Salva baseline para detecção de conflito
  s.baselineUpdatedAtRef.current = quote.updated_at ?? null;
  // QBP-08 FIX: salvar versão carregada para ativar optimistic lock server-side
  s.quoteVersionRef.current = quote.version ?? null;
}
