import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SaveTemplateDialog } from '../SaveTemplateDialog';
import { MockupAnnotations } from '../MockupAnnotations';
import { LogoColorAnalyzer } from '../LogoColorAnalyzer';

const color = {
  name: 'Azul',
  hex: '#0000ff',
  selectedPantone: 'PANTONE 286 C',
  pantoneMatch: { pantoneCode: 'PANTONE 286 C', pantoneHex: '#0033a0', deltaE: 1.2 },
};

describe('mockup a11y — fatia 2 do mockup-audit', () => {
  it('SaveTemplateDialog associa a label ao input via htmlFor/id', () => {
    render(<SaveTemplateDialog open onOpenChange={vi.fn()} templateName="T" onTemplateNameChange={vi.fn()} onSave={vi.fn()} areas={[]} />);
    expect(screen.getByLabelText('Nome do Template')).toHaveAttribute('id', 'template-name-input');
  });

  it('MockupAnnotations remove a anotacao pelo botao com aria-label', () => {
    const onChange = vi.fn();
    render(<MockupAnnotations imageUrl="logo.png" annotations={[{ id: 'a1', x: 10, y: 10, text: 'ajustar' }]} onAnnotationsChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remover anotação' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('LogoColorAnalyzer expoe aria-label e aria-expanded no dropdown Pantone', () => {
    render(<LogoColorAnalyzer colors={[color]} isAnalyzing={false} error={null} onPantoneChange={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: /Selecionar cor Pantone/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: /Selecionar cor Pantone/ })).toHaveAttribute('aria-expanded', 'true');
  });
});
