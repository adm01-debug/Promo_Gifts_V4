/**
 * Prova que os cards da Biblioteca de Kits contam o status que o app realmente
 * grava. O card "Publicados" contava `['published', 'shared']` — status que
 * `getPersistedKitStatus` (src/lib/kit-builder/persistence.ts:31) nunca produz —
 * e por isso mostrava 0 mesmo com kits prontos na conta do vendedor.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KitLibraryStats } from '../KitLibraryStats';
import type { CustomKitRow } from '@/hooks/kit-builder';

function kit(over: Partial<CustomKitRow>): CustomKitRow {
  return {
    id: crypto.randomUUID(),
    name: 'Kit',
    status: 'draft',
    is_favorite: false,
    ...over,
  } as CustomKitRow;
}

function valorDoCard(label: string): string {
  const rotulo = screen.getByText(label);
  const corpo = rotulo.parentElement;
  if (!corpo) throw new Error(`card "${label}" sem corpo`);
  const valor = corpo.querySelector('p.text-2xl');
  if (!valor) throw new Error(`card "${label}" sem valor`);
  return valor.textContent ?? '';
}

describe('KitLibraryStats', () => {
  const kits = [
    kit({ status: 'draft' }),
    kit({ status: 'draft', is_favorite: true }),
    kit({ status: 'ready' }),
  ];

  it('conta kit terminado como Pronto — e não some com ele', () => {
    render(<KitLibraryStats kits={kits} />);
    expect(valorDoCard('Prontos')).toBe('1');
  });

  it('não existe mais card contando status que o app nunca grava', () => {
    render(<KitLibraryStats kits={kits} />);
    expect(screen.queryByText('Publicados')).toBeNull();
  });

  it('total, rascunhos e favoritos seguem corretos', () => {
    render(<KitLibraryStats kits={kits} />);
    expect(valorDoCard('Total de kits')).toBe('3');
    expect(valorDoCard('Rascunhos')).toBe('2');
    expect(valorDoCard('Favoritos')).toBe('1');
  });

  it('lista vazia não quebra', () => {
    render(<KitLibraryStats kits={[]} />);
    expect(valorDoCard('Prontos')).toBe('0');
  });
});
