/**
 * t_94476dd0 — giro e escala da logo não podem cortar a marca em silêncio.
 *
 * Antes: a caixa da marca era fixa (= `logoDisplay`) com `overflow-hidden` e a <img>
 * girava/escalava DENTRO dela — girar 90° uma marca larga (ou escalar acima de 1)
 * empurrava a marca para fora da caixa e o corte acontecia sem nenhum aviso. Contrato
 * provado: a caixa da marca acompanha giro/escala e não recorta; o que passa da área de
 * aplicação gera aviso explícito (role="status"); sem corte, ou sem área medida, não há
 * aviso — nada de corte silencioso e nada de alarme falso.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import {
  getMarkFootprint,
  isMarkClipped,
  LogoPreviewCanvas,
} from '@/components/mockup/logo-editor/LogoPreviewCanvas';
import { TECHNIQUE_FILTERS } from '@/components/mockup/logo-editor/logoTechniqueFilters';

const AREA_PX = 400; // área de aplicação (o preview é `aspect-square`)
const WIDE_LOGO = { widthPx: 120, heightPx: 40 }; // marca larga 3:1 — caso do giro de 90°
const RAD = Math.PI / 180;

/** Cantos da marca (w×h) depois de girar `deg` em torno do centro. */
function cornersOf(width: number, height: number, deg: number) {
  const cos = Math.cos(deg * RAD);
  const sin = Math.sin(deg * RAD);
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sx, sy]) => {
    const x = (sx * width) / 2;
    const y = (sy * height) / 2;
    return { x: x * cos - y * sin, y: x * sin + y * cos };
  });
}

function px(value: string | undefined | null): number {
  return Number.parseFloat(String(value ?? '').replace('px', ''));
}

