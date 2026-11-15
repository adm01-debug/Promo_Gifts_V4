/**
 * useMockupTechniquesLoad — carga das técnicas de personalização do gerador de mockup.
 *
 * A-estados: a carga era imperativa dentro de useMockupGenerator e o erro só virava toast. Quando
 * a lista falhava, o painel ficava sem opções e o vendedor não sabia se o produto não aceita
 * personalização ou se o sistema quebrou. Aqui o erro vira ESTADO (`techniquesError`) e a carga
 * ganha nome (`reloadTechniques`), que é o retry da mesma carga que falhou.
 *
 * Mora em módulo próprio porque useMockupGenerator.ts está no ratchet de tamanho de arquivo
 * (baseline 894 linhas): o estado e a carga moram aqui, o hook só consome.
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { loadMockupTechniques } from '@/hooks/mockup/mockupGeneratorModel';
import type { Technique } from '@/hooks/mockup/mockupGenerationService';
import { logger } from '@/lib/logger';

/** Mensagem exibida quando a falha de carga não traz texto utilizável. */
export const TECHNIQUES_LOAD_ERROR_FALLBACK =
  'Não foi possível carregar as técnicas de personalização agora.';

export interface MockupTechniquesLoadState {
  techniques: Technique[];
  /** Mantém o nome usado pelo painel desde antes da extração. */
  isLoadingData: boolean;
  /** null = sem erro. Texto pronto para exibição no bloco da técnica. */
  techniquesError: string | null;
  /** Recarrega a MESMA lista que falhou. */
  reloadTechniques: () => Promise<void>;
}

export function useMockupTechniquesLoad(): MockupTechniquesLoadState {
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [techniquesError, setTechniquesError] = useState<string | null>(null);

  const reloadTechniques = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const techniquesData = await loadMockupTechniques();
      setTechniques(techniquesData);
      setTechniquesError(null);
    } catch (error) {
      logger.error('Error fetching data:', error);
      setTechniquesError(
        error instanceof Error && error.message ? error.message : TECHNIQUES_LOAD_ERROR_FALLBACK,
      );
      toast.error('Erro ao carregar dados. Tente novamente.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    reloadTechniques();
  }, [reloadTechniques]);

  return { techniques, isLoadingData, techniquesError, reloadTechniques };
}
