import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import * as kitBuilder from '../index';

describe('kit-builder sem mock nem métrica falsa no bundle', () => {
  it('não reexporta fixtures de mock no barrel', () => {
    expect(kitBuilder).not.toHaveProperty('MOCK_BOXES');
    expect(kitBuilder).not.toHaveProperty('MOCK_ITEMS');
  });

  it('não mantém os arquivos abandonados no src', () => {
    expect(existsSync(resolve(process.cwd(), 'src/lib/kit-builder/mock-data.ts'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'src/components/kit-builder/KitHealthCard.tsx'))).toBe(
      false,
    );
  });
});
