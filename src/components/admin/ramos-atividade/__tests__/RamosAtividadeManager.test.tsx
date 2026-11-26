import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { resumirRamos, type RamoComSegmentos } from '@/lib/crm/ramos-catalogo';
import type { RamoAtividade, RamoAtividadeFilho } from '@/types/ramo-atividade';
import { RamosAtividadeManager } from '../RamosAtividadeManager';

function ramo(
  over: Partial<RamoAtividade> & Pick<RamoAtividade, 'id' | 'nome' | 'slug'>,
): RamoAtividade {
  return { descricao: null, icone: 'building', cor: '#6366f1', ativo: true, ordem: 1, ...over };
}

function segmento(
  over: Partial<RamoAtividadeFilho> &
    Pick<RamoAtividadeFilho, 'id' | 'nome' | 'ramo_atividade_id' | 'slug'>,
): RamoAtividadeFilho {
  return { descricao: null, icone: null, ativo: true, ordem: 1, ...over };
}

const RAMO_ALIMENTACAO = ramo({ id: 'ramo-1', nome: 'Alimentacao', slug: 'alimentacao' });
const RAMO_SERVICOS = ramo({
  id: 'ramo-2',
  nome: 'Servicos',
  slug: 'servicos',
  ativo: false,
  ordem: 2,
});
const SEG_BAR = segmento({
  id: 'seg-1',
  nome: 'Bar',
  slug: 'bar',
  ramo_atividade_id: 'ramo-1',
});
const SEG_PADARIA = segmento({
  id: 'seg-2',
  nome: 'Padaria',
  slug: 'padaria',
  ramo_atividade_id: 'ramo-1',
  ativo: false,
});
const SEG_GRAFICA = segmento({
  id: 'seg-3',
  nome: 'Grafica',
  slug: 'grafica',
  ramo_atividade_id: 'ramo-2',
});

const ARVORE: RamoComSegmentos[] = [
  { ramo: RAMO_ALIMENTACAO, segmentos: [SEG_BAR, SEG_PADARIA] },
  { ramo: RAMO_SERVICOS, segmentos: [SEG_GRAFICA] },
];

const CONTAGENS = new Map<string, number>([
  ['seg-1', 4],
  ['seg-2', 3],
  ['seg-3', 1],
]);

const estado = vi.hoisted(() => ({
  arvore: [] as RamoComSegmentos[],
  isLoading: false,
  isError: false,
  contagens: new Map<string, number>(),
  conferindoVinculos: false,
  refetch: vi.fn(),
}));

const mutacoes = vi.hoisted(() => ({
  excluirRamo: vi.fn(),
  excluirSegmento: vi.fn(),
  alternarRamo: vi.fn(),
  alternarSegmento: vi.fn(),
}));

// O resumo sai da regra real (`resumirRamos`) para o teste nao fixar numeros a mao;
// a chamada acontece no render, quando todos os modulos ja foram avaliados.
vi.mock('@/hooks/crm/useRamosAdministracao', () => ({
  useRamosAdministracao: () => ({
    arvore: estado.arvore,
    resumo: resumirRamos(estado.arvore),
    isLoading: estado.isLoading,
    isError: estado.isError,
    refetch: estado.refetch,
  }),
  useImpactoProdutos: () => ({
    contagens: estado.contagens,
    isLoading: estado.conferindoVinculos,
  }),
}));

vi.mock('@/hooks/crm/useRamoAtividade', () => ({
  useCreateRamoAtividade: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRamoAtividade: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteRamoAtividade: () => ({ mutateAsync: mutacoes.excluirRamo, isPending: false }),
  useToggleRamoAtividade: () => ({ mutate: mutacoes.alternarRamo, isPending: false }),
}));

vi.mock('@/hooks/crm/useRamoAtividadeFilho', () => ({
  useCreateSegmento: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateSegmento: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteSegmento: () => ({ mutateAsync: mutacoes.excluirSegmento, isPending: false }),
  useToggleSegmento: () => ({ mutate: mutacoes.alternarSegmento, isPending: false }),
}));

