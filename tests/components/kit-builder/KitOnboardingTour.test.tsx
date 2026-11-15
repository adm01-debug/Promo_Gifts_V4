import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KitOnboardingTour } from '@/components/kit-builder/KitOnboardingTour';

describe('KitOnboardingTour', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists completion when controlled by its parent', () => {
    const onOpenChange = vi.fn();
    render(<KitOnboardingTour open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pular tour' }));

    expect(window.localStorage.getItem('kit-tour-completed')).toBe('1');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
