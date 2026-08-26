/* eslint-disable @typescript-eslint/require-await */
/**
 * Garante que o destaque do "Novo Orçamento" e a expansão do grupo
 * "Orçamentos" NÃO piscam durante carregamento assíncrono — seja quando a
 * rota usa `React.lazy` + `Suspense` (chunk loading), quando o conteúdo
 * dispara queries assíncronas, ou quando navegação ocorre rapidamente em
 * sequência ("double click").
 *
 * Princípio testado: o destaque e a auto-expansão são DERIVADOS
 * sincronamente de `location.pathname`. Eles não podem depender do término
 * de um efeito assíncrono (useEffect com Promise) — caso contrário o
 * usuário vê 1 frame com o item correto desativado ou o grupo recolhido.
 *
 * O wrapper `ControlledSidebarGroup` espelha exatamente o
 * `SidebarReorganized.computeAutoOpen` (setState durante render quando o
 * pathname muda), isolando a lógica para teste.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, Outlet, RouterProvider, useLocation } from 'react-router-dom';
import { Plus, FileText, ShoppingCart } from 'lucide-react';
import { type NavGroup, SidebarNavGroup } from '../SidebarNavGroup';
import { isNavItemActive } from '@/lib/navigation/active-match';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: true, isDev: true, user: { id: 'u1' } }),
}));
vi.mock('@/hooks/auth', () => ({
  useRBAC: () => ({ hasPermission: () => true }),
}));
vi.mock('@/lib/routePrefetch', () => ({
  getPrefetchHandlers: () => ({ onMouseEnter: () => {}, onTouchStart: () => {} }),
}));
vi.mock('@/lib/navigation/restricted-routes', () => ({
  isDevOnlyPath: () => false,
  isAdminOnlyPath: () => false,
}));

const group: NavGroup = {
  id: 'quotes',
  label: 'Orçamentos',
  icon: FileText,
  defaultOpen: true,
  items: [
    { icon: Plus, label: 'Novo Orçamento', href: '/orcamentos/novo', shortcut: 'Alt+N' },
    { icon: FileText, label: 'Orçamentos', href: '/orcamentos', exact: true, shortcut: 'Alt+O' },
    { icon: ShoppingCart, label: 'Carrinhos', href: '/carrinhos', shortcut: 'Alt+R' },
  ],
};

function ControlledSidebarGroup() {
  const location = useLocation();
  const computeAutoOpen = React.useCallback(
    () =>
      group.items.some((item) => isNavItemActive(location.pathname, item.href, item.exact)) ||
      (group.defaultOpen ?? false),
    [location.pathname],
  );
  const [isOpen, setIsOpen] = React.useState<boolean>(computeAutoOpen);
  const lastPathRef = React.useRef(location.pathname);
  if (lastPathRef.current !== location.pathname) {
    lastPathRef.current = location.pathname;
    setIsOpen(computeAutoOpen());
  }
  return (
    <SidebarNavGroup
      group={group}
      isOpen={isOpen}
      isCollapsed={false}
      onToggle={(next) => setIsOpen(next)}
      onMobileClose={() => {}}
      isMobileSidebarOpen={false}
    />
  );
}

/** Cria uma página cuja renderização suspende até o resolve controlado pelo teste. */
function makeDeferredPage(label: string) {
  let resolved = false;
  let resolveFn: (() => void) | null = null;
  const gate = new Promise<void>((resolve) => {
    resolveFn = () => {
      resolved = true;
      resolve();
    };
  });

  function DeferredPage() {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- Suspense usa o thenable pendente como sinal de carregamento.
    if (!resolved) throw gate;
    return <div data-testid={`page-${label}`}>{label}</div>;
  }

  return {
    DeferredPage,
    resolve: () => {
      if (!resolveFn) throw new Error('resolveFn missing');
      resolveFn();
    },
  };
}

function SuspendedRoute({ deferredPath, Page }: { deferredPath: string; Page: React.ComponentType }) {
  const location = useLocation();
  if (location.pathname !== deferredPath) {
    return <div data-testid="page-other">other</div>;
  }
  return <Page />;
}

function setupRouterWithSuspense(initialPath: string, deferredPath: string) {
  const { DeferredPage, resolve } = makeDeferredPage(deferredPath);
  // Espelha o BrowserRouter do App: a URL deve refletir a navegação antes de o chunk resolver.
  render(
    <MemoryRouter initialEntries={[initialPath]} useTransitions={false}>
      <ControlledSidebarGroup />
      <React.Suspense fallback={<div data-testid="route-fallback">carregando…</div>}>
        <SuspendedRoute deferredPath={deferredPath} Page={DeferredPage} />
      </React.Suspense>
    </MemoryRouter>,
  );
  return { resolve };
}