function stubAreaSize(width: number, height: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

type CanvasProps = Parameters<typeof LogoPreviewCanvas>[0];

function renderCanvas(overrides: Partial<CanvasProps> = {}) {
  const containerRef = createRef<HTMLDivElement>();
  const props: CanvasProps = {
    containerRef,
    productImageUrl: '/placeholder.svg',
    logoPreview: 'data:image/png;base64,logo',
    logoDisplay: WIDE_LOGO,
    positionX: 50,
    positionY: 50,
    logoRotation: 0,
    userScaleFactor: 1,
    processedLogoUrl: null,
    techniqueFilter: TECHNIQUE_FILTERS.bordado,
    colorConfigFilter: null,
    onPointerDown: vi.fn(),
    ...overrides,
  };
  return render(<LogoPreviewCanvas {...props} />);
}

beforeEach(() => stubAreaSize(AREA_PX, AREA_PX));
afterEach(() => vi.restoreAllMocks());

describe('getMarkFootprint — bbox da marca girada/escalada', () => {
  it.each([
    { nome: 'sem giro', deg: 0, scale: 1, width: 120, height: 40 },
    { nome: 'a 90° (transposta)', deg: 90, scale: 1, width: 40, height: 120 },
    { nome: 'escala pequena (0.4)', deg: 0, scale: 0.4, width: 48, height: 16 },
    { nome: 'a 90° com escala grande (3)', deg: 90, scale: 3, width: 120, height: 360 },
  ])('$nome devolve a bbox esperada', ({ deg, scale, width, height }) => {
    const footprint = getMarkFootprint(WIDE_LOGO, deg, scale);
    expect(footprint.width).toBeCloseTo(width, 6);
    expect(footprint.height).toBeCloseTo(height, 6);
  });

  it('contém os 4 cantos da marca em 15° e 90° (corte não passa por subestimativa)', () => {
    for (const [deg, scale] of [[15, 1], [90, 1], [15, 0.4], [90, 3]] as const) {
      const footprint = getMarkFootprint(WIDE_LOGO, deg, scale);
      const cantos = cornersOf(WIDE_LOGO.widthPx * scale, WIDE_LOGO.heightPx * scale, deg);
      for (const canto of cantos) {
        expect(Math.abs(canto.x)).toBeLessThanOrEqual(footprint.width / 2 + 1e-9);
        expect(Math.abs(canto.y)).toBeLessThanOrEqual(footprint.height / 2 + 1e-9);
      }
    }
  });
});

describe('isMarkClipped — a marca ultrapassa a área de aplicação?', () => {
  it.each([
    { nome: 'marca pequena no centro', fp: { width: 120, height: 40 }, pos: { x: 50, y: 50 }, clipped: false },
    { nome: 'marca na borda esquerda', fp: { width: 120, height: 40 }, pos: { x: 5, y: 50 }, clipped: true },
    { nome: 'marca maior que a área', fp: { width: 480, height: 160 }, pos: { x: 50, y: 50 }, clipped: true },
    { nome: 'marca girada mais alta que a área', fp: { width: 80, height: 500 }, pos: { x: 50, y: 50 }, clipped: true },
  ])('$nome', ({ fp, pos, clipped }) => {
    expect(isMarkClipped(fp, pos, { width: AREA_PX, height: AREA_PX })).toBe(clipped);
  });

  it('área ainda não medida (0px) não afirma corte', () => {
    expect(isMarkClipped({ width: 480, height: 160 }, { x: 50, y: 50 }, { width: 0, height: 0 })).toBe(false);
  });
});

describe('LogoPreviewCanvas — a caixa da marca acompanha giro e escala', () => {
  it.each([
    { nome: 'giro de 90°', overrides: { logoRotation: 90 }, width: 40, height: 120 },
    { nome: 'giro de 15°', overrides: { logoRotation: 15 }, width: 126.26, height: 69.7 },
    { nome: 'escala grande (3)', overrides: { userScaleFactor: 3 }, width: 360, height: 120 },
    { nome: 'escala pequena (0.4)', overrides: { userScaleFactor: 0.4 }, width: 48, height: 16 },
  ])('$nome: caixa = bbox e sem overflow-hidden', ({ overrides, width, height }) => {
    renderCanvas(overrides);

    const brandBox = screen.getByTestId('logo-brand-box');
    expect(px(brandBox.style.width)).toBeCloseTo(width, 1);
    expect(px(brandBox.style.height)).toBeCloseTo(height, 1);
    expect(brandBox.className).not.toContain('overflow-hidden');
  });

  it('mantém a área de arraste no tamanho de calibração (a pega não encolhe)', () => {
    renderCanvas({ userScaleFactor: 0.4 });

    const dragArea = screen.getByTestId('logo-drag-area');
    expect(px(dragArea.style.width)).toBeCloseTo(WIDE_LOGO.widthPx, 1);
    expect(px(dragArea.style.height)).toBeCloseTo(WIDE_LOGO.heightPx, 1);
  });

  it('mantém a composição: imagem no tamanho de calibração com o giro aplicado', () => {
    renderCanvas({ logoRotation: 90 });

    const img = screen.getByAltText('Logo para personalização');
    expect(px(img.style.width)).toBeCloseTo(WIDE_LOGO.widthPx, 1);
    expect(px(img.style.height)).toBeCloseTo(WIDE_LOGO.heightPx, 1);
    expect(img.style.transform).toContain('rotate(90deg)');
    expect(img.style.transform).toContain('scale(1)');
  });
});

describe('LogoPreviewCanvas — aviso explícito de corte', () => {
  it('giro de 90° com a marca na borda avisa que a marca está cortada', () => {
    renderCanvas({ logoDisplay: { widthPx: 300, heightPx: 80 }, logoRotation: 90, positionX: 5 });

    const warning = screen.getByTestId('logo-clip-warning');
    expect(warning).toHaveAttribute('role', 'status');
    expect(warning.textContent ?? '').toMatch(/cortada/i);
    expect(screen.getByTestId('logo-brand-box').getAttribute('data-clipped')).toBe('true');
  });

  it('escala grande demais para a área avisa que a marca está cortada', () => {
    renderCanvas({ userScaleFactor: 5 });

    expect(screen.getByTestId('logo-clip-warning').textContent ?? '').toMatch(/cortada/i);
    expect(screen.getByTestId('logo-brand-box').getAttribute('data-clipped')).toBe('true');
  });

  it('marca inteira dentro da área não mostra aviso (sem alarme falso)', () => {
    renderCanvas({ logoRotation: 15 });

    expect(screen.queryByTestId('logo-clip-warning')).toBeNull();
    expect(screen.getByTestId('logo-brand-box').getAttribute('data-clipped')).toBe('false');
  });

  it('sem área medida não mostra aviso (não inventa corte)', () => {
    vi.restoreAllMocks();
    stubAreaSize(0, 0);
    renderCanvas({ userScaleFactor: 5 });

    expect(screen.queryByTestId('logo-clip-warning')).toBeNull();
    expect(screen.getByTestId('logo-brand-box').getAttribute('data-clipped')).toBe('false');
  });

  it('sem logo não há caixa da marca nem aviso', () => {
    renderCanvas({ logoPreview: null });

    expect(screen.queryByTestId('logo-brand-box')).toBeNull();
    expect(screen.queryByTestId('logo-clip-warning')).toBeNull();
  });
});
