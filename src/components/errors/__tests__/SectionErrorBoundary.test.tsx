import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectionErrorBoundary } from '../SectionErrorBoundary';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/services/telemetryService', () => ({
  telemetryService: { logError: vi.fn(), captureError: vi.fn(), track: vi.fn() },
}));
vi.mock('@/lib/error-reporter', () => ({ reportError: vi.fn() }));

function Boom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('RLS denied: permission for relation orders');
  return <div>conteúdo-ok</div>;
}

describe('SectionErrorBoundary — degradação parcial', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('renderiza filhos normalmente quando não há erro', () => {
    render(
      <SectionErrorBoundary section="kpis" label="os indicadores">
        <Boom shouldThrow={false} />
      </SectionErrorBoundary>,
    );
    expect(screen.getByText('conteúdo-ok')).toBeInTheDocument();
  });

  it('mostra fallback local (sem derrubar irmãos) quando o bloco falha', () => {
    render(
      <div>
        <SectionErrorBoundary section="kpis" label="os indicadores">
          <Boom shouldThrow />
        </SectionErrorBoundary>
        <SectionErrorBoundary section="sales" label="as vendas">
          <div>irmao-vivo</div>
        </SectionErrorBoundary>
      </div>,
    );
    expect(screen.getByText(/Não foi possível carregar os indicadores/i)).toBeInTheDocument();
    expect(screen.getByText('irmao-vivo')).toBeInTheDocument();
  });

  it('não vaza a mensagem técnica do erro no fallback', () => {
    render(
      <SectionErrorBoundary section="kpis" label="os indicadores">
        <Boom shouldThrow />
      </SectionErrorBoundary>,
    );
    expect(screen.queryByText(/RLS denied/i)).not.toBeInTheDocument();
  });

  it('retry local remonta apenas o bloco afetado', () => {
    let shouldThrow = true;
    function Flaky() {
      if (shouldThrow) throw new Error('timeout');
      return <div>recuperado</div>;
    }
    render(
      <SectionErrorBoundary section="market-chart" label="a inteligência de mercado">
        <Flaky />
      </SectionErrorBoundary>,
    );
    expect(screen.getByTestId('section-retry-market-chart')).toBeInTheDocument();
    shouldThrow = false;
    fireEvent.click(screen.getByTestId('section-retry-market-chart'));
    expect(screen.getByText('recuperado')).toBeInTheDocument();
  });

  it('expõe região acessível rotulada para leitores de tela', () => {
    render(
      <SectionErrorBoundary section="kpis" label="os indicadores">
        <Boom shouldThrow />
      </SectionErrorBoundary>,
    );
    expect(
      screen.getByRole('region', { name: /Falha ao carregar os indicadores/i }),
    ).toBeInTheDocument();
  });
});
