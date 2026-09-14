import { describe, expect, it } from 'vitest';
import { shouldRenderKitStockForecast } from '@/components/kit-builder/KitSummary';

describe('KitSummary — previsão de estoque', () => {
  it('não promete disponibilidade durante leitura inconclusiva', () => {
    expect(shouldRenderKitStockForecast('checking')).toBe(false);
    expect(shouldRenderKitStockForecast('unknown')).toBe(false);
    expect(shouldRenderKitStockForecast('idle')).toBe(false);
  });

  it('exibe previsão somente após o estoque ser confirmado', () => {
    expect(shouldRenderKitStockForecast('available')).toBe(true);
    expect(shouldRenderKitStockForecast('unavailable')).toBe(true);
  });
});
