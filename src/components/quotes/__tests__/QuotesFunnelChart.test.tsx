/**
 * QuotesFunnelChart — render do funil de orçamentos.
 *
 * Cobre:
 *  1) as 5 etapas aparecem com rótulo e contagem;
 *  2) a taxa entre etapas é exibida (e omitida na 1ª etapa, que não tem anterior);
 *  3) estado vazio (total=0) mostra "Nenhum dado disponível", não barras zeradas;
 *  4) KPI de ciclo médio só aparece quando há ciclo calculado.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QuotesFunnelChart } from '../QuotesFunnelChart';
import type { QuoteFunnelData } from '@/hooks/quotes';

const fullFunnel: QuoteFunnelData = {
  total: 10,
  avgCycleDays: 3.25,
  stages: [
    { id: 'created', label: 'Criados', count: 10, rateFromPrev: null },
    { id: 'sent', label: 'Enviado', count: 8, rateFromPrev: 80 },
    { id: 'viewed', label: 'Visualizado', count: 4, rateFromPrev: 50 },
    { id: 'approved', label: 'Aprovado', count: 1, rateFromPrev: 25 },
    { id: 'converted', label: 'Convertido', count: 0, rateFromPrev: 0 },
  ],
};

function renderChart(data: QuoteFunnelData) {
  return render(
    <TooltipProvider>
      <QuotesFunnelChart data={data} />
    </TooltipProvider>,
  );
}

describe('QuotesFunnelChart', () => {
  it('renderiza as 5 etapas com rótulo e contagem', () => {
    renderChart(fullFunnel);
    for (const stage of fullFunnel.stages) {
      expect(screen.getByTestId(`funnel-stage-${stage.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`funnel-count-${stage.id}`)).toHaveTextContent(String(stage.count));
      expect(screen.getByText(stage.label)).toBeInTheDocument();
    }
  });

  it('mostra a taxa entre etapas e omite na primeira (sem etapa anterior)', () => {
    renderChart(fullFunnel);
    expect(screen.queryByTestId('funnel-rate-created')).toBeNull();
    expect(screen.getByTestId('funnel-rate-sent')).toHaveTextContent('80%');
    expect(screen.getByTestId('funnel-rate-viewed')).toHaveTextContent('50%');
    expect(screen.getByTestId('funnel-rate-approved')).toHaveTextContent('25%');
    expect(screen.getByTestId('funnel-rate-converted')).toHaveTextContent('0%');
  });

  it('estado vazio: total=0 mostra aviso e nenhuma barra', () => {
    renderChart({ total: 0, avgCycleDays: null, stages: [] });
    expect(screen.getByTestId('quotes-funnel-empty')).toHaveTextContent('Nenhum dado disponível');
    expect(screen.queryByTestId('funnel-stage-created')).toBeNull();
  });

  it('estado vazio tambem quando ha etapas zeradas (total=0)', () => {
    renderChart({
      total: 0,
      avgCycleDays: null,
      stages: fullFunnel.stages.map((s) => ({ ...s, count: 0, rateFromPrev: s.rateFromPrev })),
    });
    expect(screen.getByTestId('quotes-funnel-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('funnel-count-sent')).toBeNull();
  });

  it('ciclo medio: exibido quando ha valor, omitido quando null', () => {
    const { unmount } = renderChart(fullFunnel);
    expect(screen.getByTestId('quotes-funnel-cycle')).toHaveTextContent('3.3d');
    unmount();
    renderChart({ ...fullFunnel, avgCycleDays: null });
    expect(screen.queryByTestId('quotes-funnel-cycle')).toBeNull();
  });
});
