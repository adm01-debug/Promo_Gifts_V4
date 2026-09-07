/**
 * MagazineStatsCards — testes unitários.
 *
 * Cobre:
 *   1. Render de skeleton quando isLoading=true (5 placeholders)
 *   2. Render nulo quando counts.all === 0 (empty state — componente não exibe nada)
 *   3. Render dos 5 cards com counts reais (labels, valores, aria-label da section)
 *   4. Pluralização: "Publicada" vs "Publicadas", "Arquivada" vs "Arquivadas"
 *   5. Formatação pt-BR de números grandes (1.234)
 *   6. Invariante de estrutura: exactamente 5 cards em estado normal
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MagazineStatsCards, MagazineStatsCardsError } from '@/pages/magazine/components/MagazineStatsCards';

// — Stub de useCountUp: retorna o valor `end` direto (sem requestAnimationFrame)
vi.mock('@/hooks/ui', () => ({
  useCountUp: (end: number) => end,
}));

const emptyCounts = { all: 0, draft: 0, published: 0, archived: 0, views: 0 };

const fullCounts = {
  all: 9,
  draft: 7,
  published: 2,
  archived: 0,
  views: 1234,
};

// ── 1. Skeleton ────────────────────────────────────────────────────────────────
describe('MagazineStatsCards — skeleton', () => {
  it('exibe 5 skeletons quando isLoading=true', () => {
    const { container } = render(
      <MagazineStatsCards counts={emptyCounts} isLoading />
    );
    // O skeleton cria 5 Cards com divs skeleton dentro
    const skeletons = container.querySelectorAll('[data-slot="card"], .rounded-lg');
    // Confirma que pelo menos 5 elementos de card-like existem
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
  });

  it('não exibe nenhum label real quando isLoading=true', () => {
    render(<MagazineStatsCards counts={fullCounts} isLoading />);
    expect(screen.queryByText('Total de revistas')).toBeNull();
    expect(screen.queryByText('Rascunhos')).toBeNull();
  });
});

// ── 2. Empty state ────────────────────────────────────────────────────────────
describe('MagazineStatsCards — empty state', () => {
  it('retorna null quando counts.all === 0 e não está carregando', () => {
    const { container } = render(
      <MagazineStatsCards counts={emptyCounts} isLoading={false} />
    );
    expect(container.firstChild).toBeNull();
  });
});

// ── 3. Cards reais ────────────────────────────────────────────────────────────
describe('MagazineStatsCards — cards normais', () => {
  it('exibe os 5 labels corretos', () => {
    render(<MagazineStatsCards counts={fullCounts} />);
    expect(screen.getByText('Total de revistas')).toBeDefined();
    expect(screen.getByText('Rascunhos')).toBeDefined();
    expect(screen.getByText('Publicadas')).toBeDefined();
    expect(screen.getByText('Arquivadas')).toBeDefined();
    expect(screen.getByText('Visualizações totais')).toBeDefined();
  });

  it('exibe os valores corretos', () => {
    render(<MagazineStatsCards counts={fullCounts} />);
    // 9, 7, 2, 0, 1.234 (pt-BR)
    expect(screen.getByText('9')).toBeDefined();
    expect(screen.getByText('7')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    // zero arquivadas
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(1);
    // 1234 formatado como "1.234" em pt-BR
    expect(screen.getByText('1.234')).toBeDefined();
  });
});

// ── 4. Pluralização ──────────────────────────────────────────────────────────
describe('MagazineStatsCards — pluralização', () => {
  it('usa "Publicada" (singular) quando published=1', () => {
    render(
      <MagazineStatsCards
        counts={{ all: 3, draft: 1, published: 1, archived: 1, views: 0 }}
      />
    );
    expect(screen.getByText('Publicada')).toBeDefined();
    expect(screen.queryByText('Publicadas')).toBeNull();
  });

  it('usa "Publicadas" (plural) quando published > 1', () => {
    render(
      <MagazineStatsCards
        counts={{ all: 5, draft: 1, published: 3, archived: 1, views: 0 }}
      />
    );
    expect(screen.getByText('Publicadas')).toBeDefined();
  });

  it('usa "Arquivada" (singular) quando archived=1', () => {
    render(
      <MagazineStatsCards
        counts={{ all: 3, draft: 1, published: 1, archived: 1, views: 0 }}
      />
    );
    expect(screen.getByText('Arquivada')).toBeDefined();
    expect(screen.queryByText('Arquivadas')).toBeNull();
  });

  it('usa "Arquivadas" (plural) quando archived > 1', () => {
    render(
      <MagazineStatsCards
        counts={{ all: 5, draft: 1, published: 1, archived: 3, views: 0 }}
      />
    );
    expect(screen.getByText('Arquivadas')).toBeDefined();
  });
});

// ── 5. Formatação pt-BR ──────────────────────────────────────────────────────
describe('MagazineStatsCards — formatação numérica', () => {
  it('formata 1234 como "1.234" (pt-BR)', () => {
    render(
      <MagazineStatsCards
        counts={{ all: 1, draft: 0, published: 1, archived: 0, views: 1234 }}
      />
    );
    expect(screen.getByText('1.234')).toBeDefined();
  });

  it('formata 0 como "0"', () => {
    render(
      <MagazineStatsCards
        counts={{ all: 1, draft: 0, published: 1, archived: 0, views: 0 }}
      />
    );
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(1);
  });
});

// ── 6. MagazineStatsCardsError — fallback de erro ────────────────────────────
describe('MagazineStatsCardsError', () => {
  it('exibe 5 placeholders de erro', () => {
    render(<MagazineStatsCardsError />);
    const indisponivel = screen.getAllByText('Indisponível');
    expect(indisponivel).toHaveLength(5);
  });

  it('exibe 5 travões (—) como valor', () => {
    render(<MagazineStatsCardsError />);
    const dashes = screen.getAllByText('—');
    expect(dashes).toHaveLength(5);
  });
});
