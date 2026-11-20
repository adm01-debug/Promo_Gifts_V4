import { renderHook, act } from '@testing-library/react';
import { useQuoteBuilderState } from '@/hooks/quotes/useQuoteBuilderState';
import { toast } from 'sonner';
import { applyDraftToBuilder } from '@/hooks/quotes/quoteDraftApply';
import { applyRestoredDraft } from '@/lib/quotes/applyRestoredDraft';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependências externas
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: null }),
  useParams: () => ({ id: undefined }),
  useSearchParams: () => [new URLSearchParams()],
}));

// Mock dos hooks customizados
// Mock dos hooks @/hooks/quotes (factory unico — multiplos vi.mock no mesmo path se sobrescrevem)
vi.mock('@/hooks/quotes', () => ({
  useQuotes: () => ({
    createQuote: vi.fn(),
    updateQuote: vi.fn(),
    fetchQuote: vi.fn(),
    isLoading: false,
  }),
  useSellerDiscountLimits: () => ({ myLimit: 50 }),
  useDiscountApproval: () => ({ requestApproval: vi.fn() }),
  useQuoteItems: () => ({
    items: [],
    setItems: vi.fn(),
    activeItemIndex: null,
    setActiveItemIndex: vi.fn(),
    expandedItems: new Set(),
    setExpandedItems: vi.fn(),
    toggleExpanded: vi.fn(),
    updateItemQuantity: vi.fn(),
    updateItemPrice: vi.fn(),
    removeItem: vi.fn(),
    handlePersonalizationsChange: vi.fn(),
    confirmItemPrice: vi.fn(),
  }),
  useAutoSaveQuote: () => ({ clearAutoSave: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123' },
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useQuoteBuilderState - Shipping Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should validate shipping requirement in conditions step', () => {
    const { result } = renderHook(() => useQuoteBuilderState(), { wrapper });

    // Configura estado inicial válido para etapa de cliente + outros campos de condições
    act(() => {
      result.current.setClientId('client-123');
      result.current.setContactId('contact-456');
      result.current.setPaymentMethod('boleto');
      result.current.setPaymentTerms('7_dias');
      result.current.setDeliveryTime('7_dias');
    });

    let isValid = false;
    act(() => {
      isValid = result.current.validateStep('conditions');
    });

    expect(isValid).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Selecione a modalidade de frete');
  });

  it('should require shipping cost for fob_pre mode', () => {
    const { result } = renderHook(() => useQuoteBuilderState(), { wrapper });

    act(() => {
      result.current.setClientId('client-123');
      result.current.setContactId('contact-456');
      result.current.setPaymentMethod('boleto');
      result.current.setPaymentTerms('7_dias');
      result.current.setDeliveryTime('7_dias');
      result.current.setShippingType('fob_pre');
      result.current.setShippingCost(0); // Valor zerado/vazio
    });

    let isValid = false;
    act(() => {
      isValid = result.current.validateStep('conditions');
    });

    expect(isValid).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Informe o valor do frete pré-negociado');
  });

  it('should reset shipping cost when switching from fob_pre to cif', () => {
    const { result } = renderHook(() => useQuoteBuilderState(), { wrapper });

    act(() => {
      result.current.setShippingType('fob_pre');
      result.current.setShippingCost(150);
    });

    expect(result.current.shippingCost).toBe(150);

    act(() => {
      result.current.setShippingType('cif');
    });

    expect(result.current.shippingType).toBe('cif');
    expect(result.current.shippingCost).toBe(0);
  });

  it('should start with mixed boxes and the plan hidden from the client, and accept changes', () => {
    const { result } = renderHook(() => useQuoteBuilderState(), { wrapper });

    expect(result.current.freightMixMode).toBe('misturar');
    expect(result.current.showFreightPlanToClient).toBe(false);

    act(() => {
      result.current.setFreightMixMode('separar');
      result.current.setShowFreightPlanToClient(true);
    });

    expect(result.current.freightMixMode).toBe('separar');
    expect(result.current.showFreightPlanToClient).toBe(true);
  });

  it('should bring the freight plan options back to default on resetQuote', () => {
    const { result } = renderHook(() => useQuoteBuilderState(), { wrapper });

    act(() => {
      result.current.setFreightMixMode('separar');
      result.current.setShowFreightPlanToClient(true);
    });
    act(() => {
      result.current.resetQuote();
    });

    expect(result.current.freightMixMode).toBe('misturar');
    expect(result.current.showFreightPlanToClient).toBe(false);
  });

  it('round trip do rascunho: o que o autosave grava volta ao restaurar (recuperação)', () => {
    const { result } = renderHook(() => useQuoteBuilderState(), { wrapper });

    act(() => {
      applyDraftToBuilder(
        { freightMixMode: 'separar', showFreightPlanToClient: true },
        result.current,
      );
    });

    expect(result.current.freightMixMode).toBe('separar');
    expect(result.current.showFreightPlanToClient).toBe(true);
  });

  it('round trip do rascunho: restauração automática aplica os dois campos', () => {
    const { result } = renderHook(() => useQuoteBuilderState(), { wrapper });
    const setters = {
      setClientId: vi.fn(),
      setContactId: vi.fn(),
      setCompanyInfo: vi.fn(),
      setContactInfo: vi.fn(),
      setItems: vi.fn(),
      setDiscountType: vi.fn(),
      setDiscountValue: vi.fn(),
      setNegotiationMarkup: vi.fn(),
      setPaymentMethod: vi.fn(),
      setPaymentTerms: vi.fn(),
      setDeliveryTime: vi.fn(),
      setDeliveryMode: vi.fn(),
      setDeliveryDate: vi.fn(),
      setPendingShippingTypeRestore: vi.fn(),
      setShippingCost: vi.fn(),
      setFreightMixMode: result.current.setFreightMixMode,
      setShowFreightPlanToClient: result.current.setShowFreightPlanToClient,
      setValidUntil: vi.fn(),
      setValidityDays: vi.fn(),
      setNotes: vi.fn(),
      setDraftRestoredAt: vi.fn(),
      syncValidityDaysFromDate: () => '',
    };

    act(() => {
      applyRestoredDraft({ freightMixMode: 'separar', showFreightPlanToClient: true }, setters);
    });
    expect(result.current.freightMixMode).toBe('separar');
    expect(result.current.showFreightPlanToClient).toBe(true);

    // Valor estranho (arquivo editado à mão) volta ao padrão: misturar e desligado.
    act(() => {
      applyRestoredDraft({ freightMixMode: 'xyz', showFreightPlanToClient: 'sim' }, setters);
    });
    expect(result.current.freightMixMode).toBe('misturar');
    expect(result.current.showFreightPlanToClient).toBe(false);
  });
});
