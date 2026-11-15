/**
 * useMockupTechniquesLoad — o erro de carga das técnicas vira ESTADO, e reloadTechniques
 * recarrega a MESMA lista que falhou (antes o erro só virava toast e sumia).
 *
 * Fica ao lado do módulo (e não em __tests__/) para não cruzar com a PR #3672, que mexe em
 * src/hooks/mockup/__tests__/.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { loadMockupTechniques } = vi.hoisted(() => ({ loadMockupTechniques: vi.fn() }));
vi.mock('@/hooks/mockup/mockupGeneratorModel', () => ({ loadMockupTechniques }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import {
  useMockupTechniquesLoad,
  TECHNIQUES_LOAD_ERROR_FALLBACK,
} from '@/hooks/mockup/useMockupTechniquesLoad';

const TECNICA = { id: 't1', name: 'Serigrafia', code: 'SERI' };

describe('useMockupTechniquesLoad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga ok: lista preenchida e sem erro', async () => {
    loadMockupTechniques.mockResolvedValue([TECNICA]);

    const { result } = renderHook(() => useMockupTechniquesLoad());

    await waitFor(() => expect(result.current.isLoadingData).toBe(false));
    expect(result.current.techniques).toEqual([TECNICA]);
    expect(result.current.techniquesError).toBeNull();
  });

  it('falha: guarda a mensagem do erro em estado', async () => {
    loadMockupTechniques.mockRejectedValue(new Error('banco de gravação fora do ar'));

    const { result } = renderHook(() => useMockupTechniquesLoad());

    await waitFor(() =>
      expect(result.current.techniquesError).toBe('banco de gravação fora do ar'),
    );
    expect(result.current.techniques).toEqual([]);
    expect(result.current.isLoadingData).toBe(false);
  });

  it('falha sem mensagem utilizável: cai no texto padrão', async () => {
    loadMockupTechniques.mockRejectedValue(new Error(''));

    const { result } = renderHook(() => useMockupTechniquesLoad());

    await waitFor(() =>
      expect(result.current.techniquesError).toBe(TECHNIQUES_LOAD_ERROR_FALLBACK),
    );
  });

  it('reloadTechniques refaz a carga e limpa o erro quando ela passa', async () => {
    loadMockupTechniques.mockRejectedValueOnce(new Error('falhou'));
    const { result } = renderHook(() => useMockupTechniquesLoad());
    await waitFor(() => expect(result.current.techniquesError).toBe('falhou'));

    loadMockupTechniques.mockResolvedValueOnce([TECNICA]);
    await act(async () => {
      await result.current.reloadTechniques();
    });

    expect(loadMockupTechniques).toHaveBeenCalledTimes(2);
    expect(result.current.techniquesError).toBeNull();
    expect(result.current.techniques).toEqual([TECNICA]);
  });
});
