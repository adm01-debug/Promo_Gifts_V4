import { fireEvent, screen } from '@testing-library/react';
import { type PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../render-helpers';
import { MockupHistoryPanel } from '@/components/mockup/MockupHistoryPanel';
import type { GeneratedMockup } from '@/hooks/mockup/mockupGenerationService';

vi.mock('@/components/products/LayoutPopover', () => ({ LayoutPopover: () => null }));
vi.mock('@/components/mockup/MockupCompareDialog', () => ({ MockupCompareDialog: () => null }));
vi.mock('@/components/mockup/MockupLightbox', () => ({ MockupLightbox: () => null }));
vi.mock('@/components/mockup/ShareMenu', () => ({ ShareMenu: () => null }));
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: PropsWithChildren<{ value: string; onValueChange: (value: string) => void }>) => (
    <select value={value} onChange={(event) => onValueChange(event.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: PropsWithChildren) => <>{children}</>,
  SelectItem: ({ children, value }: PropsWithChildren<{ value: string }>) => (
    <option value={value}>{children}</option>
  ),
}));
const base: GeneratedMockup = {
  id: 'm1',
  product_id: 'p1',
  product_name: 'Caneta Laser',
  product_sku: null,
  technique_id: 'old-laser',
  technique_name: 'Laser',
  mockup_url: 'https://example.com/a.jpg',
  logo_url: null,
  position_x: null,
  position_y: null,
  logo_width_cm: null,
  logo_height_cm: null,
  created_at: '2026-11-10T00:00:00Z',
  client_id: null,
};

describe('MockupHistoryPanel optional catalog techniques', () => {
  it('merges catalog and history without losing historical techniques, deduplicates labels, and filters real rows', () => {
    renderWithProviders(
      <MockupHistoryPanel
        mockupHistory={[
          base,
          {
            ...base,
            id: 'm2',
            product_name: 'Caderno Silk',
            technique_id: 'old-silk',
            technique_name: 'Silk',
          },
        ]}
        techniques={[
          { id: 'current-laser', name: 'Laser' },
          { id: 'uv', name: 'UV' },
        ]}
        isLoading={false}
        clients={[]}
        onLoadFromHistory={vi.fn()}
        onDownload={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const laser = screen.getByRole('option', { name: 'Laser' });
    const select = laser.closest('select')!;
    expect(screen.getAllByRole('option', { name: 'Laser' })).toHaveLength(1);
    expect(screen.getByRole('option', { name: 'Silk' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'UV' })).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'Laser' } });
    expect(screen.getByText('Caneta Laser')).toBeInTheDocument();
    expect(screen.queryByText('Caderno Silk')).not.toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'UV' } });
    expect(screen.queryByText('Caneta Laser')).not.toBeInTheDocument();
    expect(screen.queryByText('Caderno Silk')).not.toBeInTheDocument();
  });
});