function getNavLink(label: string): HTMLAnchorElement {
  return screen.getByRole('link', { name: new RegExp(label, 'i') }) as HTMLAnchorElement;
}
function isLinkActive(label: string): boolean {
  return getNavLink(label).className.includes('bg-primary/10');
}
function getHeader(): HTMLButtonElement {
  return screen.getByRole('button', { name: /alternar grupo|orçamentos/i }) as HTMLButtonElement;
}
function isGroupExpanded(): boolean {
  return getHeader().getAttribute('aria-expanded') === 'true';
}
function navigateWithLink(label: string) {
  fireEvent.click(getNavLink(label), { button: 0 });
}

describe('SidebarNavGroup — sem flicker durante Suspense (rota lazy)', () => {
  it('ao navegar para /orcamentos/novo enquanto o chunk ainda NÃO resolveu, o destaque já está no item correto', async () => {
    const { resolve } = setupRouterWithSuspense('/dashboard', '/orcamentos/novo');

    // Estado inicial: rota neutra, ninguém ativo, mas grupo aberto via defaultOpen.
    expect(isLinkActive('Novo Orçamento')).toBe(false);
    expect(isGroupExpanded()).toBe(true);

    navigateWithLink('Novo Orçamento');

    // Mesmo com o chunk ainda pendente (fallback visível), a sidebar JÁ
    // reflete o destaque e a expansão — sem esperar o resolve.
    expect(screen.getByTestId('route-fallback')).toBeInTheDocument();
    expect(isLinkActive('Novo Orçamento')).toBe(true);
    expect(isLinkActive('Carrinhos')).toBe(false);
    expect(isGroupExpanded()).toBe(true);

    // Resolve o chunk. O destaque NÃO pode mudar (idempotente).
    await act(async () => {
      resolve();
      await Promise.resolve(); // flush da microtask do React.lazy
    });

    expect(screen.queryByTestId('route-fallback')).not.toBeInTheDocument();
    expect(screen.getByTestId('page-/orcamentos/novo')).toBeInTheDocument();
    expect(isLinkActive('Novo Orçamento')).toBe(true);
    expect(isGroupExpanded()).toBe(true);
  });

  it('o aria-expanded do grupo NÃO oscila entre true e false durante o ciclo Suspense', async () => {
    const { resolve } = setupRouterWithSuspense('/dashboard', '/orcamentos/novo');

    // Snapshot do aria-expanded em cada fase do ciclo.
    const phases: { label: string; expanded: string | null }[] = [];

    phases.push({ label: 'antes', expanded: getHeader().getAttribute('aria-expanded') });

    navigateWithLink('Novo Orçamento');
    phases.push({ label: 'durante-fallback', expanded: getHeader().getAttribute('aria-expanded') });

    await act(async () => {
      resolve();
      await Promise.resolve();
    });
    phases.push({ label: 'após-resolve', expanded: getHeader().getAttribute('aria-expanded') });

    // Em todas as fases para uma rota relevante, o grupo está aberto.
    // A única fase em que NÃO precisa estar aberto é "antes" (rota neutra),
    // mas ali defaultOpen=true também o mantém aberto. Logo: tudo "true".
    for (const p of phases) {
      expect(p.expanded).toBe('true');
    }
  });

  it("o aria-current do link Novo Orçamento permanece 'page' durante TODA a janela Suspense", async () => {
    const { resolve } = setupRouterWithSuspense('/dashboard', '/orcamentos/novo');

    expect(getNavLink('Novo Orçamento').getAttribute('aria-current')).not.toBe('page');

    navigateWithLink('Novo Orçamento');
    // Sem flicker: aria-current já está correto durante o fallback.
    expect(getNavLink('Novo Orçamento').getAttribute('aria-current')).toBe('page');
    expect(screen.getByTestId('route-fallback')).toBeInTheDocument();

    await act(async () => {
      resolve();
      await Promise.resolve();
    });
    expect(getNavLink('Novo Orçamento').getAttribute('aria-current')).toBe('page');
  });
});

