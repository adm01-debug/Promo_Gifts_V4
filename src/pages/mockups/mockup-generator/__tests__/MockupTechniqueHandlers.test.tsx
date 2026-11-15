import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// sonner é a única dependência externa do hook; mockamos para poder asserir o aviso.
vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { toast } from 'sonner';
import { useTechniqueHandlers } from '../MockupTechniqueHandlers';
import { classifyTechnique } from '@/components/mockup/techniqueColorUtils';
import type { MockupTechnique } from '@/types/external-db';

// Fixtures: cada técnica carrega a sua "área" (locationName/maxWidth/maxHeight) além
// do nome/código que a classificação de cores consome.
const DIGITAL: MockupTechnique = {
  id: 't-dig',
  name: 'Sublimação',
  code: 'SUB',
  locationName: 'Frente',
  maxWidth: 10,
  maxHeight: 8,
};
const DIGITAL_B: MockupTechnique = { id: 't-uv', name: 'UV Direto' };
const LASER: MockupTechnique = { id: 't-las', name: 'Laser CO2', code: 'LAS' };
const LASER_UV: MockupTechnique = { id: 't-luv', name: 'Laser UV', code: 'LUV' };
const SERIGRAFIA: MockupTechnique = { id: 't-ser', name: 'Serigrafia', code: 'SER' };

type Overrides = Partial<Parameters<typeof useTechniqueHandlers>[0]>;

function setup(overrides: Overrides = {}) {
  const setSelectedTechnique = vi.fn();
  const setGeneratedMockup = vi.fn();
  const setTechniqueColorConfig = vi.fn();

  const props = {
    hasLogo: false,
    selectedTechnique: null as MockupTechnique | null,
    setSelectedTechnique,
    setGeneratedMockup,
    setTechniqueColorConfig,
    ...overrides,
  };

  const view = renderHook((p: typeof props) => useTechniqueHandlers(p), {
    initialProps: props,
  });

  return { ...view, setSelectedTechnique, setGeneratedMockup, setTechniqueColorConfig };
}

describe('useTechniqueHandlers — escolher técnica', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aplica a técnica na hora, limpa o mockup gerado e carrega a área da técnica', () => {
    const { result, setSelectedTechnique, setGeneratedMockup, setTechniqueColorConfig } = setup();

    act(() => result.current.handleTechniqueChange(DIGITAL));

    // "área": a técnica inteira (com locationName/limites) vai para o gerador.
    expect(setSelectedTechnique).toHaveBeenCalledTimes(1);
    const applied = setSelectedTechnique.mock.calls[0][0] as MockupTechnique;
    expect(applied).toBe(DIGITAL);
    expect(applied).toMatchObject({ locationName: 'Frente', maxWidth: 10, maxHeight: 8 });

    // o mockup anterior (que refletia a área/cores antigas) é descartado
    expect(setGeneratedMockup).toHaveBeenCalledWith(null);

    // "cores": digital não exige config → grava cor cheia e NÃO abre diálogo
    expect(setTechniqueColorConfig).toHaveBeenCalledWith({
      category: 'digital',
      isFullColor: true,
    });
    expect(result.current.colorConfigDialogOpen).toBe(false);
    expect(result.current.techniqueChangeDialogOpen).toBe(false);
  });

  it('técnica que exige configuração de cores (laser) abre o diálogo e não grava config direto', () => {
    const { result, setSelectedTechnique, setTechniqueColorConfig } = setup();

    act(() => result.current.handleTechniqueChange(LASER));

    expect(setSelectedTechnique).toHaveBeenCalledWith(LASER);
    expect(setTechniqueColorConfig).toHaveBeenCalledWith(null);
    expect(result.current.colorConfigDialogOpen).toBe(true);
  });

  it('serigrafia também exige configuração de cores', () => {
    const { result, setTechniqueColorConfig } = setup();

    act(() => result.current.handleTechniqueChange(SERIGRAFIA));

    expect(result.current.colorConfigDialogOpen).toBe(true);
    expect(setTechniqueColorConfig).toHaveBeenCalledWith(null);
  });

  it('escolher null limpa técnica, mockup e config, sem abrir nenhum diálogo', () => {
    const { result, setSelectedTechnique, setGeneratedMockup, setTechniqueColorConfig } = setup({
      hasLogo: true,
      selectedTechnique: DIGITAL,
    });

    act(() => result.current.handleTechniqueChange(null));

    expect(setSelectedTechnique).toHaveBeenCalledWith(null);
    expect(setGeneratedMockup).toHaveBeenCalledWith(null);
    expect(setTechniqueColorConfig).toHaveBeenCalledWith(null);
    expect(result.current.colorConfigDialogOpen).toBe(false);
    expect(result.current.techniqueChangeDialogOpen).toBe(false);
  });
});

