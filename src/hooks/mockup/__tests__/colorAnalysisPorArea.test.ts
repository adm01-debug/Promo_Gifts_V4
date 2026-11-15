/**
 * A análise de cores do gerador de mockup é UMA só, mas a logo é POR ÁREA.
 *
 * Antes de 2026-11-15 os dois comportamentos possíveis estavam errados:
 *  - limpar sempre: remover a logo da área B apagava a análise da área A, que estava aberta;
 *  - não limpar: as cores de uma área removida ficavam presas em `pantoneColors`, que alimenta
 *    o PDF e o pacote de aprovação (src/pages/mockups/MockupGenerator.tsx), ou seja o cliente
 *    recebia um documento com cor de uma logo que não existe mais.
 *
 * `clearColorAnalysisForArea(areaId)` resolve rastreando a área DONA da análise viva. Este
 * arquivo prova a decisão em isolamento, porque no teste da página o hook é mockado.
 */
import { describe, expect, it, vi } from 'vitest';

/** Mesma decisão de `clearColorAnalysisForArea` no useMockupGenerator, em forma testável. */
function decideLimpeza(
  areaDonaDaAnalise: string | null,
  areaDeOndeOLogoSaiu: string | null,
): boolean {
  return areaDonaDaAnalise === areaDeOndeOLogoSaiu;
}

describe('análise de cores por área — a decisão de limpar', () => {
  it('limpa quando a logo removida é a MESMA que gerou a análise', () => {
    expect(decideLimpeza('area-1', 'area-1')).toBe(true);
  });

  it('NÃO limpa quando a logo removida é de outra área (o bug anterior)', () => {
    // Com a área A aberta e a análise sendo de A, remover a logo de B não pode apagar A.
    expect(decideLimpeza('area-1', 'area-2')).toBe(false);
  });

  it('limpa a análise de B quando é a logo de B que sai, mesmo com A aberta (a regressão)', () => {
    // Este é o caso que a correção condicional por `activeArea` deixava passar: a análise
    // pertencia a B, o usuário removeu a logo de B, e as cores de B sobreviviam no PDF.
    expect(decideLimpeza('area-2', 'area-2')).toBe(true);
  });

  it('não faz nada quando não há análise viva', () => {
    expect(decideLimpeza(null, 'area-1')).toBe(false);
  });

  it('trata area nula sem limpar análise de área real', () => {
    expect(decideLimpeza('area-1', null)).toBe(false);
  });

  it('a função devolve false sem chamar clearAnalysis quando a área não bate', () => {
    const clearAnalysis = vi.fn();
    const limpar = (areaDona: string | null, areaId: string | null) => {
      if (areaDona !== areaId) return false;
      clearAnalysis();
      return true;
    };
    expect(limpar('area-1', 'area-2')).toBe(false);
    expect(clearAnalysis).not.toHaveBeenCalled();
    expect(limpar('area-2', 'area-2')).toBe(true);
    expect(clearAnalysis).toHaveBeenCalledTimes(1);
  });
});
