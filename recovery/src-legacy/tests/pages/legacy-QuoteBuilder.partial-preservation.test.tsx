import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuoteBuilderPage from '@/pages/QuoteBuilderPage';
import type { QuoteAutoSave } from '@/components/quotes/QuoteAutoSave';

const state = vi.hoisted(() => ({
  loadingQuote: false,
  quoteId: undefined,
  isEditMode: false,
  templates: [{ id: 'tpl', name: 'Template parcial' }],
  defaultTemplate: { id: 'tpl', name: 'Template parcial' },
  items: [],
  templateApplied: null,
  validationErrors: [],
  completedSteps: [],
  activeStep: 'client',
  clientId: '',
  contactId: '',
  validityDays: '7',
  validUntil: '2026-11-17',
  notes: '',
  internalNotes: '',
  paymentMethod: 'boleto',
  paymentTerms: '',
  deliveryTime: '',
  deliveryMode: 'prazo',
  shippingType: 'cif',
  shippingCost: 0,
  discountType: 'percent',
  discountValue: 0,
  navigate: vi.fn(),
  applyTemplate: vi.fn(),
  setClientId: vi.fn(),
  setValidUntil: vi.fn(),
  setDiscountType: vi.fn(),
  setDiscountValue: vi.fn(),
  setNotes: vi.fn(),
  setInternalNotes: vi.fn(),
  setItems: vi.fn(),
  setContactId: vi.fn(),
  setCompanyInfo: vi.fn(),
  setContactInfo: vi.fn(),
  setValidityDays: vi.fn(),
  setNegotiationMarkup: vi.fn(),
  setDeliveryMode: vi.fn(),
  setDeliveryDate: vi.fn(),
  setPaymentMethod: vi.fn(),
  setPaymentTerms: vi.fn(),
  setDeliveryTime: vi.fn(),
  setShippingType: vi.fn(),
  setShippingCost: vi.fn(),
}));
const captured = vi.hoisted(() => ({
  autoSave: null as ComponentProps<typeof QuoteAutoSave> | null,
  guard: vi.fn(),
}));
vi.mock('@/hooks/useQuoteBuilderState', () => ({ useQuoteBuilderState: () => state }));
vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: PropsWithChildren) => <>{children}</>,
}));
vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('@/components/quotes/QuoteAutoSave', () => ({
  QuoteAutoSave: (props: ComponentProps<typeof QuoteAutoSave>) => {
    captured.autoSave = props;
    return null;
  },
}));
vi.mock('@/hooks/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: (options: { hasUnsavedChanges: boolean }) => {
    captured.guard(options);
    return {
      showDialog: false,
      guardNavigation: (callback: () => void) => callback(),
      confirmLeave: vi.fn(),
      cancelLeave: vi.fn(),
      message: '',
    };
  },
}));
vi.mock('@/components/common/UnsavedChangesDialog', () => ({ UnsavedChangesDialog: () => null }));
vi.mock('@/components/quotes/QuoteTemplateSelector', () => ({
  QuoteTemplateSelector: ({ trigger }: { trigger: ReactNode }) => <>{trigger}</>,
}));
vi.mock('@/components/quotes/SaveAsTemplateButton', () => ({ SaveAsTemplateButton: () => null }));
vi.mock('@/components/quotes/QuoteProductCustomization', () => ({
  QuoteProductCustomization: () => null,
}));
vi.mock('@/components/quotes/CompanyContactSelector', () => ({
  CompanyContactSelector: () => null,
}));
vi.mock('@/components/quotes/DraggableQuoteItems', () => ({ DraggableQuoteItems: () => null }));
vi.mock('@/components/quotes/QuoteBuilderStepper', () => ({ QuoteBuilderStepper: () => null }));
vi.mock('@/components/quotes/QuoteBuilderSummaryColumn', () => ({
  QuoteBuilderSummaryColumn: () => null,
}));
vi.mock('@/components/quotes/QuoteBuilderProductSearch', () => ({
  QuoteBuilderProductSearch: () => null,
}));

