import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MockupLayoutButtons } from '../approval/MockupLayoutButtons';

vi.mock('../approval/MockupApprovalPreview', () => ({
  MockupApprovalPreview: ({ open }: { open: boolean }) =>
    open ? <div data-testid="approval-preview" /> : null,
}));

const baseProps = {
  generatedMockup: null as string | null,
  product: { name: 'Caneca' },
  technique: { name: 'Silk' },
  client: null,
  seller: null,
  activeArea: {
    logoWidth: 3,
    logoHeight: 3,
    logoPreview: 'data:image/png;base64,logo',
    positionX: 50,
    positionY: 50,
    name: 'Frente',
  },
};

function setup(over: Partial<React.ComponentProps<typeof MockupLayoutButtons>> = {}) {
  const onGenerateMockup = vi.fn().mockResolvedValue(undefined);
  render(
    <TooltipProvider>
      <MockupLayoutButtons {...baseProps} onGenerateMockup={onGenerateMockup} {...over} />
    </TooltipProvider>,
  );
  return { onGenerateMockup };
}

describe('MockupLayoutButtons — Gerar Mockup / Gerar documento', () => {
  it('Gerar Mockup chama a geração e NÃO abre o documento', async () => {
    const { onGenerateMockup } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Gerar Mockup/ }));
    await waitFor(() => expect(onGenerateMockup).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('approval-preview')).toBeNull();
  });

  it('não abre o documento nem quando o mockup chega depois da geração', async () => {
    const { onGenerateMockup } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Gerar Mockup/ }));
    await waitFor(() => expect(onGenerateMockup).toHaveBeenCalled());
    expect(screen.queryByTestId('approval-preview')).toBeNull();
  });

  it('Gerar documento fica desabilitado sem mockup pronto', () => {
    setup({ generatedMockup: null });
    expect(screen.getByRole('button', { name: /Gerar documento/ })).toBeDisabled();
  });

  it('Gerar documento habilitado com mockup pronto abre o documento', () => {
    const { onGenerateMockup } = setup({ generatedMockup: 'https://x/mockup.png' });
    const btn = screen.getByRole('button', { name: /Gerar documento/ });
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    expect(screen.getByTestId('approval-preview')).toBeInTheDocument();
    expect(onGenerateMockup).not.toHaveBeenCalled();
  });

  it('Gerar Mockup fica desabilitado sem logo ou durante a geração', () => {
    setup({ activeArea: { ...baseProps.activeArea, logoPreview: null } });
    expect(screen.getByRole('button', { name: /Gerar Mockup/ })).toBeDisabled();
  });

  it('nenhum texto "IA" nos dois botões', () => {
    setup({ generatedMockup: 'https://x/mockup.png' });
    for (const name of [/Gerar Mockup/, /Gerar documento/]) {
      expect(screen.getByRole('button', { name }).textContent).not.toMatch(/\bIA\b/);
    }
  });

  it('ambos renderizam no breakpoint mobile (sem classes que os escondam)', () => {
    window.innerWidth = 375;
    window.dispatchEvent(new Event('resize'));
    setup({ generatedMockup: 'https://x/mockup.png' });
    const wrapper = screen.getByTestId('mockup-action-buttons');
    expect(wrapper.className).not.toMatch(/\b(hidden|sm:block|md:flex|md:block)\b/);
    for (const name of [/Gerar Mockup/, /Gerar documento/]) {
      const btn = screen.getByRole('button', { name });
      expect(btn).toBeInTheDocument();
      expect(btn.closest('.hidden')).toBeNull();
    }
  });
});
