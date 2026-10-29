/**
 * Matriz de aceite do Mockup — GRUPO 5 (A11–A13): remoção, atalhos e teclado.
 * Um teste por cenário, nomeado com o ID; fixtures fixas em ./grupo5.fixtures.ts
 * (nunca marca/cliente real). Só entra comportamento que JÁ passa hoje; cenário
 * dependente de correção não integrada fica como PENDENTE no relato do cartão.
 *   A11 — remover o logo de área NÃO ativa altera só o alvo (MultiAreaManager).
 *   A12 — Esc fecha a camada (MockupLightbox); "recarregar" reabre o rascunho
 *         salvo em vez de apagá-lo (useMockupDraft).
 *   A13 — busca por digitação (ProductSearchCombobox), upload por seletor de
 *         arquivo (AreaCard) e posição sem arrastar (LogoQuickActions).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

/**
 * Este runner não expõe `localStorage` (global experimental do Node desabilitado
 * sem --localstorage-file). Fornecemos um `Storage` em memória com a semântica do
 * browser para exercitar a persistência do rascunho — nenhuma lógica do hook muda.
 */
function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
  } as Storage;
}

// Observação (não é o comportamento testado): sonner com `warning`/`info`,
// ausentes pontualmente no helper global.
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  }),
  Toaster: () => null,
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
// `useMockupDraft` usa o usuário para montar a chave e consultar o backend —
// aqui o caminho é o armazenamento local (sem sessão), então o usuário é nulo.
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

