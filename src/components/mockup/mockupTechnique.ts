/**
 * Tipo da técnica de personalização usada pelo painel de configuração do mockup.
 *
 * Saiu de MockupConfigPanel.tsx (que está no teto do gate de tamanho de arquivo, 500 linhas)
 * sem nenhuma mudança de forma: só mudou de arquivo.
 */
export interface Technique {
  id: string;
  name: string;
  code: string | null;
  /** Permite Technique ser atribuível a MockupTechnique (que aceita campos arbitrários do bridge). */
  [key: string]: unknown;
  maxWidth?: number | null;
  maxHeight?: number | null;
  areaName?: string | null;
  locationName?: string | null;
  // Atributos novos (vindos de TechniqueWithLimits)
  maxColors?: number | null;
  chargesPerColor?: boolean;
  usesDimension?: boolean;
  isCurved?: boolean;
  setupCost?: number | null;
  variationLabel?: string | null;
  groupCode?: string | null;
  shape?: string | null;
}
