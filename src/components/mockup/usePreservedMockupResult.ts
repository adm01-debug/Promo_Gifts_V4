/**
 * usePreservedMockupResult — dono do "resultado anterior" do card de mockup.
 *
 * Uma tentativa que FALHA não apaga da tela o mockup que o vendedor já tinha,
 * mas esse resultado preservado tem duas amarras:
 *
 *  • ele pertence a UM projeto. `projectResetCount` muda ("Criar novo mockup"
 *    ou troca de cliente) e o resultado é descartado — sem isso a imagem do
 *    cliente anterior reaparecia sob o nome do produto novo.
 *  • a falha é lembrada aqui, não no alerta. Dispensar o alerta de erro zera
 *    `generationError` e isso NÃO pode descartar o resultado nem o rótulo de
 *    "imagem anterior".
 */
import { useEffect, useRef, useState } from 'react';

interface PreservedMockupResultArgs {
  generatedMockup: string | null;
  generationError?: string | null;
  /** Contador de reset do projeto: muda ⇒ o resultado anterior não é mais deste projeto. */
  projectResetCount?: number;
}

export function usePreservedMockupResult({
  generatedMockup,
  generationError,
  projectResetCount = 0,
}: PreservedMockupResultArgs): { displayedMockup: string | null; showsPreviousResult: boolean } {
  const [lastGeneratedMockup, setLastGeneratedMockup] = useState<string | null>(generatedMockup);
  const [lastAttemptFailed, setLastAttemptFailed] = useState(false);
  // Ref para não descartar nada na montagem (só quando o contador MUDA de verdade).
  const resetCountRef = useRef(projectResetCount);

  // Sucesso novo vira o resultado atual: o anterior sai de cena na hora.
  useEffect(() => {
    if (!generatedMockup) return;
    setLastGeneratedMockup(generatedMockup);
    setLastAttemptFailed(false);
  }, [generatedMockup]);

  useEffect(() => {
    if (generationError) setLastAttemptFailed(true);
  }, [generationError]);

  useEffect(() => {
    if (resetCountRef.current === projectResetCount) return;
    resetCountRef.current = projectResetCount;
    setLastGeneratedMockup(null);
    setLastAttemptFailed(false);
  }, [projectResetCount]);

  const showsPreviousResult = !generatedMockup && lastAttemptFailed && !!lastGeneratedMockup;
  return {
    showsPreviousResult,
    displayedMockup: generatedMockup ?? (showsPreviousResult ? lastGeneratedMockup : null),
  };
}
