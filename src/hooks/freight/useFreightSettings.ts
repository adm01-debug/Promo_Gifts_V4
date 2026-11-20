/**
 * Hooks dos parâmetros globais de frete (`freight_settings`, linha única).
 *
 * - `useFreightSettings` — leitura. Devolve a linha do banco (para a tela
 *   `/admin/frete`) e os três parâmetros que o motor usa.
 * - `useUpdateFreightSettings` — salva e registra quem alterou. O id do usuário
 *   vem de `useAuth()`; `supabase.auth` direto é proibido fora de `src/lib/auth`.
 *
 * O toast de erro leva a mensagem do serviço no TÍTULO, porque `sanitizeError`
 * troca qualquer `Error` comum por texto genérico.
 */
import { useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { FREIGHT_QUERY_KEYS, FREIGHT_STALE_TIME_MS } from '@/hooks/freight/keys';
import { toFreightSettings, type FreightSettings } from '@/lib/freight';
import {
  FreightSettingsError,
  freightSettingsService,
  type FreightSettingsPatch,
  type FreightSettingsRow,
} from '@/services/freightSettingsService';

export interface UseFreightSettingsResult {
  /** A linha do banco, ou `null` enquanto carrega ou se não estiver visível. */
  row: FreightSettingsRow | null;
  /** Os parâmetros do motor. `null` junto com `row`: não há padrão no código. */
  settings: FreightSettings | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

function errorTitle(err: unknown, fallback: string): string {
  return err instanceof FreightSettingsError ? err.message : fallback;
}

export function useFreightSettings(): UseFreightSettingsResult {
  const query = useQuery({
    queryKey: FREIGHT_QUERY_KEYS.settings,
    queryFn: () => freightSettingsService.get(),
    staleTime: FREIGHT_STALE_TIME_MS,
  });

  const row = query.data ?? null;
  const settings = useMemo(() => (row ? toFreightSettings(row) : null), [row]);

  return {
    row,
    settings,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Salva os parâmetros informados. Invalida a leitura e avisa por toast; com
 * `mutateAsync` a promessa também rejeita com `FreightSettingsError`.
 */
export function useUpdateFreightSettings(): UseMutationResult<void, Error, FreightSettingsPatch> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (patch: FreightSettingsPatch) => {
      if (!userId) {
        throw new FreightSettingsError(
          'permission',
          'Sessão expirada. Entre novamente para salvar os parâmetros de frete.',
        );
      }
      await freightSettingsService.update(patch, userId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FREIGHT_QUERY_KEYS.settings });
      toast.success('Parâmetros de frete salvos');
    },
    onError: (err: Error) => {
      toast.error(errorTitle(err, 'Falha ao salvar parâmetros de frete'));
    },
  });
}
