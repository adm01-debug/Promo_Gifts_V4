import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSecretsManagerSamples,
  getSecretsManagerSamples,
  recordSecretsManagerCall,
} from '@/lib/telemetry/secretsManagerCallMetrics';

describe('secretsManagerCallMetrics — snapshots externos', () => {
  beforeEach(() => {
    clearSecretsManagerSamples();
  });

  it('mantém a referência até mudar e publica uma nova após mutação', () => {
    const emptyA = getSecretsManagerSamples();
    const emptyB = getSecretsManagerSamples();
    expect(emptyB).toBe(emptyA);

    recordSecretsManagerCall({
      action: 'list',
      durationMs: 12,
      ok: true,
    });
    const filledA = getSecretsManagerSamples();
    const filledB = getSecretsManagerSamples();
    expect(filledA).not.toBe(emptyA);
    expect(filledB).toBe(filledA);
    expect(filledA).toHaveLength(1);

    clearSecretsManagerSamples();
    const clearedA = getSecretsManagerSamples();
    const clearedB = getSecretsManagerSamples();
    expect(clearedA).not.toBe(filledA);
    expect(clearedB).toBe(clearedA);
    expect(clearedA).toHaveLength(0);
  });
});
