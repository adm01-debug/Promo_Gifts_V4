/**
 * Fusão histórico + catálogo para o filtro de técnica do histórico de mockups.
 *
 * A lógica saiu de dentro do MockupHistoryPanel para cá por dois motivos: o gate
 * de tamanho de arquivo (o componente já passa de 500 linhas e não pode crescer) e
 * porque assim ela é testável sem subir o Select do Radix no jsdom.
 */
import { describe, it, expect } from 'vitest';
import { buildMockupTechniqueOptions } from '@/components/mockup/mockupTechniqueOptions';

describe('buildMockupTechniqueOptions', () => {
  it('traz a técnica do catálogo que ainda não tem nenhum mockup', () => {
    const options = buildMockupTechniqueOptions(
      [{ technique_name: 'Laser' }],
      [{ name: 'Laser' }, { name: 'Bordado' }],
    );
    expect(options.map((o) => o.name)).toEqual(['Bordado', 'Laser']);
  });

  it('não repete a técnica que está nos dois lugares', () => {
    const options = buildMockupTechniqueOptions(
      [{ technique_name: 'Serigrafia' }, { technique_name: 'Serigrafia' }],
      [{ name: 'Serigrafia' }],
    );
    expect(options).toEqual([{ id: 'Serigrafia', name: 'Serigrafia' }]);
  });

  it('sem catálogo, deriva só do histórico (comportamento anterior)', () => {
    const options = buildMockupTechniqueOptions([
      { technique_name: 'Laser' },
      { technique_name: 'Tampografia' },
    ]);
    expect(options.map((o) => o.name)).toEqual(['Laser', 'Tampografia']);
  });

  it('usa o nome como id, porque o filtro compara com technique_name', () => {
    const [option] = buildMockupTechniqueOptions([], [{ name: 'Laser' }]);
    expect(option).toEqual({ id: 'Laser', name: 'Laser' });
  });

  it('ignora nome vazio, nulo e ausente nas duas fontes', () => {
    const options = buildMockupTechniqueOptions(
      [{ technique_name: '' }, { technique_name: null }, {}],
      [{ name: '' }, { name: null }, {}],
    );
    expect(options).toEqual([]);
  });

  it('ordena por nome, independente da ordem de entrada', () => {
    const options = buildMockupTechniqueOptions(
      [{ technique_name: 'Tampografia' }, { technique_name: 'Bordado' }],
      [{ name: 'Laser' }],
    );
    expect(options.map((o) => o.name)).toEqual(['Bordado', 'Laser', 'Tampografia']);
  });
});
