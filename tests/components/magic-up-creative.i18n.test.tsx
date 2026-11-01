/**
 * MagicUp — textos em português (E-21)
 *
 * Cobre a correção de i18n da área criativa do Magic Up:
 *  - rótulo das restrições em português ("O que evitar", não "Negative prompt");
 *  - mood devolvido pela IA traduzido por mapa (warm -> Acolhedor etc.);
 *  - mood desconhecido exibido como veio, em itálico, sem quebrar a renderização.
 *
 * O teste chama o componente e os helpers reais — não compara literais com literais.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  MagicUpCreativeControls,
  MagicUpMoodBadge,
  MOOD_LABELS,
  translateMood,
} from '@/components/magic-up/MagicUpCreativeControls';
import { MOOD_COLORS } from '@/components/magic-up/promptGeneratorConstants';
import type { MagicUpCreativeControls as CreativeControlsValue } from '@/pages/magic-up/magicUpStrategy';

const CREATIVE_VALUE: CreativeControlsValue = {
  creativeMode: 'produto-heroi',
  composition: 'centro-limpo',
  aspectRatio: '1:1',
  qualityMode: 'pro-final',
  negativePrompt: ['Sem texto na imagem'],
};

describe('MagicUpCreativeControls — rótulo de restrições em português', () => {
  it('mostra "O que evitar" no lugar do rótulo em inglês "Negative prompt"', () => {
    render(<MagicUpCreativeControls value={CREATIVE_VALUE} onChange={vi.fn()} />);

    expect(screen.getByText('O que evitar')).toBeInTheDocument();
    expect(screen.queryByText('Negative prompt')).toBeNull();
  });
});

describe('translateMood — mapa de moods conhecidos', () => {
  it('traduz para português todos os moods conhecidos', () => {
    expect(translateMood('warm')).toBe('Acolhedor');
    expect(translateMood('elegant')).toBe('Elegante');
    expect(translateMood('dynamic')).toBe('Dinâmico');
    expect(translateMood('serene')).toBe('Sereno');
    expect(translateMood('bold')).toBe('Ousado');
    expect(translateMood('playful')).toBe('Divertido');
    expect(translateMood('professional')).toBe('Profissional');
    expect(translateMood('cozy')).toBe('Aconchegante');
  });

  it('ignora caixa e espaços ao redor do valor vindo da IA', () => {
    expect(translateMood('Warm')).toBe('Acolhedor');
    expect(translateMood('  elegant  ')).toBe('Elegante');
  });

  it('mantém o mapa de rótulos em sincronia com as cores de mood', () => {
    expect(Object.keys(MOOD_LABELS).sort()).toEqual(Object.keys(MOOD_COLORS).sort());
  });

  it('devolve o valor cru quando o mood não está no mapa', () => {
    expect(translateMood('surreal')).toBe('surreal');
    expect(translateMood('')).toBe('');
    // não pode vazar propriedade do protótipo do objeto-mapa
    expect(translateMood('constructor')).toBe('constructor');
  });
});

describe('MagicUpMoodBadge — badge de mood dos cenários gerados pela IA', () => {
  it('mood conhecido: mostra o rótulo em português, sem itálico', () => {
    render(<MagicUpMoodBadge mood="warm" />);

    const badge = screen.getByText('Acolhedor');
    expect(badge).toBeInTheDocument();
    expect(badge.className).not.toContain('italic');
  });

  it('mood desconhecido: mostra a palavra como veio, em itálico, sem quebrar', () => {
    render(<MagicUpMoodBadge mood="surreal" />);

    const badge = screen.getByText('surreal');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('italic');
  });
});
