import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMagazineProductFavorites } from '../useMagazineProductFavorites';

describe('useMagazineProductFavorites', () => {
  beforeEach(() => localStorage.clear());

  it('persiste e alterna favorito', () => {
    const { result } = renderHook(() => useMagazineProductFavorites('u1'));
    act(() => result.current.toggleFavorite('p1'));
    expect(result.current.favorites.has('p1')).toBe(true);
    act(() => result.current.toggleFavorite('p1'));
    expect(result.current.favorites.has('p1')).toBe(false);
  });

  it('não mistura favoritos de usuários diferentes', () => {
    const first = renderHook(() => useMagazineProductFavorites('u1'));
    act(() => first.result.current.toggleFavorite('p1'));
    const second = renderHook(() => useMagazineProductFavorites('u2'));
    expect(second.result.current.favorites.has('p1')).toBe(false);
  });
});