function renderManager() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TooltipProvider delayDuration={0}>
          <RamosAtividadeManager />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RamosAtividadeManager', () => {
  beforeEach(() => {
    estado.arvore = ARVORE;
    estado.isLoading = false;
    estado.isError = false;
    estado.contagens = CONTAGENS;
    estado.conferindoVinculos = false;
    vi.clearAllMocks();
  });

  it('mostra o resumo e a arvore, com os segmentos ao expandir o ramo', async () => {
    const user = userEvent.setup();
    renderManager();

    const resumo = within(screen.getByTestId('ramos-resumo'));
    expect(resumo.getByText('Ramos')).toBeTruthy();
    expect(resumo.getByText('1 ativos · 1 inativos')).toBeTruthy();
    expect(resumo.getByText('2 ativos · 1 inativos')).toBeTruthy();
    expect(resumo.getByText('Nao classificam nenhum produto')).toBeTruthy();

    expect(screen.getByTestId('ramo-item-alimentacao')).toBeTruthy();
    expect(screen.getByTestId('ramo-item-servicos')).toBeTruthy();

    await user.click(screen.getByTestId('ramo-item-alimentacao'));

    const lista = within(screen.getByTestId('ramo-segmentos-alimentacao'));
    expect(lista.getByText('Bar')).toBeTruthy();
    expect(lista.getByText('Padaria')).toBeTruthy();
  });

  it('filtra a arvore pela busca e mostra o vazio quando nada casa', async () => {
    const user = userEvent.setup();
    renderManager();

    await user.type(screen.getByTestId('ramos-busca'), 'grafica');

    expect(screen.queryByTestId('ramo-item-alimentacao')).toBeNull();
    expect(screen.getByTestId('ramo-item-servicos')).toBeTruthy();

    await user.clear(screen.getByTestId('ramos-busca'));
    await user.type(screen.getByTestId('ramos-busca'), 'zzz');

    expect(screen.getByTestId('ramos-vazio')).toBeTruthy();
    expect(screen.getByText('Nenhum ramo ou segmento corresponde a busca.')).toBeTruthy();
  });

  it('oculta ramos inativos ao desligar "Incluir inativos"', async () => {
    const user = userEvent.setup();
    renderManager();

    await user.click(screen.getByTestId('ramos-incluir-inativos'));

    expect(screen.queryByTestId('ramo-item-servicos')).toBeNull();
    expect(screen.getByTestId('ramo-item-alimentacao')).toBeTruthy();
  });

  it('avisa o cascade do ramo com a contagem real e envia o id ao confirmar', async () => {
    const user = userEvent.setup();
    renderManager();

    await user.click(screen.getByTestId('ramo-item-alimentacao'));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    const dialogo = within(screen.getByTestId('ramos-exclusao'));
    const impacto = within(dialogo.getByTestId('ramos-exclusao-impact'));
    expect(
      impacto.getByText('2 segmentos são apagados junto com o ramo (vínculo em cascata).'),
    ).toBeTruthy();
    expect(
      impacto.getByText('1 segmento ativo deixa de aparecer no filtro de nichos da loja.'),
    ).toBeTruthy();
    expect(
      impacto.getByText('7 vínculos de produto são apagados — o produto fica sem este nicho.'),
    ).toBeTruthy();
    expect(impacto.getByText('Esta ação não pode ser desfeita.')).toBeTruthy();

    await user.click(dialogo.getByTestId('ramos-exclusao-yes'));

    expect(mutacoes.excluirRamo).toHaveBeenCalledWith('ramo-1');
  });

  it('avisa o impacto do segmento e envia o id ao confirmar', async () => {
    const user = userEvent.setup();
    renderManager();

    await user.click(screen.getByTestId('ramo-item-servicos'));
    await user.click(screen.getByRole('button', { name: 'Excluir Grafica' }));

    const dialogo = within(screen.getByTestId('ramos-exclusao'));
    const impacto = within(dialogo.getByTestId('ramos-exclusao-impact'));
    expect(
      impacto.getByText('1 vínculo de produto é apagado — o produto fica sem este nicho.'),
    ).toBeTruthy();

    await user.click(dialogo.getByTestId('ramos-exclusao-yes'));

    expect(mutacoes.excluirSegmento).toHaveBeenCalledWith('seg-3');
  });

  it('mostra o erro com retry quando a consulta falha', async () => {
    estado.isError = true;
    renderManager();

    expect(screen.getByText('Nao foi possivel carregar ramos e segmentos.')).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(estado.refetch).toHaveBeenCalled();
  });
});
