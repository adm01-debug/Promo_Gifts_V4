/**
 * Como produtos diferentes se distribuem nas caixas: misturados na mesma caixa
 * ou uma caixa (ou mais) por produto.
 *
 * O seletor só aparece quando a escolha muda alguma coisa: com menos de 2
 * produtos distintos que aceitam dividir caixa, não há o que decidir. Produto
 * marcado para ir sempre em caixa própria (`shipsSeparately`) não participa e
 * ganha uma nota, mesmo sem o seletor.
 */
import { useId } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { MixMode } from '@/lib/freight';

export interface MixModeProduct {
  id: string;
  name: string;
  /** `true`: o cadastro manda este produto sempre em caixa própria. */
  shipsSeparately: boolean;
}

interface MixModeSelectorProps {
  value: MixMode;
  onChange: (mode: MixMode) => void;
  products: readonly MixModeProduct[];
}

export function MixModeSelector({ value, onChange, products }: MixModeSelectorProps) {
  const baseId = useId();

  // A mesma linha de produto repetida (mesmo id) conta uma vez.
  const distinct = new Map<string, MixModeProduct>();
  for (const product of products) {
    const previous = distinct.get(product.id);
    distinct.set(product.id, {
      ...product,
      shipsSeparately: product.shipsSeparately || (previous?.shipsSeparately ?? false),
    });
  }
  const mixable = [...distinct.values()].filter((product) => !product.shipsSeparately);
  const ownBox = [...distinct.values()].filter((product) => product.shipsSeparately);
  const showSelector = mixable.length >= 2;
  if (!showSelector && ownBox.length === 0) return null;

  return (
    <div className="space-y-2">
      {showSelector && (
        <RadioGroup
          value={value}
          onValueChange={(next) => {
            if (next === 'misturar' || next === 'separar') onChange(next);
          }}
          aria-label="Como distribuir os produtos nas caixas"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="misturar" id={`${baseId}-misturar`} />
            <Label htmlFor={`${baseId}-misturar`}>Misturar produtos na mesma caixa</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="separar" id={`${baseId}-separar`} />
            <Label htmlFor={`${baseId}-separar`}>Caixas separadas por produto</Label>
          </div>
        </RadioGroup>
      )}
      {ownBox.map((product) => (
        <p key={product.id} className="text-xs text-muted-foreground">
          {product.name} vai em caixa própria (cadastro).
        </p>
      ))}
    </div>
  );
}
