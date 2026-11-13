import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { ContextType } from 'react';
import { ThemeInitializer } from '../components/ThemeInitializer';
import { ThemeContext } from '../contexts/ThemeContext';
import * as themePresets from '../lib/theme-presets';

// Exercise the real initializer/context; only the skin application/storage boundary
// is replaced. Constants remain real so cross-tab synchronization uses its actual key.
vi.mock('../lib/theme-presets', async (importOriginal) => {
  const actual = await importOriginal<typeof themePresets>();
  return { ...actual, loadThemeConfig: vi.fn(), applyThemePreset: vi.fn(), applyRadius: vi.fn() };
});
function context(): NonNullable<ContextType<typeof ThemeContext>> {
  return {
    theme: 'dark', actualTheme: 'dark', tooltipStyle: 'standard',
    setTheme: vi.fn(), toggleTheme: vi.fn(), setTooltipStyle: vi.fn(),
  };
}
function renderInitializer() {
  return render(<ThemeContext.Provider value={context()}><ThemeInitializer /></ThemeContext.Provider>);
}
function storage(key: string, newValue: string | null) {
  window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
}

describe('ThemeInitializer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(themePresets.loadThemeConfig).mockReturnValue({ presetId: 'default', radius: 4, mode: 'light' });
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('should not call apply functions if ThemeContext is not available', () => {
    render(<ThemeInitializer />);
    expect(themePresets.loadThemeConfig).not.toHaveBeenCalled();
    expect(themePresets.applyThemePreset).not.toHaveBeenCalled();
    expect(themePresets.applyRadius).not.toHaveBeenCalled();
  });

  it('should call apply functions when ThemeContext is available', () => {
    renderInitializer();
    expect(themePresets.applyThemePreset).toHaveBeenCalledExactlyOnceWith('default', 'dark');
    expect(themePresets.applyRadius).toHaveBeenCalledExactlyOnceWith(4);
  });

  it('should re-apply safely when the dark-only context is recreated during HMR', () => {
    const { rerender } = renderInitializer();
    expect(themePresets.applyThemePreset).toHaveBeenCalledExactlyOnceWith('default', 'dark');
    rerender(<ThemeContext.Provider value={context()}><ThemeInitializer /></ThemeContext.Provider>);
    expect(vi.mocked(themePresets.applyThemePreset).mock.calls).toEqual([['default', 'dark'], ['default', 'dark']]);
    expect(vi.mocked(themePresets.applyRadius).mock.calls).toEqual([[4], [4]]);
  });

  it.each(['light', 'dark', 'auto'] as const)('keeps the planned dark lock for a stored %s mode', mode => {
    const media = vi.spyOn(window, 'matchMedia');
    vi.mocked(themePresets.loadThemeConfig).mockReturnValue({ presetId: 'corporate', radius: 14, mode });
    renderInitializer();
    expect(themePresets.applyThemePreset).toHaveBeenCalledExactlyOnceWith('corporate', 'dark');
    expect(themePresets.applyRadius).toHaveBeenCalledExactlyOnceWith(14);
    expect(media).not.toHaveBeenCalled();
  });

  it('synchronizes a valid cross-tab skin and radius while preserving the dark lock', () => {
    renderInitializer(); vi.clearAllMocks();
    storage(themePresets.STORAGE_KEY, JSON.stringify({ presetId: 'corporate', radius: 12, mode: 'light' }));
    expect(themePresets.applyThemePreset).toHaveBeenCalledExactlyOnceWith('corporate', 'dark');
    expect(themePresets.applyRadius).toHaveBeenCalledExactlyOnceWith(12);
  });

  it.each([
    { key: 'unrelated-storage', value: JSON.stringify({ presetId: 'corporate', radius: 12, mode: 'dark' }) },
    { key: themePresets.STORAGE_KEY, value: null },
    { key: themePresets.STORAGE_KEY, value: '{' },
  ])('ignores unrelated, removed or malformed storage without applying a skin: %j', ({ key, value }) => {
    renderInitializer(); vi.clearAllMocks();
    storage(key, value);
    expect(themePresets.applyThemePreset).not.toHaveBeenCalled();
    expect(themePresets.applyRadius).not.toHaveBeenCalled();
  });

  it('removes the cross-tab listener on unmount', () => {
    const { unmount } = renderInitializer(); unmount(); vi.clearAllMocks();
    storage(themePresets.STORAGE_KEY, JSON.stringify({ presetId: 'corporate', radius: 12, mode: 'dark' }));
    expect(themePresets.applyThemePreset).not.toHaveBeenCalled();
    expect(themePresets.applyRadius).not.toHaveBeenCalled();
  });
});
