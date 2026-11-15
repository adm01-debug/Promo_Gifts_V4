/**
 * A análise de cores do gerador de mockup é UMA só, mas a logo é POR ÁREA.
 *
 * Antes de 2026-11-15 os dois comportamentos possíveis estavam errados:
 *  - limpar sempre: remover a logo da área B apagava a análise da área A, que estava aberta;
 *  - não limpar: as cores de uma área removida ficavam presas em `pantoneColors`, que alimenta
 *    o PDF e o pacote de aprovação (src/pages/mockups/MockupGenerator.tsx), ou seja o cliente
 *    recebia um documento com cor de uma logo que não existe mais.
 *
 * `useLogoColorAnalysisByArea` resolve rastreando a área DONA da análise viva. Este arquivo
 * prova a decisão no hook real, porque no teste da página o gerador é mockado.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLogoColorAnalysisByArea } from '@/hooks/simulation/useLogoColorAnalysisByArea';

const analyzeImage = vi.fn();
const clearAnalysis = vi.fn();
vi.mock('@/hooks/simulation/useLogoColorAnalysis', () => ({
  useLogoColorAnalysis: () => ({
    colors: [],
    isAnalyzing: false,
    error: null,
    analyzeImage,
    clearAnalysis,
  }),
}));

describe('análise de cores por área — a decisão de limpar', () => {
  beforeEach(() => {
    analyzeImage.mockClear();
    clearAnalysis.mockClear();
  });

  it('limpa quando a logo removida é a MESMA que gerou a análise', () => {
    const { result } = renderHook(() => useLogoColorAnalysisByArea());
    act(() => {
      result.current.analyzeImage('data:logo', 'area-1');
    });
    expect(analyzeImage).toHaveBeenCalledWith('data:logo');
    let limpou = false;
    act(() => {
      limpou = result.current.clearForArea('area-1');
    });
    expect(limpou).toBe(true);
    expect(clearAnalysis).toHaveBeenCalledTimes(1);
    expect(result.current.areaId).toBeNull();
  });

  it('NÃO limpa quando a logo removida é de outra área (o bug anterior)', () => {
    const { result } = renderHook(() => useLogoColorAnalysisByArea());
    act(() => {
      result.current.analyzeImage('data:logo', 'area-1');
    });
    let limpou = true;
    act(() => {
      limpou = result.current.clearForArea('area-2');
    });
    expect(limpou).toBe(false);
    expect(clearAnalysis).not.toHaveBeenCalled();
    expect(result.current.areaId).toBe('area-1');
  });

  it('limpa a análise de B quando é a logo de B que sai, mesmo com A aberta (a regressão)', () => {
    const { result } = renderHook(() => useLogoColorAnalysisByArea());
    act(() => {
      result.current.analyzeImage('data:logo-b', 'area-2');
    });
    let limpou = false;
    act(() => {
      limpou = result.current.clearForArea('area-2');
    });
    expect(limpou).toBe(true);
    expect(clearAnalysis).toHaveBeenCalledTimes(1);
  });

  it('não faz nada quando não há análise viva, nem para área nula', () => {
    const { result } = renderHook(() => useLogoColorAnalysisByArea());
    let limpou = true;
    act(() => {
      limpou = result.current.clearForArea('area-1');
    });
    expect(limpou).toBe(false);
    act(() => {
      limpou = result.current.clearForArea(null);
    });
    expect(limpou).toBe(false);
    expect(clearAnalysis).not.toHaveBeenCalled();
  });

  it('clearAnalysis esquece a área dona (resetForm)', () => {
    const { result } = renderHook(() => useLogoColorAnalysisByArea());
    act(() => {
      result.current.analyzeImage('data:logo', 'area-1');
    });
    act(() => result.current.clearAnalysis());
    expect(clearAnalysis).toHaveBeenCalledTimes(1);
    expect(result.current.areaId).toBeNull();
  });

  it('restoreFor: com logo, a área restaurada vira dona; sem logo, ninguém é dono', () => {
    const { result } = renderHook(() => useLogoColorAnalysisByArea());
    act(() => {
      result.current.restoreFor('https://cdn/logo.png', 'area-hist');
    });
    expect(analyzeImage).toHaveBeenCalledWith('https://cdn/logo.png');
    expect(result.current.areaId).toBe('area-hist');
    act(() => {
      result.current.restoreFor(null, 'area-hist');
    });
    expect(result.current.areaId).toBeNull();
    expect(analyzeImage).toHaveBeenCalledTimes(1);
  });
});
