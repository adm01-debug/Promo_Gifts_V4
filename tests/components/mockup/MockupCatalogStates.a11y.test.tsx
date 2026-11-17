/**
 * Acessibilidade dos estados do catálogo de produtos do mockup.
 *
 * `CatalogGridSkeleton` era uma grade de `div`s sem `role` nem `aria-busy`: quem usa
 * leitor de tela não recebia aviso nenhum enquanto o catálogo carregava e não sabia se a
 * busca estava em andamento ou se não achou nada. O diálogo ficava em silêncio.
 *
 * Estes casos travam o anúncio. Resgatado de importado/vps-fabrica/v2/s75-2610081948.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CatalogGridSkeleton } from '@/components/mockup/MockupCatalogStates';

describe('CatalogGridSkeleton — anúncio de carregamento', () => {
  it('expõe role=status com aria-busy e o texto para leitor de tela', () => {
    render(<CatalogGridSkeleton />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText(/carregando produtos do catálogo/i)).toBeInTheDocument();
  });

  it('os blocos visuais ficam fora da árvore de acessibilidade', () => {
    const { container } = render(<CatalogGridSkeleton />);

    const status = screen.getByRole('status');
    const blocos = Array.from(status.children).filter((el) => el.tagName === 'DIV');

    // 12 cartões decorativos, todos aria-hidden: sem isso o leitor lê 12 blocos vazios.
    expect(blocos.length).toBeGreaterThan(0);
    for (const bloco of blocos) {
      expect(bloco).toHaveAttribute('aria-hidden', 'true');
    }

    // Nenhum outro role competindo com o status dentro do skeleton.
    expect(container.querySelectorAll('[role]')).toHaveLength(1);
  });
});
