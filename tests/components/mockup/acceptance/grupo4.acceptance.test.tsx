/**
 * Matriz de aceite do Mockup — GRUPO 4 (A09–A10): rotação e edição pós-geração.
 * Fixtures fixas em `./grupo4.fixtures.ts` (nunca marca/cliente real); componentes e hooks REAIS.
 *
 * COBERTO (passa no código atual):
 * A09 — +15°, -15° e o botão do valor atual levam a logo exibida a 15° e 90° (seis passos) e de
 *       volta ao 0°, sem ângulo negativo; o tamanho nunca passa do limite da área. O botão de
 *       orientação (0°↔90°) não entra: o rótulo dele muda na n11 (v2/n11-2610082244).
 * A10 (parcial) — (a) trocar a técnica depois de gerar exige confirmação que avisa do resultado
 *       antigo e só então o invalida; (b) regerar depois de editar: a ficha traz só os dados dela.
 *
 * PENDENTE (depende de correção não integrada; NÃO vira teste agora):
 * A09 "sem corte silencioso": a logo girada/ampliada é recortada pelo `overflow-hidden` do
 *       preview e pelo `ctx.clip()` da composição estática — etapa 52 (v2/s52-2610081948).
 * A10 "editar MARCA o resultado antigo": só trocar produto/técnica ou remover a logo descarta o
 *       resultado; posição, tamanho, rotação, logo reenviada e cliente o deixam como se fosse o
 *       atual. Estado "desatualizado" + ficha do MESMO snapshot da imagem = etapas 69-70.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, renderHook, screen, act, fireEvent, waitFor } from '@testing-library/react';

// Observação (não é o comportamento testado): sonner com `warning`/`info`, ausentes
// pontualmente no helper global.
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
// Fronteira: a detecção dos limites do produto lê pixels de um canvas (inexistente no jsdom).
vi.mock('@/lib/product-bounds-detector', () => ({
  detectProductBounds: vi.fn().mockResolvedValue({
    fractionX: 0.6,
    fractionY: 0.6,
    centerX: 0.5,
    centerY: 0.5,
    detected: true,
    imageAspectRatio: 1,
  }),
}));

import { LogoPositionEditor } from '@/components/mockup/LogoPositionEditor';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TechniqueChangeDialog } from '@/pages/mockups/mockup-generator/MockupDialogs';
import { useTechniqueHandlers } from '@/pages/mockups/mockup-generator/MockupTechniqueHandlers';
import { MockupLayoutButtons } from '@/components/mockup/approval/MockupLayoutButtons';
import {
  LOGO_FIXTURE,
  MOCKUP_FIXTURE_URL,
  MOCKUP_FIXTURE_URL_B,
  CLIENTE_A,
  CLIENTE_B,
  PRODUTO_A,
  PRODUTO_B,
  VENDEDOR_FIXTURE,
  AREA_A,
  AREA_B,
  TECNICA_SERIGRAFIA,
  TECNICA_LASER,
} from './grupo4.fixtures';

beforeEach(() => vi.clearAllMocks());

// ─── A09 — rotação 0/15/90 e tamanhos sem corte silencioso ───────────

/** O editor real com o estado que a tela mantém (rotação e medida da área ativa). */
function EditorDaLogo({
  larguraInicial,
  alturaInicial,
}: {
  larguraInicial: number;
  alturaInicial: number;
}) {
  const [rotacao, setRotacao] = useState(0);
  const [medida, setMedida] = useState({ largura: larguraInicial, altura: alturaInicial });
  return (
    <TooltipProvider>
      <LogoPositionEditor
        productImageUrl={PRODUTO_A.imageUrl}
        logoPreview={LOGO_FIXTURE}
        positionX={50}
        positionY={42}
        logoWidth={medida.largura}
        logoHeight={medida.altura}
        logoRotation={rotacao}
        logoScale={100}
        maxWidth={AREA_A.maxWidthCm}
        maxHeight={AREA_A.maxHeightCm}
        productHeightCm={10}
        productWidthCm={20}
        onPositionChange={vi.fn()}
        onRotationChange={setRotacao}
        onSizeChange={(largura, altura) => setMedida({ largura, altura })}
      />
    </TooltipProvider>
  );
}

/** Ângulo que o preview aplica de fato à logo exibida (transform da imagem). */
function anguloDaLogoExibida(): number {
  const estilo = screen.getByAltText('Logo para personalização').getAttribute('style') ?? '';
  return Number(/rotate\((-?[\d.]+)deg\)/.exec(estilo)?.[1]);
}

