/**
 * pptxTheme — paleta corporativa e marcações comuns aos slides do PPTX de BI.
 */
import type PptxGenJS from 'pptxgenjs';

// Paleta corporativa (violeta/fuchsia + neutros)
export const C = {
  primary: '6D28D9', // violet-700
  accent: 'C026D3', // fuchsia-600
  bg: '0F172A', // slate-900
  bgLight: 'F8FAFC', // slate-50
  text: '1E293B', // slate-800
  muted: '64748B', // slate-500
  good: '10B981', // emerald-500
  warn: 'F59E0B', // amber-500
  bad: 'EF4444', // red-500
};

/** FT-004: marca o slide quando a seção veio de dados simulados (isMock). */
export function addMockBadge(slide: PptxGenJS.Slide): void {
  slide.addText('Dados simulados', {
    x: 10.5,
    y: 0.7,
    w: 2.5,
    h: 0.3,
    fontSize: 9,
    color: C.warn,
    italic: true,
    align: 'right',
  });
}
