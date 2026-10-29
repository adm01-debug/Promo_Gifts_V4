/**
 * GeometryStates — rótulos de geometria do preview (Codex p.11).
 *
 * Contrato provado aqui:
 *  • 'validada'    — técnica COM regra + dimensões reais do produto + limites oficiais
 *                    da área (a máscara): é o ÚNICO estado que mostra medidas em cm.
 *  • 'ilustrativa' — dimensões conhecidas mas SEM máscara oficial (ou dimensões
 *                    ausentes, trava Q13): posicionamento ilustrativo, nenhuma
 *                    fronteira oficial desenhada e NENHUM cm.
 *  • 'sem_regra'   — técnica sem regra de simulação: nunca vira selo de compatibilidade
 *                    e nunca mostra cm (nada de régua com falsa precisão).
 *
 * Sem regra/con mascara errada = sem cm. O teste falha no componente antigo (não havia
 * rótulo nenhum: `getByTestId('logo-geometry-state')` lança).
 */
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { LogoPreviewCanvas, describeGeometry } from '../logo-editor/LogoPreviewCanvas';
import { getTechniqueFilter } from '../logo-editor/logoTechniqueFilters';

afterEach(() => cleanup());

type CanvasProps = ComponentProps<typeof LogoPreviewCanvas>;

const BASE: CanvasProps = {
  containerRef: { current: null },
  productImageUrl: '/products/caneta.png',
  logoPreview: '/logos/cliente.png',
  logoDisplay: { widthPx: 120, heightPx: 72 },
  positionX: 50,
  positionY: 40,
  logoRotation: 0,
  userScaleFactor: 1,
  processedLogoUrl: null,
  // Técnica com regra conhecida (ver TECHNIQUE_FILTERS).
  techniqueFilter: getTechniqueFilter('serigrafia', 'Serigrafia'),
  colorConfigFilter: null,
  onPointerDown: () => {},
};

const renderCanvas = (props: Partial<CanvasProps> = {}) =>
  render(<LogoPreviewCanvas {...BASE} {...props} />);

const geometryLabel = () => screen.getByTestId('logo-geometry-state');
const labelText = () => geometryLabel().textContent ?? '';

/** Fatos de uma geometria "cheia": tudo cadastrado de verdade. */
const FACTS_OK = {
  techniqueFilter: getTechniqueFilter('serigrafia', 'Serigrafia'),
  productWidthCm: 20,
  productHeightCm: 10,
  maxWidthCm: 7,
  maxHeightCm: 3,
  logoWidthCm: 5,
  logoHeightCm: 3,
};

describe('estados de geometria do preview', () => {
  it("'validada': mostra as medidas em cm (logo e fronteira oficial da área)", () => {
    renderCanvas(FACTS_OK);

    const label = geometryLabel();
    expect(label).toHaveAttribute('data-state', 'validada');
    expect(label).toHaveTextContent('Geometria validada');
    expect(label).toHaveTextContent('5,0 × 3,0 cm'); // medida real da logo
    expect(label).toHaveTextContent('7,0 × 3,0 cm'); // limite oficial da área
  });

  it("'ilustrativa': dimensões conhecidas SEM máscara oficial — rótulo próprio e nenhum cm", () => {
    renderCanvas({ ...FACTS_OK, maxWidthCm: null, maxHeightCm: null });

    const label = geometryLabel();
    expect(label).toHaveAttribute('data-state', 'ilustrativa');
    expect(label).toHaveTextContent(/ilustrativ/i);
    expect(label).not.toHaveTextContent(/área oficial/i);
    expect(labelText()).not.toContain('cm');
  });

  it("'ilustrativa': produto sem dimensões (trava Q13) nunca vira medida — e não mostra cm", () => {
    renderCanvas({ ...FACTS_OK, productWidthCm: null, productHeightCm: null });

    const label = geometryLabel();
    expect(label).toHaveAttribute('data-state', 'ilustrativa');
    expect(labelText()).not.toContain('cm');
  });

  it("'sem_regra': técnica sem regra não vira selo de compatibilidade nem mostra cm", () => {
    renderCanvas({
      ...FACTS_OK,
      techniqueFilter: getTechniqueFilter('piromarcacao', 'Piromarcação a fogo'),
    });

    const label = geometryLabel();
    expect(label).toHaveAttribute('data-state', 'sem_regra');
    expect(label).toHaveTextContent(/sem regra/i);
    expect(labelText()).not.toContain('cm');
    expect(labelText()).not.toMatch(/compat[íi]vel/i);
    expect(labelText()).not.toMatch(/selo de compat/i.test(labelText()) ? /nunca/i : /nunca/);
  });

  it('sem logo não há rótulo de geometria', () => {
    renderCanvas({ logoPreview: null, logoDisplay: null });

    expect(screen.queryByTestId('logo-geometry-state')).toBeNull();
  });
});

describe('describeGeometry — só o estado validado carrega medidas', () => {
  it("'validada' carrega as medidas em cm", () => {
    const descriptor = describeGeometry(FACTS_OK);

    expect(descriptor.state).toBe('validada');
    expect(descriptor.measuresCm).toEqual({
      logoWidthCm: 5,
      logoHeightCm: 3,
      areaWidthCm: 7,
      areaHeightCm: 3,
    });
  });

  it('sem máscara oficial as medidas são nulas', () => {
    expect(describeGeometry({ ...FACTS_OK, maxWidthCm: null }).measuresCm).toBeNull();
  });

  it('sem dimensões do produto as medidas são nulas (Q13)', () => {
    expect(
      describeGeometry({ ...FACTS_OK, productWidthCm: null, productHeightCm: null }).measuresCm,
    ).toBeNull();
  });

  it("técnica sem regra ganha do resto: estado 'sem_regra' e nenhuma medida", () => {
    const descriptor = describeGeometry({
      ...FACTS_OK,
      techniqueFilter: getTechniqueFilter('piromarcacao', 'Piromarcação a fogo'),
    });

    expect(descriptor.state).toBe('sem_regra');
    expect(descriptor.measuresCm).toBeNull();
  });
});
