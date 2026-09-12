import { describe, expect, it } from 'vitest';
import { isKitMakerLandingRoute } from '@/hooks/kit-builder/useKitBuilderPageState';

describe('Kit Maker route mode', () => {
  it('leaves landing mode when a cloned kit or direct product appears in the URL', () => {
    expect(isKitMakerLandingRoute(null, null)).toBe(true);
    expect(isKitMakerLandingRoute('saved-kit-id', null)).toBe(false);
    expect(isKitMakerLandingRoute(null, 'product-id')).toBe(false);
  });
});