describe('SidebarNavGroup — sem flicker em navegações rápidas em sequência (double-click)', () => {
  it('dois pushes consecutivos /carrinhos -> /orcamentos/novo aplicam só o destaque final, sem estado intermediário inconsistente', async () => {
    const { resolve } = setupRouterWithSuspense('/dashboard', '/orcamentos/novo');

    // dispara DUAS navegações no mesmo tick — apenas a última deve valer.
    navigateWithLink('Carrinhos');
    navigateWithLink('Novo Orçamento');

    // Após o batching, o destaque reflete o destino FINAL.
    expect(isLinkActive('Novo Orçamento')).toBe(true);
    expect(isLinkActive('Carrinhos')).toBe(false);
    expect(isLinkActive('Orçamentos')).toBe(false);
    expect(isGroupExpanded()).toBe(true);

    await act(async () => {
      resolve();
      await Promise.resolve();
    });

    expect(isLinkActive('Novo Orçamento')).toBe(true);
    expect(isLinkActive('Carrinhos')).toBe(false);
    expect(isGroupExpanded()).toBe(true);
  });

  it('clique repetido no MESMO link (/orcamentos/novo) não desativa nem fecha o grupo entre os cliques', async () => {
    const { resolve } = setupRouterWithSuspense('/orcamentos/novo', '/orcamentos/novo');

    // Estado inicial já em /orcamentos/novo (Suspense em curso para o conteúdo).
    expect(isLinkActive('Novo Orçamento')).toBe(true);
    expect(isGroupExpanded()).toBe(true);

    // Re-navegar para a mesma URL — não pode "resetar" o estado visual.
    navigateWithLink('Novo Orçamento');
    expect(isLinkActive('Novo Orçamento')).toBe(true);
    expect(isGroupExpanded()).toBe(true);

    navigateWithLink('Novo Orçamento');
    expect(isLinkActive('Novo Orçamento')).toBe(true);
    expect(isGroupExpanded()).toBe(true);

    await act(async () => {
      resolve();
      await Promise.resolve();
    });
    expect(isLinkActive('Novo Orçamento')).toBe(true);
    expect(isGroupExpanded()).toBe(true);
  });
});

describe('SidebarNavGroup — sem flicker quando metadata da página resolve depois', () => {
  /**
   * Simula um cenário em que o conteúdo da página dispara um efeito
   * assíncrono (carregamento de metadata, breadcrumbs, etc.) que só resolve
   * APÓS a navegação. O destaque/expansão da sidebar não pode depender disso.
   */
  function MetadataLoader({ delayMs }: { delayMs: number }) {
    const [loaded, setLoaded] = React.useState(false);
    React.useEffect(() => {
      const t = setTimeout(() => setLoaded(true), delayMs);
      return () => clearTimeout(t);
    }, [delayMs]);
    return <div data-testid={`metadata-${loaded ? 'ready' : 'loading'}`}>x</div>;
  }

  function setupRouterWithMetadata(initialPath: string) {
    const router = createMemoryRouter(
      [
        {
          path: '*',
          element: (
            <>
              <ControlledSidebarGroup />
              <MetadataLoader delayMs={50} />
              <Outlet />
            </>
          ),
        },
      ],
      { initialEntries: [initialPath] },
    );
    render(<RouterProvider router={router} />);
    return router;
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('destaque e expansão estão corretos ANTES de a metadata terminar de carregar', async () => {
    const router = setupRouterWithMetadata('/dashboard');
    expect(screen.getByTestId('metadata-loading')).toBeInTheDocument();

    await act(async () => {
      await router.navigate('/orcamentos/novo');
    });
    // Imediatamente — sem avançar timers — destaque/expansão já corretos.
    expect(isLinkActive('Novo Orçamento')).toBe(true);
    expect(isGroupExpanded()).toBe(true);
    expect(screen.getByTestId('metadata-loading')).toBeInTheDocument();

    // Avança timers até a metadata resolver. Estado visual da sidebar NÃO muda.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      vi.advanceTimersByTime(60);
    });
    expect(screen.getByTestId('metadata-ready')).toBeInTheDocument();
    expect(isLinkActive('Novo Orçamento')).toBe(true);
    expect(isGroupExpanded()).toBe(true);
  });

  it('ao trocar rota antes da metadata resolver, o destaque acompanha a rota corrente (não a antiga)', async () => {
    const router = setupRouterWithMetadata('/dashboard');

    await act(async () => {
      await router.navigate('/orcamentos/novo');
    });
    expect(isLinkActive('Novo Orçamento')).toBe(true);

    // Antes de a metadata resolver, troca para /carrinhos.
    await act(async () => {
      await router.navigate('/carrinhos');
    });
    expect(isLinkActive('Carrinhos')).toBe(true);
    expect(isLinkActive('Novo Orçamento')).toBe(false);
    expect(isGroupExpanded()).toBe(true);

    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      vi.advanceTimersByTime(60);
    });
    // Metadata da rota antiga "vazou"? Não — destaque continua em Carrinhos.
    expect(isLinkActive('Carrinhos')).toBe(true);
    expect(isLinkActive('Novo Orçamento')).toBe(false);
  });
});
