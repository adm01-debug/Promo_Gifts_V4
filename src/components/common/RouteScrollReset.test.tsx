import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import { RouteScrollReset } from './RouteScrollReset';

vi.mock('@/lib/dom/scroll-lock', () => ({ forceReleaseScrollLock: vi.fn() }));
vi.mock('@/lib/telemetry/navigationMetrics', () => ({ notifyRouteChange: vi.fn() }));

let navigateRef: ReturnType<typeof useNavigate>;
let setParamsRef: ReturnType<typeof useSearchParams>[1];

function Probe() {
  navigateRef = useNavigate();
  [, setParamsRef] = useSearchParams();
  return null;
}

/**
 * Simula páginas como FiltersPage (/produtos, /filtros), que normalizam a
 * query string com `setSearchParams(..., { replace: true })` logo no mount.
 */
function ReplaceOnMount() {
  const [, setSearchParams] = useSearchParams();
  useEffect(() => {
    setSearchParams(new URLSearchParams({ viewMode: 'list' }), { replace: true });
  }, [setSearchParams]);
  return null;
}

function renderAt(path: string, pageElement: React.ReactNode = <Probe />) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RouteScrollReset />
      <Routes>
        <Route path="*" element={pageElement} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RouteScrollReset', () => {
  let scrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('não rola no primeiro mount', () => {
    renderAt('/produtos');
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('não rola quando só a query string muda na mesma rota (setSearchParams replace)', () => {
    renderAt('/produtos', <ReplaceOnMount />);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('não rola em setSearchParams após navegação para a mesma rota', () => {
    renderAt('/produtos');
    act(() => setParamsRef(new URLSearchParams({ q: 'caneta' }), { replace: true }));
    act(() => setParamsRef(new URLSearchParams({ q: 'caneta', sortBy: 'price' })));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('rola ao topo quando o pathname muda (PUSH)', () => {
    renderAt('/produtos');
    act(() => navigateRef('/orcamentos'));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0, left: 0 }));
  });

  it('não rola em POP (voltar) nem com hash âncora', () => {
    renderAt('/produtos');
    act(() => navigateRef('/orcamentos#detalhes'));
    expect(scrollTo).not.toHaveBeenCalled();
    act(() => navigateRef(-1));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
