import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  confidenceOf,
  type ClassificationApplyRow,
  type ClassificationSummary,
  type ClassificationSuggestion,
} from '@/lib/admin/classificationAudit';
import { ClassificationAuditManager } from '../ClassificationAuditManager';

interface SummaryState {
  summary: ClassificationSummary;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
}

interface ListState {
  rows: ClassificationSuggestion[];
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
}

interface ApplyState {
  apply: (dryRun: boolean, minMatches: number) => Promise<ClassificationApplyRow[]>;
  isApplying: boolean;
  error: unknown;
  lastResult: ClassificationApplyRow[] | null;
  reset: () => void;
}

const resumoVazio: ClassificationSummary = {
  totalSugestoes: 0,
  naoAtribuidas: 0,
  kitsParaRevisao: 0,
  conflitos: 0,
  altaConfianca: 0,
  ultimaAnalise: null,
};

function linha(partial: Partial<ClassificationSuggestion> = {}): ClassificationSuggestion {
  return {
    id: 1,
    productId: 'p-1',
    sku: 'CAN-001',
    produto: 'Caneca Personalizada',
    isKit: false,
    categoriaSugerida: 'Brindes > Canecas',
    nivel: 3,
    matches: 4,
    score: 90,
    tokensMatched: 'caneca',
    alreadyAssigned: false,
    categoriasAtuais: '',
    materialConflict: false,
    typeConflict: false,
    approvedAuto: true,
    computedAt: '2026-11-26T12:00:00Z',
    confianca: confidenceOf(4, 3),
    ...partial,
  };
}

const summaryState = vi.hoisted<SummaryState>(() => ({
  summary: {
    totalSugestoes: 0,
    naoAtribuidas: 0,
    kitsParaRevisao: 0,
    conflitos: 0,
    altaConfianca: 0,
    ultimaAnalise: null,
  },
  isLoading: false,
  isFetching: false,
  error: null,
  refetch: vi.fn(),
}));

const listState = vi.hoisted<ListState>(() => ({
  rows: [],
  isLoading: false,
  isFetching: false,
  error: null,
  refetch: vi.fn(),
}));

const applyState = vi.hoisted<ApplyState>(() => ({
  apply: vi.fn(() => Promise.resolve<ClassificationApplyRow[]>([])),
  isApplying: false,
  error: null,
  lastResult: null,
  reset: vi.fn(),
}));

const toastSpy = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/admin/useClassificationAudit', () => ({
  useClassificationSummary: () => summaryState,
  useClassificationSuggestions: () => listState,
  useApplyClassificationSuggestions: () => applyState,
}));

vi.mock('@/hooks/ui', () => ({ useToast: () => ({ toast: toastSpy }) }));

vi.mock('@/hooks/common', () => ({ useDebouncedFilters: <T,>(value: T) => value }));

