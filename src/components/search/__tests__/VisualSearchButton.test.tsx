import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  toast: vi.fn(),
  invokeEdge: vi.fn(),
}));

// AnimatePresence mode="wait" nunca conclui a animação de saída no jsdom.
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const Div = ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    React.createElement('div', { className }, children);
  return {
    m: { div: Div },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  };
});
vi.mock('@/hooks/ui', () => ({ useToast: () => ({ toast: h.toast }) }));
vi.mock('@/lib/edge/safeInvokeCall', () => ({ invokeEdge: h.invokeEdge }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { VisualSearchButton } from '../VisualSearchButton';

function imageFile(name = 'foto.png', size = 10) {
  const file = new File(['x'.repeat(size)], name, { type: 'image/png' });
  return file;
}

function openDialog() {
  const onResultsFound = vi.fn();
  render(<VisualSearchButton onResultsFound={onResultsFound} />);
  fireEvent.click(screen.getByLabelText('Câmera'));
  const input = document.getElementById('visual-search-input') as HTMLInputElement;
  return { onResultsFound, input };
}

describe('VisualSearchButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('abre o diálogo de busca visual', () => {
    openDialog();
    expect(screen.getByText('Busca Visual com IA')).toBeInTheDocument();
    expect(screen.getByText('Arraste uma imagem ou clique para selecionar')).toBeInTheDocument();
  });

  it('rejeita arquivo que não é imagem', () => {
    const { input } = openDialog();
    fireEvent.change(input, { target: { files: [new File(['a'], 'a.txt', { type: 'text/plain' })] } });
    expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Arquivo inválido' }));
    expect(h.invokeEdge).not.toHaveBeenCalled();
  });

  it('rejeita imagem maior que 10MB', () => {
    const { input } = openDialog();
    const big = imageFile();
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [big] } });
    expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Arquivo muito grande' }));
  });

  it('envia a imagem para a IA e devolve os produtos encontrados', async () => {
    const products = [{ id: 'p1', name: 'Caneca' }];
    const analysis = { productType: 'caneca' };
    h.invokeEdge.mockResolvedValue({ data: { products, analysis }, error: null });
    const { input, onResultsFound } = openDialog();
    fireEvent.change(input, { target: { files: [imageFile()] } });
    await waitFor(() => expect(onResultsFound).toHaveBeenCalledWith(products, analysis));
    expect(h.invokeEdge).toHaveBeenCalledWith('visual-search', {
      body: { imageBase64: expect.stringMatching(/^data:image\/png;base64,/) },
    });
    expect(h.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Busca concluída!', description: 'Encontrados 1 produtos similares.' }),
    );
    await waitFor(() => expect(screen.queryByText('Busca Visual com IA')).not.toBeInTheDocument());
  });

  it('mostra erro da IA, permite tentar de novo e limpar a prévia', async () => {
    h.invokeEdge.mockResolvedValueOnce({ data: { error: 'falhou' }, error: null });
    const { input, onResultsFound } = openDialog();
    fireEvent.change(input, { target: { files: [imageFile()] } });
    const retry = await screen.findByText('Buscar Produtos Similares');
    expect(h.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Erro na busca visual', variant: 'destructive' }),
    );
    expect(screen.getByAltText('Preview')).toBeInTheDocument();

    h.invokeEdge.mockResolvedValueOnce({ data: null, error: new Error('rede') });
    fireEvent.click(retry);
    await waitFor(() => expect(h.invokeEdge).toHaveBeenCalledTimes(2));
    expect(onResultsFound).not.toHaveBeenCalled();

    const close = await screen.findAllByLabelText('Fechar');
    fireEvent.click(close[0]);
    await waitFor(() => expect(screen.queryByAltText('Preview')).not.toBeInTheDocument());
  });

  it('arrastar e soltar imagem dispara a busca', async () => {
    h.invokeEdge.mockResolvedValue({ data: null, error: null });
    const { onResultsFound } = openDialog();
    const label = screen.getByText('Arraste uma imagem ou clique para selecionar').closest('label') as HTMLElement;
    fireEvent.dragEnter(label);
    expect(label.className).toContain('border-brand-primary bg-brand-primary/10');
    fireEvent.dragLeave(label);
    expect(label.className).not.toContain('bg-brand-primary/10');
    fireEvent.dragOver(label);
    fireEvent.drop(label, { dataTransfer: { files: [imageFile()] } });
    await waitFor(() => expect(onResultsFound).toHaveBeenCalledWith([], {}));
  });
});
