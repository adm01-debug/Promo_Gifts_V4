// Fatia 2 do aposentamento de mockup-audit.test.ts: guarda de COMPORTAMENTO no lugar dos blocos estaticos removidos.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { DetectedColor } from '@/hooks/simulation';
import { AreaCard } from '../AreaCard';
import { LogoColorAnalyzer } from '../LogoColorAnalyzer';
import { MockupAnnotations } from '../MockupAnnotations';
import { MockupResultCard } from '../MockupResultCard';
import { SaveTemplateDialog } from '../SaveTemplateDialog';

const color: DetectedColor = {
  name: 'Azul', hex: '#0000ff', selectedPantone: 'PANTONE 286 C',
  pantoneMatch: { pantoneCode: 'PANTONE 286 C', pantoneHex: '#0033a0', deltaE: 1.2 },
};

describe('mockup — fatia 2 do mockup-audit (comportamento)', () => {
  it('SaveTemplateDialog: a label acessivel esta ligada ao input pelo id', () => {
    render(<SaveTemplateDialog open onOpenChange={vi.fn()} templateName="T" onTemplateNameChange={vi.fn()} onSave={vi.fn()} areas={[]} />);
    expect(screen.getByLabelText('Nome do Template')).toHaveAttribute('id', 'template-name-input');
  });

  it('MockupAnnotations: o botao rotulado remove a anotacao e avisa o pai', () => {
    const onChange = vi.fn();
    render(<MockupAnnotations imageUrl="logo.png" annotations={[{ id: 'a1', x: 10, y: 10, text: 'ajustar' }]} onAnnotationsChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remover anotação' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('LogoColorAnalyzer: o dropdown Pantone reflete aberto/fechado em aria-expanded', () => {
    render(<LogoColorAnalyzer colors={[color]} isAnalyzing={false} error={null} onPantoneChange={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: /Selecionar cor Pantone/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: /Selecionar cor Pantone/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('AreaCard e MockupResultCard continuam identificaveis no React DevTools', () => {
    expect(AreaCard.displayName).toBe('AreaCard');
    expect(MockupResultCard.displayName).toBe('MockupResultCard');
  });
});
