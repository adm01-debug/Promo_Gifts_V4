import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, useParams } from 'react-router-dom';
import FavoritesPage from '@/pages/products/FavoritesPage';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Toaster } from 'sonner';
import { ProductsContext } from '@/contexts/ProductsContext';
import { HelmetProvider } from 'react-helmet-async';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AriaLiveProvider } from '@/components/a11y/AriaLive';

// Mocks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/stores/useFavoritesStore', () => ({
  useFavoritesStore: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      in: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { products: [] }, error: null }),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

vi.mock('@/hooks/useOnboarding', () => ({
  useOnboarding: () => ({
    step: null,
    isFirstTime: false,
    complete: vi.fn(),
    reset: vi.fn(),
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const mockProductsContext = {
  products: [],
  isLoading: false,
  fetchError: null,
  getProductById: vi.fn(),
  getProductsByIds: vi.fn().mockReturnValue([]),
  registerProducts: vi.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ProductsContext.Provider value={mockProductsContext}>
          <TooltipProvider>
            <AriaLiveProvider>
              <BrowserRouter>
                <Toaster />
                {ui}
              </BrowserRouter>
            </AriaLiveProvider>
          </TooltipProvider>
        </ProductsContext.Provider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

describe('E2E Favoritos — Integração UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 'user123' } });
    (useFavoritesStore as any).mockReturnValue({
      favorites: [],
      favoriteCount: 0,
      clearFavorites: vi.fn(),
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn().mockReturnValue(false),
    });
    (useParams as any).mockReturnValue({});
  });

  it('valida título da página e contador inicial', async () => {
    renderWithProviders(<FavoritesPage />);
    expect(screen.getByTestId('page-title-favoritos')).toHaveTextContent('Meus Favoritos');
    expect(screen.getByTestId('favorites-count-items')).toHaveTextContent('0');
  });

  it('exibe Empty State quando não há produtos', async () => {
    renderWithProviders(<FavoritesPage />);
    await waitFor(() => {
      expect(screen.getByTestId('favorites-empty-state')).toBeInTheDocument();
    });
    expect(screen.getByTestId('favorites-empty-cta')).toBeInTheDocument();
  });
});

describe('E2E Favoritos — Acessibilidade UI', () => {
  it('garante que botões principais tenham labels acessíveis via aria-label', () => {
    renderWithProviders(<FavoritesPage />);
    expect(screen.getByLabelText('Favoritos')).toBeInTheDocument();
  });
});
