import { fireEvent, render, screen } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { KitMakerGuideDialog } from '@/components/kit-builder/KitMakerGuideDialog';
import { KIT_MAKER_GUIDE_CHAPTERS } from '@/lib/kit-builder';

describe('KitMakerGuideDialog', () => {
  it('renders every chapter as a navigation entry', () => {
    render(<KitMakerGuideDialog open onOpenChange={vi.fn()} />);

    KIT_MAKER_GUIDE_CHAPTERS.forEach((chapter) => {
      expect(screen.getByRole('button', { name: chapter.title })).toBeInTheDocument();
    });
  });

  it('opens on the "Itens" chapter by default', () => {
    render(<KitMakerGuideDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Itens' })).toBeInTheDocument();
    const items = KIT_MAKER_GUIDE_CHAPTERS.find((c) => c.id === 'items')!;
    expect(screen.getByText(items.content)).toBeInTheDocument();
  });

  it.each(KIT_MAKER_GUIDE_CHAPTERS)('opens directly on the $title chapter when requested', (chapter) => {
    render(<KitMakerGuideDialog open onOpenChange={vi.fn()} initialChapter={chapter.id} />);

    expect(screen.getByRole('heading', { name: chapter.title })).toBeInTheDocument();
    expect(screen.getByText(chapter.content)).toBeInTheDocument();
  });

  it('switches chapter content when a different chapter is clicked', () => {
    render(<KitMakerGuideDialog open onOpenChange={vi.fn()} initialChapter="items" />);

    fireEvent.click(screen.getByRole('button', { name: 'Caixa' }));

    const box = KIT_MAKER_GUIDE_CHAPTERS.find((c) => c.id === 'box')!;
    expect(screen.getByRole('heading', { name: 'Caixa' })).toBeInTheDocument();
    expect(screen.getByText(box.content)).toBeInTheDocument();
  });

  it('does not render dialog content when closed', () => {
    render(<KitMakerGuideDialog open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByText('Guia do Kit Maker')).not.toBeInTheDocument();
  });
});
