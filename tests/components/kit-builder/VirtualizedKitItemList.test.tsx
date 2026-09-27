import { describe, expect, it } from 'vitest';
import {
  shouldVirtualizeKitItems,
  VIRTUALIZED_KIT_ITEM_THRESHOLD,
} from '@/components/kit-builder/VirtualizedKitItemList';

describe('VirtualizedKitItemList threshold', () => {
  it('keeps small catalogues in the complete DOM and virtualizes larger catalogues', () => {
    expect(shouldVirtualizeKitItems(VIRTUALIZED_KIT_ITEM_THRESHOLD)).toBe(false);
    expect(shouldVirtualizeKitItems(VIRTUALIZED_KIT_ITEM_THRESHOLD + 1)).toBe(true);
  });
});
