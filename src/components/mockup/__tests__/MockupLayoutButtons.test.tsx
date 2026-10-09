import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MockupLayoutButtons } from '../approval/MockupLayoutButtons';
import { LogoPositionEditor } from '../LogoPositionEditor';

const toastError = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn(), warning: vi.fn() } }));

vi.mock('../approval/MockupApprovalPreview', () => ({
  MockupApprovalPreview: ({ open }: { open: boolean }) =>
    open ? <div data-testid="approval-preview" /> : null,
}));

// Filhos pesados do editor (canvas/imagens) não interessam aqui: o que importa é o cabeçalho
// onde a página injeta os botões via headerActions.
vi.mock('@/hooks/products', () => ({
  useProductBounds: () => ({ fractionX: 1, fractionY: 1 }),
}));
vi.mock('../logo-editor/LogoPreviewCanvas', () => ({ LogoPreviewCanvas: () => null }));
vi.mock('../logo-editor/LogoQuickActions', () => ({ LogoQuickActions: () => null }));
vi.mock('../logo-editor/LogoSizeControls', () => ({ LogoSizeControls: () => null }));

const baseProps = {
  generatedMockup: null as string | null,
  product: { name: 'Caneca' },
  technique: { name: 'Silk' },
  client: null,
  seller: null,
  activeArea: {
    logoWidth: 3,
    logoHeight: 3,
    logoPreview: 'data:image/png;base64,logo',
    positionX: 50,
    positionY: 50,
    name: 'Frente',
  },
};

type Props = React.ComponentProps<typeof MockupLayoutButtons>;

function ui(props: Props) {
  return (
    <TooltipProvider>
      <MockupLayoutButtons {...props} />
    </TooltipProvider>
  );
}

function setup(over: Partial<Props> = {}) {
  const onGenerateMockup = vi.fn().mockResolvedValue(undefined);
  const props: Props = { ...baseProps, onGenerateMockup, ...over };
  const utils = render(ui(props));
  return { onGenerateMockup, props, ...utils };
}

const btn = (name: RegExp) => screen.getByRole('button', { name });

describe('MockupLayoutButtons — Gerar Mockup / Gerar documento', () => {
  beforeEach(() => toastError.mockReset());

  it('Gerar Mockup chama a geração e NÃO abre o documento', async () => {
    const { onGenerateMockup } = setup();
    fireEvent.click(btn(/Gerar Mockup/));
    await waitFor(() => expect(onGenerateMockup).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('approval-preview')).toBeNull();
  });

  it('não abre o documento quando o mockup chega DEPOIS do clique em Gerar Mockup', async () => {
    const { onGenerateMockup, props, rerender } = setup();
    fireEvent.click(btn(/Gerar Mockup/));
    await waitFor(() => expect(onGenerateMockup).toHaveBeenCalledTimes(1));
    // o hook entrega o mockup: o componente recebe generatedMockup preenchido
    await act(() => {
      rerender(ui({ ...props, generatedMockup: 'https://cdn.example/mockup.png' }));
    });
    expect(screen.queryByTestId('approval-preview')).toBeNull();
    // e o documento passa a estar disponível só pelo botão próprio
    expect(btn(/Gerar documento/)).toBeEnabled();
  });

  it('avisa o usuário (toast.error) quando a geração rejeita', async () => {
    const onGenerateMockup = vi.fn().mockRejectedValue(new Error('falhou'));
    setup({ onGenerateMockup });
    fireEvent.click(btn(/Gerar Mockup/));
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastError.mock.calls[0][0]).toMatch(/Erro ao gerar mockup/);
    expect(screen.queryByTestId('approval-preview')).toBeNull();
  });

  it('Gerar documento fica desabilitado sem mockup pronto', () => {
    setup({ generatedMockup: null });
    expect(btn(/Gerar documento/)).toBeDisabled();
  });

  it('Gerar documento fica desabilitado durante a geração, mesmo com mockup anterior', () => {
    setup({ generatedMockup: 'https://cdn.example/mockup.png', isGeneratingMockup: true });
    expect(btn(/Gerar documento/)).toBeDisabled();
  });

  it('Gerar documento habilitado com mockup pronto abre o documento sem gerar de novo', () => {
    const { onGenerateMockup } = setup({ generatedMockup: 'https://cdn.example/mockup.png' });
    const b = btn(/Gerar documento/);
    expect(b).toBeEnabled();
    fireEvent.click(b);
    expect(screen.getByTestId('approval-preview')).toBeInTheDocument();
    expect(onGenerateMockup).not.toHaveBeenCalled();
  });

  it('Gerar Mockup fica desabilitado sem logo', () => {
    setup({ activeArea: { ...baseProps.activeArea, logoPreview: null } });
    expect(btn(/Gerar Mockup/)).toBeDisabled();
  });

  it('Gerar Mockup fica desabilitado durante a geração', () => {
    setup({ isGeneratingMockup: true });
    expect(btn(/Gerar Mockup/)).toBeDisabled();
  });

  it('composição estática (Gerar Layout) continua disponível', () => {
    setup();
    expect(btn(/Gerar Layout/)).toBeEnabled();
  });

  it('nenhum texto "IA" nos botões', () => {
    setup({ generatedMockup: 'https://cdn.example/mockup.png' });
    for (const name of [/Gerar Mockup/, /Gerar documento/, /Gerar Layout/]) {
      expect(btn(name).textContent).not.toMatch(/\bIA\b/);
    }
  });
});

describe('Página do gerador — botões no mobile', () => {
  // classes que escondem em telas pequenas (mobile-first: sem prefixo = mobile)
  const HIDES_ON_MOBILE = /(^|[\s"])(hidden|invisible|sr-only)([\s"]|$)/;

  it('MockupGenerator injeta os botões no cabeçalho do LogoPositionEditor sem wrapper responsivo', () => {
    const src = readFileSync(resolve(__dirname, '../../../pages/mockups/MockupGenerator.tsx'), 'utf8');
    const m = /headerActions=\{\s*<MockupLayoutButtons\b/.exec(src);
    expect(m).not.toBeNull();
    // nenhuma das divs que envolvem o editor na página esconde no mobile
    const start = src.indexOf('<TabsContent value="generator">');
    const editor = src.indexOf('<LogoPositionEditor');
    const ancestors = src.slice(start, editor).match(/className="[^"]*"/g) ?? [];
    expect(ancestors.length).toBeGreaterThan(0);
    for (const cls of ancestors) expect(cls).not.toMatch(HIDES_ON_MOBILE);
  });

  it('com o editor real (pai na página), os 3 botões renderizam sem ancestral escondido', () => {
    window.innerWidth = 375;
    render(
      <TooltipProvider>
        <LogoPositionEditor
          productImageUrl="https://cdn.example/produto.png"
          logoPreview="data:image/png;base64,logo"
          positionX={50}
          positionY={50}
          logoWidth={3}
          logoHeight={3}
          onPositionChange={vi.fn()}
          onSizeChange={vi.fn()}
          headerActions={
            <MockupLayoutButtons
              {...baseProps}
              generatedMockup="https://cdn.example/mockup.png"
              onGenerateMockup={vi.fn().mockResolvedValue(undefined)}
            />
          }
        />
      </TooltipProvider>,
    );
    for (const name of [/Gerar Mockup/, /Gerar documento/, /Gerar Layout/]) {
      let el: HTMLElement | null = btn(name);
      while (el) {
        expect(el.getAttribute('class') ?? '').not.toMatch(HIDES_ON_MOBILE);
        el = el.parentElement;
      }
    }
  });
});
