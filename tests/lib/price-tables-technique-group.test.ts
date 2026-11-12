import { describe, expect, it } from 'vitest';
import { toTechniqueGroup } from '@/lib/external-db/price-tables';

describe('toTechniqueGroup — nome da técnica → grupo_tecnica', () => {
  it.each([
    ['Bordado', 'BORDADO'],
    ['Silk Screen', 'SERIGRAFIA'],
    ['Serigrafia', 'SERIGRAFIA'],
    ['Sublimação', 'SUBLIMACAO'],
    ['Tampografia', 'TAMPOGRAFIA'],
    ['Gravação a Laser', 'LASER'],
    ['Laser CO2', 'LASER_CO2'],
    ['Laser Fibra', 'LASER'],
    ['Adesivo', 'ADESIVO'],
    ['Transfer', 'TRANSFER_DIGITAL'],
    ['DTF', 'TRANSFER_DIGITAL'],
    ['Impressão UV', 'UV_DIGITAL'],
    ['UV_DIGITAL', 'UV_DIGITAL'],
  ])('%s → %s', (name, group) => {
    expect(toTechniqueGroup(name)).toBe(group);
  });

  it('técnica sem regra vira código normalizado', () => {
    expect(toTechniqueGroup('Hot Stamping')).toBe('HOT_STAMPING');
  });
});
