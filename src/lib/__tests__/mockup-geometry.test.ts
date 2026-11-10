import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cmParaPx, MIN_LOGO_PX } from '../mockup-geometry';

const base = {
  logoWidthCm: 5,
  logoHeightCm: 2,
  renderedImgW: 400,
  renderedImgH: 400,
  fractionX: 0.5,
  fractionY: 0.5,
  productWidthCm: 10,
  productHeightCm: 20,
};

describe('cmParaPx', () => {
  it('converte cm em px pela menor escala (largura 20 px/cm vs altura 10 px/cm)', () => {
    const r = cmParaPx(base);
    expect(r.cmToPx).toBe(10);
    expect(r.widthPx).toBe(50);
    expect(r.heightPx).toBe(20);
    expect(r.estimated).toBe(false);
  });

  it('é determinística: mesma entrada, mesmo valor', () => {
    expect(cmParaPx({ ...base })).toEqual(cmParaPx({ ...base }));
  });

  it('logo mínima: amplia até o maior lado = 40 px mantendo proporção', () => {
    const r = cmParaPx({ ...base, logoWidthCm: 1, logoHeightCm: 0.5 });
    expect(MIN_LOGO_PX).toBe(40);
    expect(r.widthPx).toBeCloseTo(40);
    expect(r.heightPx).toBeCloseTo(20);
  });

  it('não amplia se um dos lados já passa de 40 px', () => {
    const r = cmParaPx({ ...base, logoWidthCm: 4.5, logoHeightCm: 0.1 });
    expect(r.widthPx).toBeCloseTo(45);
  });

  it('logo de tamanho zero não vira NaN', () => {
    const r = cmParaPx({ ...base, logoWidthCm: 0, logoHeightCm: 0 });
    expect(r.widthPx).toBe(0);
    expect(r.heightPx).toBe(0);
  });

  it('rotação 90 não entra na conta: a caixa é a mesma (rotação é transform posterior)', () => {
    // A função nem recebe rotação; logo 5x2 continua 50x20 e o transform gira depois.
    const r = cmParaPx(base);
    expect({ w: r.widthPx, h: r.heightPx }).toEqual({ w: 50, h: 20 });
  });

  it('sem medidas do produto: estima a partir da técnica, depois dos padrões 8x20', () => {
    const semMedidas = { ...base, productWidthCm: null, productHeightCm: null };
    const comTecnica = cmParaPx({ ...semMedidas, maxWidthCm: 5, maxHeightCm: 4 });
    expect(comTecnica.physW).toBe(10);
    expect(comTecnica.physH).toBe(10);
    expect(comTecnica.estimated).toBe(true);
    const padrao = cmParaPx(semMedidas);
    expect(padrao.physW).toBe(8);
    expect(padrao.physH).toBe(20);
  });

  it('só altura ou só largura derivam a outra dimensão', () => {
    expect(cmParaPx({ ...base, productWidthCm: null }).physW).toBe(8);
    expect(cmParaPx({ ...base, productHeightCm: null }).physH).toBe(25);
  });
});

describe('uso compartilhado (editor e documento)', () => {
  const lerSrc = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

  it.each([
    'src/components/mockup/LogoPositionEditor.tsx',
    'src/components/mockup/approval/MockupLayoutButtons.tsx',
  ])('%s usa cmParaPx e não repete a conta', (arquivo) => {
    const src = lerSrc(arquivo);
    expect(src).toContain("from '@/lib/mockup-geometry'");
    expect(src).toContain('cmParaPx(');
    expect(src).not.toMatch(/const minPx = 40/);
    expect(src).not.toMatch(/Math\.min\(scaleByW, scaleByH\)/);
  });
});
