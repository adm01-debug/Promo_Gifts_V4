/**
 * Regressão da ficha de aprovação e dos diálogos de comparação.
 *
 * Cobra três defeitos relatados (Codex M35):
 *  1. o mockup era ampliado até 160% dentro de um quadro recortado;
 *  2. o preview tinha largura fixa de 794px e criava rolagem horizontal em
 *     telas estreitas (375px);
 *  3. os diálogos de preview/comparação não tinham título acessível (Radix
 *     caía no título-fallback "Diálogo").
 * Também trava a promessa de que a escala do preview NÃO vaza para o A4
 * exportado (a captura roda com o documento em tamanho real).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockupApprovalPreview } from '../MockupApprovalPreview';
import { MockupApprovalTemplate } from '../MockupApprovalTemplate';
import { MockupCompareDialog } from '../../MockupCompareDialog';
import type { MockupApprovalData } from '@/types/mockup-approval';

const html2canvasMock = vi.hoisted(() => vi.fn());

vi.mock('html2canvas', () => ({ default: html2canvasMock }));

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(() => ({
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    addImage: vi.fn(),
    save: vi.fn(),
  })),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const PAGE_WIDTH = 794;

const approvalData: MockupApprovalData = {
  documentNumber: 'APR-2026/0001',
  date: '08/10/2026',
  client: { name: 'Cliente Teste', cnpj: '12345678000199', contactName: 'Fulano' },
  seller: { name: 'Vendedor Teste', email: 'vendedor@promobrindes.com.br' },
  product: {
    name: 'Caneca Porcelana',
    sku: 'CAN-001',
    color: 'Branco',
    colorHex: '#ffffff',
    material: 'Porcelana',
    capacityMl: 300,
  },
  personalization: {
    techniqueName: 'Laser',
    locationName: 'Frente',
    widthCm: 6,
    heightCm: 4,
    colorsCount: 1,
  },
  pantoneColors: [],
  mockupImageUrl: 'https://example.com/mockup.jpg',
  layoutMode: 'static',
};

function scalerTransform(): { scale: number; raw: string } {
  const scaler = screen.getByTestId('mockup-approval-scaler');
  const raw = scaler.style.transform;
  const match = /scale\(([\d.]+)\)/.exec(raw);
  return { scale: match ? Number(match[1]) : Number.NaN, raw };
}

describe('MockupApprovalTemplate — mockup inteiro dentro do quadro', () => {
  it('renderiza a imagem em contain, sem ampliar além de 100% do quadro', () => {
    render(<MockupApprovalTemplate data={approvalData} />);
    const img = screen.getByAltText('Mockup') as HTMLImageElement;

    expect(img.style.maxWidth).toBe('100%');
    expect(img.style.maxHeight).toBe('100%');
    expect(img.style.objectFit).toBe('contain');
    expect(img.style.maxWidth).not.toBe('160%');
  });

  it('mantém a geometria A4 do documento exportado (794 × 1123)', () => {
    const { container } = render(<MockupApprovalTemplate data={approvalData} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.width).toBe('794px');
    expect(root.style.minHeight).toBe('1123px');
  });
});

describe('MockupApprovalPreview — responsivo e com nome acessível', () => {
  beforeEach(() => {
    html2canvasMock.mockReset();
    html2canvasMock.mockResolvedValue({
      width: 1588,
      height: 2246,
      toDataURL: () => 'data:image/jpeg;base64,STUB',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('escala o A4 para caber em 375px, sem rolagem horizontal', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375);
    render(<MockupApprovalPreview data={approvalData} open onOpenChange={vi.fn()} />);

    const { scale } = scalerTransform();
    expect(Number.isNaN(scale)).toBe(false);
    expect(scale).toBeGreaterThan(0);
    expect(scale).toBeLessThan(1);
    // A largura exibida do A4 cabe na viewport de 375px.
    expect(scale * PAGE_WIDTH).toBeLessThanOrEqual(375);

    const scaler = screen.getByTestId('mockup-approval-scaler');
    const box = scaler.parentElement!;
    expect(parseFloat(box.style.width)).toBeLessThanOrEqual(375);
    // O container do preview não abre rolagem horizontal.
    expect(scaler.closest('.overflow-x-hidden')).not.toBeNull();
  });

  it('não amplia o documento além de 100% em telas largas', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1440);
    render(<MockupApprovalPreview data={approvalData} open onOpenChange={vi.fn()} />);

    expect(scalerTransform().scale).toBe(1);
  });

  it('dá ao diálogo o nome acessível "Aprovação de Layout"', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1440);
    render(<MockupApprovalPreview data={approvalData} open onOpenChange={vi.fn()} />);

    expect(screen.getByRole('dialog')).toHaveAccessibleName(/Aprovação de Layout/);
    expect(screen.queryByText('Diálogo')).toBeNull();
  });

  it('exporta o A4 em tamanho real, neutralizando a escala do preview na captura', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375);
    let capturedTransform = 'NÃO CHAMADO';
    let capturedWidth = '';
    html2canvasMock.mockImplementation((node: HTMLElement) => {
      const scaler = document.querySelector<HTMLElement>('[data-testid="mockup-approval-scaler"]')!;
      capturedTransform = scaler.style.transform;
      capturedWidth = node.style.width;
      return Promise.resolve({
        width: 1588,
        height: 2246,
        toDataURL: () => 'data:image/jpeg;base64,STUB',
      });
    });

    render(<MockupApprovalPreview data={approvalData} open onOpenChange={vi.fn()} />);
    const { scale } = scalerTransform();
    expect(scale).toBeLessThan(1);

    fireEvent.click(screen.getByRole('button', { name: /Baixar PDF/ }));

    await waitFor(() => expect(html2canvasMock).toHaveBeenCalledTimes(1));
    // Durante a captura o documento está em 1:1 (sem herdar a escala do preview)…
    expect(capturedTransform).toBe('none');
    expect(capturedWidth).toBe(`${PAGE_WIDTH}px`);
    // …e a escala do preview é restaurada depois.
    await waitFor(() => {
      expect(scalerTransform().scale).toBeCloseTo(scale, 5);
    });
  });
});

describe('MockupCompareDialog — nome acessível', () => {
  const mockups = [
    {
      id: 'm1',
      product_name: 'Caneca',
      technique_name: 'Laser',
      mockup_url: 'https://example.com/1.jpg',
      layout_url: null,
      created_at: '2026-10-08T10:00:00.000Z',
      client_name: 'Cliente A',
    },
    {
      id: 'm2',
      product_name: 'Squeeze',
      technique_name: 'Silk',
      mockup_url: 'https://example.com/2.jpg',
      layout_url: null,
      created_at: '2026-10-08T11:00:00.000Z',
      client_name: null,
    },
  ];

  it('usa o título "Comparação de Mockups" como nome do diálogo', () => {
    render(
      <MockupCompareDialog open onOpenChange={vi.fn()} mockups={mockups} onDownload={vi.fn()} />,
    );

    expect(screen.getByRole('dialog')).toHaveAccessibleName(/Comparação de Mockups/);
    expect(screen.queryByText('Diálogo')).toBeNull();
  });
});
