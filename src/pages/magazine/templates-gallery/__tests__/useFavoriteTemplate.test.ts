import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFavoriteTemplate } from '../useFavoriteTemplate';

const KEY = 'magazine:favorite-template:v3:user-1';
const LEGACY_KEY = 'magazine:favorite-template:v2:user-1';

describe('useFavoriteTemplate', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('inicia vazio quando storage está vazio', () => {
    const { result } = renderHook(() => useFavoriteTemplate('user-1'));
    expect(result.current.favoriteIds).toEqual([]);
  });

  it('lê favoritos pré-existentes do localStorage', () => {
    window.localStorage.setItem(KEY, '["editorial-vogue","catalog-grid3x3"]');
    const { result } = renderHook(() => useFavoriteTemplate('user-1'));
    expect(result.current.favoriteIds).toEqual(['editorial-vogue', 'catalog-grid3x3']);
  });

  it('toggleFavorite marca dois ids independentes e persiste', () => {
    const { result } = renderHook(() => useFavoriteTemplate('user-1'));
    act(() => result.current.toggleFavorite('editorial-vogue'));
    act(() => result.current.toggleFavorite('catalog-grid3x3'));
    expect(result.current.favoriteIds).toEqual(['editorial-vogue', 'catalog-grid3x3']);
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual([
      'editorial-vogue',
      'catalog-grid3x3',
    ]);
  });

  it('duas ações no mesmo lote não perdem o primeiro favorito', () => {
    const { result } = renderHook(() => useFavoriteTemplate('user-1'));
    act(() => {
      result.current.toggleFavorite('editorial-vogue');
      result.current.toggleFavorite('catalog-grid3x3');
    });
    expect(result.current.favoriteIds).toEqual(['editorial-vogue', 'catalog-grid3x3']);
  });

  it('toggleFavorite no mesmo id remove só aquele favorito', () => {
    window.localStorage.setItem(KEY, '["catalog-grid3x3","editorial-vogue"]');
    const { result } = renderHook(() => useFavoriteTemplate('user-1'));
    act(() => result.current.toggleFavorite('catalog-grid3x3'));
    expect(result.current.favoriteIds).toEqual(['editorial-vogue']);
  });

  it('clearFavorite limpa storage e estado', () => {
    window.localStorage.setItem(LEGACY_KEY, 'editorial-vogue');
    const { result } = renderHook(() => useFavoriteTemplate('user-1'));
    act(() => result.current.clearFavorite());
    expect(result.current.favoriteIds).toEqual([]);
    expect(window.localStorage.getItem(KEY)).toBe('[]');
  });

  it('migra sem perda o favorito único v2 quando não existe v3', () => {
    window.localStorage.setItem(LEGACY_KEY, 'editorial-vogue');
    const { result } = renderHook(() => useFavoriteTemplate('user-1'));
    expect(result.current.favoriteIds).toEqual(['editorial-vogue']);
    act(() => result.current.toggleFavorite('catalog-grid3x3'));
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual([
      'editorial-vogue',
      'catalog-grid3x3',
    ]);
  });

  it('rejeita JSON corrompido, ids inválidos e lista grande', () => {
    window.localStorage.setItem(KEY, '{');
    const broken = renderHook(() => useFavoriteTemplate('user-1'));
    expect(broken.result.current.favoriteIds).toEqual([]);
    broken.unmount();
    window.localStorage.setItem(KEY, JSON.stringify(['a'.repeat(200)]));
    const invalid = renderHook(() => useFavoriteTemplate('user-1'));
    expect(invalid.result.current.favoriteIds).toEqual([]);
    invalid.unmount();
    window.localStorage.setItem(KEY, JSON.stringify(Array.from({ length: 25 }, (_, i) => `${i}`)));
    const { result } = renderHook(() => useFavoriteTemplate('user-1'));
    expect(result.current.favoriteIds).toEqual([]);
  });

  it('isola favoritos entre usuários no mesmo navegador', () => {
    window.localStorage.setItem(KEY, '["editorial-vogue"]');
    const first = renderHook(() => useFavoriteTemplate('user-1'));
    const second = renderHook(() => useFavoriteTemplate('user-2'));
    expect(first.result.current.favoriteIds).toEqual(['editorial-vogue']);
    expect(second.result.current.favoriteIds).toEqual([]);
  });

  it('troca de conta não exibe favoritos da conta anterior', () => {
    window.localStorage.setItem(KEY, '["editorial-vogue"]');
    const { result, rerender } = renderHook(({ id }) => useFavoriteTemplate(id), {
      initialProps: { id: 'user-1' },
    });
    expect(result.current.favoriteIds).toEqual(['editorial-vogue']);
    rerender({ id: 'user-2' });
    expect(result.current.favoriteIds).toEqual([]);
  });

  it('sincroniza mudança de outra aba', () => {
    const { result } = renderHook(() => useFavoriteTemplate('user-1'));
    window.localStorage.setItem(KEY, '["editorial-vogue"]');
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: KEY })));
    expect(result.current.favoriteIds).toEqual(['editorial-vogue']);
  });
});