// Por texto/aria-label: `getByRole` varre a árvore de acessibilidade e levava o cenário a ~15 s.
const botao = (texto: string) => screen.getByText(texto);
const botaoRotulado = (rotulo: string) => screen.getByLabelText(rotulo);

describe('A09 — 0°, 15° e 90° e tamanhos sem corte silencioso', () => {
  it('os botões de rotação levam a logo exibida a 0°, 15° e 90° e de volta ao 0°, sem ângulo negativo', async () => {
    render(<EditorDaLogo larguraInicial={AREA_A.logoWidth} alturaInicial={AREA_A.logoHeight} />);
    await screen.findByAltText('Logo para personalização');

    // 0°: nada a resetar.
    expect(anguloDaLogoExibida()).toBe(0);
    expect(botao('0°')).toBeDisabled();

    // +15° a cada clique: 15° primeiro e, seis passos depois, 90°.
    fireEvent.click(botao('+15°'));
    expect(anguloDaLogoExibida()).toBe(15);
    expect(botao('15°')).toBeEnabled();
    for (let passo = 2; passo <= 6; passo++) fireEvent.click(botao('+15°'));
    expect(anguloDaLogoExibida()).toBe(90);

    // O botão do valor atual volta a logo para 0°.
    fireEvent.click(botao('90°'));
    expect(anguloDaLogoExibida()).toBe(0);
    expect(botao('0°')).toBeDisabled();

    // +15° de novo, para a volta por -15° abaixo.
    fireEvent.click(botao('+15°'));
    expect(anguloDaLogoExibida()).toBe(15);

    // -15° duas vezes: volta ao 0° e depois dá a volta para 345° (nunca negativo).
    fireEvent.click(botao('-15°'));
    expect(anguloDaLogoExibida()).toBe(0);
    fireEvent.click(botao('-15°'));
    expect(anguloDaLogoExibida()).toBe(345);
  }, 60_000);

  it('o tamanho da logo nunca passa do limite da área: os botões de aumentar travam e "Máxima" para no limite', async () => {
    render(<EditorDaLogo larguraInicial={7} alturaInicial={3} />);
    await screen.findByAltText('Logo para personalização');

    // No limite da área (7×3 cm) o limite é exibido e não dá para crescer além dele.
    expect(screen.getByText('Máx 7×3cm')).toBeInTheDocument();
    expect(botaoRotulado('Aumentar largura')).toBeDisabled();
    expect(botaoRotulado('Aumentar altura')).toBeDisabled();

    // Diminuir libera o aumento; aumentar de novo para exatamente no limite, nunca acima.
    fireEvent.click(botaoRotulado('Diminuir altura'));
    expect(screen.getByText('2.5cm')).toBeInTheDocument();
    expect(botaoRotulado('Aumentar altura')).toBeEnabled();
    fireEvent.click(botaoRotulado('Aumentar altura'));
    expect(screen.getByText('3cm')).toBeInTheDocument();
    expect(botaoRotulado('Aumentar altura')).toBeDisabled();

    // "Máxima" leva as duas medidas exatamente ao limite da área.
    fireEvent.click(botaoRotulado('Diminuir largura'));
    expect(screen.getByText('6.5cm')).toBeInTheDocument();
    fireEvent.click(botao('Máxima'));
    expect(screen.getByText('7cm')).toBeInTheDocument();
    expect(screen.getByText('3cm')).toBeInTheDocument();
  }, 60_000);
});

// ─── A10 — editar após gerar marca o resultado antigo; ficha sem mistura ──