describe('ClassificationAuditManager', () => {
  beforeEach(() => {
    summaryState.summary = { ...resumoVazio };
    summaryState.isLoading = false;
    summaryState.error = null;
    listState.rows = [];
    listState.isLoading = false;
    listState.error = null;
    applyState.apply = vi.fn(() => Promise.resolve<ClassificationApplyRow[]>([]));
    applyState.isApplying = false;
    applyState.lastResult = null;
    toastSpy.mockReset();
  });

  it('mostra os KPIs da trilha de classificação', () => {
    summaryState.summary = {
      totalSugestoes: 12,
      naoAtribuidas: 7,
      kitsParaRevisao: 2,
      conflitos: 3,
      altaConfianca: 4,
      ultimaAnalise: '2026-11-26T12:00:00Z',
    };
    render(<ClassificationAuditManager />);

    expect(screen.getByTestId('classification-kpi-total')).toHaveTextContent('12');
    expect(screen.getByTestId('classification-kpi-gaps')).toHaveTextContent('7');
    expect(screen.getByTestId('classification-kpi-alta-confianca')).toHaveTextContent('4');
    expect(screen.getByTestId('classification-kpi-kits')).toHaveTextContent('2');
    expect(screen.getByTestId('classification-kpi-conflitos')).toHaveTextContent('3');
  });

  it('explica o estado vazio sem inventar dados', () => {
    render(<ClassificationAuditManager />);
    expect(screen.getByTestId('classification-empty')).toHaveTextContent('análise automática');
    expect(screen.queryByTestId('classification-row')).toBeNull();
  });

  it('desabilita a aplicação quando a trilha está vazia', () => {
    render(<ClassificationAuditManager />);
    expect(screen.getByTestId('classification-open-apply')).toBeDisabled();
  });

  it('traduz erro de permissão em mensagem de negócio', () => {
    summaryState.error = new Error('Acesso restrito a administradores.');
    render(<ClassificationAuditManager />);
    expect(screen.getByTestId('classification-error')).toHaveTextContent(
      'não tem permissão de administrador',
    );
  });

  it('lista sugestões com confiança, conflito e situação', () => {
    summaryState.summary = { ...resumoVazio, totalSugestoes: 2 };
    listState.rows = [
      linha(),
      linha({
        id: 2,
        productId: 'p-2',
        sku: 'KIT-010',
        produto: 'KIT Executivo',
        isKit: true,
        matches: 3,
        confianca: confidenceOf(3, 3),
        typeConflict: true,
        approvedAuto: false,
      }),
    ];
    render(<ClassificationAuditManager />);

    const linhas = screen.getAllByTestId('classification-row');
    expect(linhas).toHaveLength(2);
    expect(screen.getByTestId('classification-count')).toHaveTextContent('2 sugestão(ões)');
    const confiancas = screen.getAllByTestId('classification-confidence');
    expect(confiancas[0]).toHaveTextContent('Altíssima');
    expect(confiancas[1]).toHaveTextContent('Alta');
    expect(screen.getByText('Tipo')).toBeInTheDocument();
  });

  it('roda a prévia (dry-run) ao abrir e só aplica depois da confirmação', async () => {
    summaryState.summary = { ...resumoVazio, totalSugestoes: 1 };
    listState.rows = [linha()];
    const preview: ClassificationApplyRow[] = [
      {
        acao: 'DRY-RUN',
        productId: 'p-1',
        sku: 'CAN-001',
        produto: 'Caneca Personalizada',
        categoria: 'Brindes > Canecas',
        matches: 4,
        score: 90,
      },
    ];
    const apply = vi.fn((dryRun: boolean) =>
      Promise.resolve(
        dryRun ? preview : preview.map((item) => ({ ...item, acao: 'APLICADO' as const })),
      ),
    );
    applyState.apply = apply;

    render(<ClassificationAuditManager />);
    fireEvent.click(screen.getByTestId('classification-open-apply'));

    await waitFor(() => expect(apply).toHaveBeenCalledWith(true, 2));
    await waitFor(() =>
      expect(screen.getByTestId('classification-preview-row')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('classification-preview-summary')).toHaveTextContent(
      'Nada foi gravado',
    );

    fireEvent.click(screen.getByTestId('classification-apply-confirm'));
    await waitFor(() => expect(apply).toHaveBeenCalledWith(false, 2));
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Classificação aplicada' }),
      ),
    );
  });

  it('mostra mensagem própria quando a prévia não encontra candidatos', async () => {
    summaryState.summary = { ...resumoVazio, totalSugestoes: 1 };
    listState.rows = [linha()];
    applyState.apply = vi.fn(() => Promise.resolve<ClassificationApplyRow[]>([]));
    render(<ClassificationAuditManager />);

    fireEvent.click(screen.getByTestId('classification-open-apply'));
    await waitFor(() =>
      expect(screen.getByTestId('classification-preview-empty')).toHaveTextContent(
        'Nenhuma sugestão atingiu o mínimo',
      ),
    );
    expect(screen.getByTestId('classification-apply-confirm')).toBeDisabled();
  });

  it('avisa falha na aplicação sem fechar o diálogo', async () => {
    summaryState.summary = { ...resumoVazio, totalSugestoes: 1 };
    listState.rows = [linha()];
    const apply = vi.fn((dryRun: boolean) => {
      if (!dryRun) return Promise.reject(new Error('Autenticacao obrigatoria.'));
      return Promise.resolve<ClassificationApplyRow[]>([
        {
          acao: 'DRY-RUN',
          productId: 'p-1',
          sku: 'CAN-001',
          produto: 'Caneca Personalizada',
          categoria: 'Brindes > Canecas',
          matches: 4,
          score: 90,
        },
      ]);
    });
    applyState.apply = apply;
    render(<ClassificationAuditManager />);

    fireEvent.click(screen.getByTestId('classification-open-apply'));
    await waitFor(() => expect(apply).toHaveBeenCalledWith(true, 2));
    await waitFor(() =>
      expect(screen.getByTestId('classification-preview-row')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('classification-apply-confirm'));

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Falha ao aplicar', variant: 'destructive' }),
      ),
    );
    expect(screen.getByTestId('classification-apply-dialog')).toBeInTheDocument();
  });
});
