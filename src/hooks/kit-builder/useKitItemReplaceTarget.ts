import { useEffect, useState } from 'react';
import { getKitItemLineId, type KitItem } from '@/lib/kit-builder';

/**
 * FT-129: estado do "Trocar item" por linha. Guarda a linha alvo enquanto o usuário volta
 * ao passo de itens; sair desse passo sem concluir a troca limpa o alvo.
 */
export function useKitItemReplaceTarget(items: KitItem[], currentStep: string) {
  const [replaceItemTarget, setReplaceItemTarget] = useState<string | null>(null);

  const replaceTarget = replaceItemTarget
    ? {
        itemId: replaceItemTarget,
        displayName: items.find((i) => getKitItemLineId(i) === replaceItemTarget)?.name ?? 'item',
      }
    : null;

  // Clear replace target whenever the user leaves the items step without completing a swap.
  useEffect(() => {
    if (currentStep !== 'items') {
      setReplaceItemTarget(null);
    }
  }, [currentStep]);

  return { replaceTarget, setReplaceItemTarget };
}