beforeEach(() => {
  Object.values(state).forEach((value) => {
    if (vi.isMockFunction(value)) value.mockClear();
  });
  captured.guard.mockClear();
});
afterEach(cleanup);

describe('legacy QuoteBuilder preserves partial templates and valid recovery', () => {
  it('keeps both the template selector and the default-template action', () => {
    render(<QuoteBuilderPage />);
    expect(screen.getByRole('button', { name: /Usar Template/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar Template' }));
    expect(state.applyTemplate).toHaveBeenCalledExactlyOnceWith(state.defaultTemplate);
    expect(screen.getByLabelText('Forma | Pagamento')).toBeInTheDocument();
  });
  it('rejects invalid known item fields before modifying any current quote state', () => {
    render(<QuoteBuilderPage />);
    expect(() =>
      captured.autoSave?.onRestore?.({
        notes: 'Não aplicar',
        items: [{ product_id: 'p1', quantity: 'bad' }],
      }),
    ).toThrow(/incompatíveis/);
    expect(state.setClientId).not.toHaveBeenCalled();
    expect(state.setNotes).not.toHaveBeenCalled();
    expect(state.setItems).not.toHaveBeenCalled();
  });
  it('restores real item metadata and payment fields without triggering a server save', () => {
    render(<QuoteBuilderPage />);
    const item = {
      product_id: 'p1',
      product_name: 'Produto',
      quantity: 2,
      unit_price: 5,
      partialMetadata: { preserved: true },
      personalizations: [{ technique_id: 't1', colorNote: 'Parcial' }],
    };
    act(() => {
      void captured.autoSave?.onRestore?.({
        notes: 'Recuperado',
        items: [item],
        paymentMethod: 'pix_transferencia',
        shippingCost: 0,
      });
    });
    expect(state.setItems).toHaveBeenCalledExactlyOnceWith([item]);
    expect(state.setPaymentMethod).toHaveBeenCalledExactlyOnceWith('pix_transferencia');
    expect(state.setShippingCost).toHaveBeenCalledExactlyOnceWith(0);
    expect(state.navigate).not.toHaveBeenCalled();
  });
  it('connects autosave dirty changes to the existing navigation guard', () => {
    render(<QuoteBuilderPage />);
    act(() => captured.autoSave?.onChange?.(true));
    expect(captured.guard).toHaveBeenLastCalledWith({ hasUnsavedChanges: true });
    act(() => captured.autoSave?.onChange?.(false));
    expect(captured.guard).toHaveBeenLastCalledWith({ hasUnsavedChanges: false });
  });
  it('restores contact metadata, commercial margin and the visible dated-delivery mode', () => {
    render(<QuoteBuilderPage />);
    const companyInfo = { id: 'company-1', name: 'Empresa', cnpj: 'cnpj', partialColor: '#123456' };
    const contactInfo = {
      id: 'contact-1',
      name: 'Contato',
      email: 'a@example.com',
      partialCargo: 'Compras',
    };
    act(() => {
      void captured.autoSave?.onRestore?.({
        clientId: 'company-1',
        contactId: 'contact-1',
        companyInfo,
        contactInfo,
        negotiationMarkup: 12,
        validityDays: '14',
        validUntil: '2026-11-24',
        deliveryTime: 'date:2026-12-10',
        items: [],
      });
    });
    expect(state.setCompanyInfo).toHaveBeenCalledExactlyOnceWith(companyInfo);
    expect(state.setContactInfo).toHaveBeenCalledExactlyOnceWith(contactInfo);
    expect(state.setContactId).toHaveBeenCalledExactlyOnceWith('contact-1');
    expect(state.setNegotiationMarkup).toHaveBeenCalledExactlyOnceWith(12);
    expect(state.setValidityDays).toHaveBeenCalledExactlyOnceWith('14');
    expect(state.setDeliveryMode).toHaveBeenCalledExactlyOnceWith('data');
    expect(state.setDeliveryDate).toHaveBeenCalledExactlyOnceWith(new Date('2026-12-10T12:00:00'));
  });
});