describe('useTechniqueHandlers — recusa de troca com logo aplicado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('com logo e outra técnica já escolhida, a troca é recusada: nada é aplicado, fica pendente e abre o diálogo', () => {
    const { result, setSelectedTechnique, setGeneratedMockup, setTechniqueColorConfig } = setup({
      hasLogo: true,
      selectedTechnique: DIGITAL,
    });

    act(() => result.current.handleTechniqueChange(LASER));

    // a troca NÃO foi aplicada ao gerador
    expect(setSelectedTechnique).not.toHaveBeenCalled();
    expect(setGeneratedMockup).not.toHaveBeenCalled();
    expect(setTechniqueColorConfig).not.toHaveBeenCalled();

    // mas foi guardada como pendente para confirmação
    expect(result.current.pendingTechnique).toBe(LASER);
    expect(result.current.techniqueChangeDialogOpen).toBe(true);
  });

  it('com logo, reescolher a MESMA técnica (id idêntico) não é recusada', () => {
    const { result, setSelectedTechnique } = setup({
      hasLogo: true,
      selectedTechnique: DIGITAL,
    });

    act(() => result.current.handleTechniqueChange({ ...DIGITAL }));

    expect(setSelectedTechnique).toHaveBeenCalledTimes(1);
    expect(result.current.techniqueChangeDialogOpen).toBe(false);
  });

  it('com logo mas sem técnica escolhida, a primeira escolha aplica direto', () => {
    const { result, setSelectedTechnique } = setup({ hasLogo: true, selectedTechnique: null });

    act(() => result.current.handleTechniqueChange(DIGITAL));

    expect(setSelectedTechnique).toHaveBeenCalledWith(DIGITAL);
    expect(result.current.techniqueChangeDialogOpen).toBe(false);
  });

  it('sem logo, trocar de técnica NÃO é recusada', () => {
    const { result, setSelectedTechnique } = setup({
      hasLogo: false,
      selectedTechnique: DIGITAL,
    });

    act(() => result.current.handleTechniqueChange(LASER));

    expect(setSelectedTechnique).toHaveBeenCalledWith(LASER);
    expect(result.current.techniqueChangeDialogOpen).toBe(false);
  });
});

describe('useTechniqueHandlers — confirmar a troca pendente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aplica a pendente, limpa o mockup, fecha o diálogo, avisa via toast e define as cores', () => {
    const { result, setSelectedTechnique, setGeneratedMockup, setTechniqueColorConfig } = setup({
      hasLogo: true,
      selectedTechnique: DIGITAL,
    });

    act(() => result.current.handleTechniqueChange(DIGITAL_B));
    act(() => result.current.confirmTechniqueChange());

    expect(setSelectedTechnique).toHaveBeenCalledWith(DIGITAL_B);
    expect(setGeneratedMockup).toHaveBeenCalledWith(null);
    expect(result.current.techniqueChangeDialogOpen).toBe(false);
    expect(result.current.pendingTechnique).toBeNull();
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('UV Direto'), {
      duration: 3000,
    });
    expect(setTechniqueColorConfig).toHaveBeenCalledWith({
      category: 'digital',
      isFullColor: true,
    });
  });

  it('confirmar técnica que exige cores adia o diálogo em 300ms (não abre imediatamente)', () => {
    vi.useFakeTimers();
    const { result, setTechniqueColorConfig } = setup({
      hasLogo: true,
      selectedTechnique: DIGITAL,
    });

    act(() => result.current.handleTechniqueChange(LASER));
    act(() => result.current.confirmTechniqueChange());

    expect(setTechniqueColorConfig).toHaveBeenCalledWith(null);
    expect(result.current.colorConfigDialogOpen).toBe(false);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.colorConfigDialogOpen).toBe(true);
  });

  it('confirmar sem pendente só fecha o diálogo, sem aplicar nada', () => {
    const { result, setSelectedTechnique, setGeneratedMockup, setTechniqueColorConfig } = setup();

    act(() => result.current.confirmTechniqueChange());

    expect(setSelectedTechnique).not.toHaveBeenCalled();
    expect(setGeneratedMockup).not.toHaveBeenCalled();
    expect(setTechniqueColorConfig).not.toHaveBeenCalled();
    expect(result.current.techniqueChangeDialogOpen).toBe(false);
  });
});

describe('useTechniqueHandlers — regra de classificação (falha se a regra mudar)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Laser UV é cor cheia (digital) — a exceção "laser uv → digital" precisa vencer o teste de laser', () => {
    const { result, setTechniqueColorConfig } = setup();

    act(() => result.current.handleTechniqueChange(LASER_UV));

    // Se a ordem das regras em classifyTechnique mudar (laser antes de laser-uv),
    // isto vira { category: 'laser' } e o diálogo de cores abriria — o teste falha.
    expect(setTechniqueColorConfig).toHaveBeenCalledWith({
      category: 'digital',
      isFullColor: true,
    });
    expect(result.current.colorConfigDialogOpen).toBe(false);
  });

  it('a categoria gravada é derivada de classifyTechnique(nome, código)', () => {
    for (const technique of [DIGITAL, LASER_UV, LASER, SERIGRAFIA]) {
      const { result, setTechniqueColorConfig } = setup();

      act(() => result.current.handleTechniqueChange(technique));

      const category = classifyTechnique(technique.name, technique.code);
      if (category === 'laser' || category === 'serigrafia') {
        // exige config → não grava categoria, abre o diálogo
        expect(setTechniqueColorConfig).toHaveBeenCalledWith(null);
        expect(result.current.colorConfigDialogOpen).toBe(true);
      } else {
        expect(setTechniqueColorConfig).toHaveBeenCalledWith({ category, isFullColor: true });
      }
    }
  });
});