import { MultiAreaManager, type PersonalizationArea } from '@/components/mockup/MultiAreaManager';
import { ProductSearchCombobox } from '@/components/mockup/ProductSearchCombobox';
import { LogoQuickActions } from '@/components/mockup/logo-editor/LogoQuickActions';
import { MockupLightbox } from '@/components/mockup/MockupLightbox';
import { TooltipProvider } from '@/components/ui/tooltip';
import { renderHookWithProviders } from '../../../hooks/_helpers/render-hook-providers';
import { useMockupDraft, type MockupDraftData } from '@/hooks/mockup/useMockupDraft';
import {
  MARCA_FIXTURE_URL,
  MOCKUP_LIGHTBOX,
  AREA_ATIVA,
  AREA_NAO_ATIVA,
  AREA_SEM_LOGO,
  makePngFixture,
  RASCUNHO_FIXTURE,
  PRODUTO_BUSCA,
} from './grupo5.fixtures';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('localStorage', createMemoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── A11 — remover logo de área não ativa altera só o alvo ───────────

describe('A11 — remover logo de área não ativa altera só o alvo', () => {
  it('A11 — remover o logo da área inativa zera apenas aquela área; a ativa e a seleção seguem intactas', () => {
    const onAreasChange = vi.fn();
    const onActiveAreaChange = vi.fn();
    const onLogoUpload = vi.fn();
    const onLogoRemove = vi.fn();

    render(
      <MultiAreaManager
        areas={[AREA_ATIVA, AREA_NAO_ATIVA]}
        activeAreaId={AREA_ATIVA.id}
        onAreasChange={onAreasChange}
        onActiveAreaChange={onActiveAreaChange}
        onLogoUpload={onLogoUpload}
        onLogoRemove={onLogoRemove}
      />,
    );

    // O alvo é a área NÃO ativa: a área ativa é a testemunha.
    fireEvent.click(screen.getByRole('button', { name: `Remover logo de ${AREA_NAO_ATIVA.name}` }));

    expect(onAreasChange).toHaveBeenCalledTimes(1);
    const atualizadas = onAreasChange.mock.calls[0][0] as PersonalizationArea[];
    const inativa = atualizadas.find((a) => a.id === AREA_NAO_ATIVA.id);
    const ativa = atualizadas.find((a) => a.id === AREA_ATIVA.id);

    // Só o alvo foi limpo...
    expect(inativa?.logoPreview).toBeNull();
    expect(onLogoRemove).toHaveBeenCalledWith(AREA_NAO_ATIVA.id);
    // ...e a área ativa (não alvo) manteve logo e geometria — nada além do alvo mudou.
    expect(ativa?.logoPreview).toBe(MARCA_FIXTURE_URL);
    expect(ativa?.positionX).toBe(AREA_ATIVA.positionX);
    expect(ativa?.positionY).toBe(AREA_ATIVA.positionY);
    expect(ativa?.logoWidth).toBe(AREA_ATIVA.logoWidth);
    expect(ativa?.logoHeight).toBe(AREA_ATIVA.logoHeight);
    // A remoção do logo de outra área não troca a área ativa.
    expect(onActiveAreaChange).not.toHaveBeenCalled();
  });
});

// ─── A12 — Esc fecha camada e recarregar não apaga o rascunho ────────

describe('A12 — Esc fecha camada e recarregar não apaga o rascunho', () => {
  it('A12 — a tecla Esc fecha a camada ampliada (lightbox)', async () => {
    const onClose = vi.fn();

    // Parente com estado: fechar de verdade desmonta a camada (como na página).
    function LightboxController() {
      const [aberto, setAberto] = React.useState(true);
      return (
        <MockupLightbox
          mockup={aberto ? MOCKUP_LIGHTBOX : null}
          onClose={() => {
            onClose();
            setAberto(false);
          }}
          onLoadFromHistory={vi.fn()}
          onDownload={vi.fn()}
        />
      );
    }

    render(<LightboxController />);

    // A camada está aberta e visível.
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('A12 — "recarregar" reabre o rascunho salvo (produto, cliente, técnica e áreas) em vez de apagá-lo', async () => {
    // 1) Sessão de edição: grava o rascunho no armazenamento local.
    const primeira = renderHookWithProviders(() => useMockupDraft());
    await act(async () => {
      primeira.result.current.saveDraft(RASCUNHO_FIXTURE);
    });
    expect(localStorage.length).toBeGreaterThan(0);
    primeira.unmount();

    // 2) "Recarregar": instância NOVA do hook sobre o mesmo armazenamento.
    const segunda = renderHookWithProviders(() => useMockupDraft());
    const caixa: { reaberto: MockupDraftData | null } = { reaberto: null };
    await act(async () => {
      caixa.reaberto = await segunda.result.current.loadDraft();
    });
    const { reaberto } = caixa;

    // O rascunho sobreviveu ao recarregar — nada foi apagado.
    expect(reaberto).not.toBeNull();
    expect(reaberto?.productId).toBe(RASCUNHO_FIXTURE.productId);
    expect(reaberto?.techniqueId).toBe(RASCUNHO_FIXTURE.techniqueId);
    expect(reaberto?.clientId).toBe(RASCUNHO_FIXTURE.clientId);
    expect(reaberto?.personalizationAreas).toHaveLength(1);
    expect(reaberto?.personalizationAreas[0].logoPreview).toBe(MARCA_FIXTURE_URL);
    expect(reaberto?.personalizationAreas[0].positionX).toBe(
      RASCUNHO_FIXTURE.personalizationAreas[0].positionX,
    );
    // E continua persistido depois da releitura (o reload não consumiu o rascunho).
    expect(localStorage.length).toBeGreaterThan(0);
  });
});

// ─── A13 — busca, upload e posição sem arrastar ──────────────────────

describe('A13 — busca, upload e posição sem arrastar', () => {
  it('A13 — a busca por digitação consulta o servidor e seleciona o produto sem arrastar', async () => {
    const onSearchChange = vi.fn();
    const onSelect = vi.fn();

    const { rerender } = render(
      <ProductSearchCombobox
        products={[]}
        search=""
        onSearchChange={onSearchChange}
        selectedProduct={null}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByTestId('mockup-product-combobox-trigger'));

    const input = await screen.findByTestId('mockup-product-search-input');
    fireEvent.change(input, { target: { value: 'FIXTURE' } });
    expect(onSearchChange).toHaveBeenCalledWith('FIXTURE');

    // O caller devolve os resultados do servidor para o termo atual.
    rerender(
      <ProductSearchCombobox
        products={[PRODUTO_BUSCA]}
        search="FIXTURE"
        onSearchChange={onSearchChange}
        selectedProduct={null}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(await screen.findByTestId(`mockup-product-option-${PRODUTO_BUSCA.id}`));
    expect(onSelect).toHaveBeenCalledWith(PRODUTO_BUSCA);
    // Selecionar aplica o produto e limpa o termo de busca.
    expect(onSearchChange).toHaveBeenLastCalledWith('');
  });

  it('A13 — enviar o logo pelo seletor de arquivo aplica na área certa sem arrastar', () => {
    const onLogoUpload = vi.fn();

    render(
      <MultiAreaManager
        areas={[AREA_SEM_LOGO]}
        activeAreaId={AREA_SEM_LOGO.id}
        onAreasChange={vi.fn()}
        onActiveAreaChange={vi.fn()}
        onLogoUpload={onLogoUpload}
      />,
    );

    const arquivo = makePngFixture();
    fireEvent.change(screen.getByTestId(`mockup-logo-upload-input-${AREA_SEM_LOGO.id}`), {
      target: { files: [arquivo] },
    });

    expect(onLogoUpload).toHaveBeenCalledWith(AREA_SEM_LOGO.id, arquivo);
  });

  it('A13 — centralizar o logo pelos botões não depende de arrastar', () => {
    const onPositionChange = vi.fn();

    render(
      <TooltipProvider>
        <LogoQuickActions
          logoPreview={MARCA_FIXTURE_URL}
          positionX={30}
          positionY={70}
          logoRotation={0}
          onPositionChange={onPositionChange}
        />
      </TooltipProvider>,
    );

    // Centro V: alinha só o eixo vertical ao meio, mantendo o Y atual.
    fireEvent.click(screen.getByRole('button', { name: 'Centro V' }));
    expect(onPositionChange).toHaveBeenLastCalledWith(50, 70);

    // Centro: centraliza nos dois eixos.
    fireEvent.click(screen.getByRole('button', { name: 'Centro' }));
    expect(onPositionChange).toHaveBeenLastCalledWith(50, 50);

    // Centro H: alinha só o eixo horizontal ao meio, mantendo o X atual.
    fireEvent.click(screen.getByRole('button', { name: 'Centro H' }));
    expect(onPositionChange).toHaveBeenLastCalledWith(30, 50);
  });
});
