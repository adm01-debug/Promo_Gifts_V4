import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';

type BrowserRouterSpyProps = {
  children?: ReactNode;
  future?: unknown;
  useTransitions?: boolean;
};

const browserRouterSpy = vi.fn<(props: BrowserRouterSpyProps) => ReactElement>();

vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children, future, useTransitions }: BrowserRouterSpyProps) => {
    browserRouterSpy({ children, future, useTransitions });
    return <>{children}</>;
  },
}));

vi.mock('@/components/ui/sonner', () => ({ Toaster: () => <div data-testid="sonner" /> }));
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock('@/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock('@/contexts/CloudStatusContext', () => ({
  CloudStatusProvider: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/providers/AppBootstrap', () => ({
  AppBootstrap: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/providers/MotionProvider', () => ({
  MotionProvider: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/a11y', () => ({
  AccessibilityProvider: ({ children }: { children?: ReactNode }) => <>{children}</>,
  AriaLiveProvider: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/system/RootInteractivityGuard', () => ({
  RootInteractivityGuard: () => <div data-testid="root-interactivity-guard" />,
}));
vi.mock('@/components/common/RouteScrollReset', () => ({
  RouteScrollReset: () => <div data-testid="route-scroll-reset" />,
}));
vi.mock('@/components/errors/EnhancedErrorBoundary', () => ({
  EnhancedErrorBoundary: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ThemeInitializer', () => ({
  ThemeInitializer: () => <div data-testid="theme-initializer" />,
}));
vi.mock('@/hooks/common/useAppBootstrap', () => ({
  useAppBootstrap: () => undefined,
}));
vi.mock('@/routes/AppRoutes', () => ({
  AppRoutes: () => <div data-testid="app-routes" />,
}));
vi.mock('@/routes/RoutePrefetcher', () => ({
  RoutePrefetcher: () => <div data-testid="route-prefetcher" />,
}));
vi.mock('@/components/security/LastInternalRouteTracker', () => ({
  LastInternalRouteTracker: () => <div data-testid="last-internal-route-tracker" />,
}));
vi.mock('@/lib/env/supabase-placeholder', () => ({
  isSupabaseLighthousePlaceholder: () => true,
}));
vi.mock('@/lib/lazyWithRetry', () => ({
  lazyWithRetry: vi.fn(),
}));

describe('App router contract', () => {
  it('desativa startTransition sem flags future obsoletas e mantém as rotas montadas', async () => {
    const { default: App } = await import('./App');

    render(<App />);

    expect(screen.getByTestId('app-routes')).toBeInTheDocument();
    expect(browserRouterSpy).toHaveBeenCalledTimes(1);
    expect(browserRouterSpy.mock.calls[0]?.[0]?.future).toBeUndefined();
    expect(browserRouterSpy.mock.calls[0]?.[0]?.useTransitions).toBe(false);
  });
});