describe('A10 — editar após gerar marca o resultado antigo e a ficha não mistura dados', () => {
  it('trocar a técnica depois de gerar abre uma confirmação que avisa do resultado antigo; só confirmar o invalida', () => {
    // Com resultado gerado, a confirmação avisa que ele será descartado; sem resultado, não.
    const dialogo = (hasGeneratedMockup: boolean) => (
      <TechniqueChangeDialog
        open
        onOpenChange={vi.fn()}
        fromName={TECNICA_SERIGRAFIA.name}
        toName={TECNICA_LASER.name}
        hasGeneratedMockup={hasGeneratedMockup}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const { rerender } = render(dialogo(true));
    const aviso = () =>
      screen.getByTestId('mockup-technique-change-dialog-description').textContent;
    expect(aviso()).toContain('O mockup gerado será descartado');
    rerender(dialogo(false));
    expect(aviso()).not.toContain('descartado');

    // O fluxo real: a troca NÃO é aplicada em silêncio; abre a confirmação.
    const setSelectedTechnique = vi.fn();
    const setGeneratedMockup = vi.fn();
    const setTechniqueColorConfig = vi.fn();
    const { result } = renderHook(() =>
      useTechniqueHandlers({
        hasLogo: true,
        selectedTechnique: TECNICA_SERIGRAFIA,
        setSelectedTechnique,
        setGeneratedMockup,
        setTechniqueColorConfig,
      }),
    );

    act(() => result.current.handleTechniqueChange(TECNICA_LASER));
    expect(result.current.techniqueChangeDialogOpen).toBe(true);
    expect(result.current.pendingTechnique?.id).toBe(TECNICA_LASER.id);
    expect(setSelectedTechnique).not.toHaveBeenCalled();
    expect(setGeneratedMockup).not.toHaveBeenCalled();

    // Cancelar mantém a técnica e o resultado antigo.
    act(() => result.current.setTechniqueChangeDialogOpen(false));
    expect(result.current.techniqueChangeDialogOpen).toBe(false);
    expect(setSelectedTechnique).not.toHaveBeenCalled();
    expect(setGeneratedMockup).not.toHaveBeenCalled();

    // Confirmar aplica a técnica nova e invalida o resultado antigo (null).
    act(() => result.current.handleTechniqueChange(TECNICA_LASER));
    act(() => result.current.confirmTechniqueChange());
    expect(setSelectedTechnique).toHaveBeenCalledWith(TECNICA_LASER);
    expect(setGeneratedMockup).toHaveBeenCalledWith(null);
    expect(result.current.techniqueChangeDialogOpen).toBe(false);
  });

  it('regerar depois de editar: a ficha da nova geração traz só cliente, produto, medida e imagem dela, sem resíduo da anterior', async () => {
    const tecnica = {
      name: TECNICA_SERIGRAFIA.name,
      code: TECNICA_SERIGRAFIA.code,
      maxWidth: TECNICA_SERIGRAFIA.maxWidth,
      maxHeight: TECNICA_SERIGRAFIA.maxHeight,
      locationName: TECNICA_SERIGRAFIA.locationName,
    };
    // A MESMA instância da tela recebe a configuração e a imagem de cada geração.
    const ficha = (geracao: {
      mockup: string;
      product: typeof PRODUTO_A;
      client: typeof CLIENTE_A;
      area: typeof AREA_A;
    }) => (
      <TooltipProvider>
        <MockupLayoutButtons
          generatedMockup={geracao.mockup}
          product={geracao.product}
          technique={tecnica}
          client={geracao.client}
          seller={VENDEDOR_FIXTURE}
          activeArea={geracao.area}
          productHeightCm={10}
          productWidthCm={20}
        />
      </TooltipProvider>
    );
    // Botão que abre a ficha com o mockup já gerado: "Gerar Layout - IA" hoje e
    // "Gerar documento" depois do cartão adb7f295 (branch v2/refazer-adb7f295).
    const abrirFicha = () =>
      fireEvent.click(screen.getByRole('button', { name: /Gerar Layout - IA|Gerar documento/ }));

    // 1) Primeira geração: a ficha traz o cliente, o produto, a medida e a imagem dela.
    const { rerender } = render(
      ficha({ mockup: MOCKUP_FIXTURE_URL, product: PRODUTO_A, client: CLIENTE_A, area: AREA_A }),
    );
    abrirFicha();
    expect((await screen.findAllByText(CLIENTE_A.name)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(PRODUTO_A.name).length).toBeGreaterThan(0);
    expect(screen.getByText(`${AREA_A.logoWidth} × ${AREA_A.logoHeight} cm`)).toBeInTheDocument();
    expect(screen.getByAltText('Mockup')).toHaveAttribute('src', MOCKUP_FIXTURE_URL);

    // 2) O vendedor fecha a ficha, edita (cliente, produto, medida) e gera de novo.
    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByAltText('Mockup')).toBeNull());
    rerender(
      ficha({ mockup: MOCKUP_FIXTURE_URL_B, product: PRODUTO_B, client: CLIENTE_B, area: AREA_B }),
    );
    abrirFicha();
    expect((await screen.findAllByText(CLIENTE_B.name)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(PRODUTO_B.name).length).toBeGreaterThan(0);
    expect(screen.getByText(`${AREA_B.logoWidth} × ${AREA_B.logoHeight} cm`)).toBeInTheDocument();
    expect(screen.getByAltText('Mockup')).toHaveAttribute('src', MOCKUP_FIXTURE_URL_B);

    // Nada da geração anterior sobrou na ficha: nem cliente, nem produto, nem medida.
    expect(screen.queryByText(CLIENTE_A.name)).toBeNull();
    expect(screen.queryByText(PRODUTO_A.name)).toBeNull();
    expect(screen.queryByText(`${AREA_A.logoWidth} × ${AREA_A.logoHeight} cm`)).toBeNull();
  }, 60_000);
});
