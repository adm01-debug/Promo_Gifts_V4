/**
 * Sincronização do Brand Kit do Magic Up (E-6).
 *
 * Regra: o kit vindo do servidor só entra na CARGA INICIAL de um cliente.
 * Depois disso, edições locais (handleUpdateBrandKit / handleUseBrandLogo) não
 * podem ser sobrescritas quando o efeito volta a rodar por outro motivo (ex.:
 * troca da logo principal, que muda `logoPreview`).
 *
 * Extraído de useMagicUpState.ts — arquivo no limite de tamanho do ratchet
 * (check:file-size-baseline), que só importa e chama estas funções puras.
 */
import { DEFAULT_BRAND_KIT, type MagicUpBrandKit } from '@/pages/magic-up/magicUpStrategy';

/** Cliente mínimo necessário para semear o kit a partir do cadastro no CRM. */
export interface BrandKitClient {
  id: string;
  name: string;
  logo_url?: string | null;
  cor_primaria_hex?: string | null;
}

/**
 * Identidade da sincronização do kit. Enquanto a chave não mudar (mesmo cliente
 * e mesmo kit do servidor), o efeito NÃO reaplica nada e as edições locais
 * permanecem. Antes do kit do servidor chegar usa-se a chave de fallback do
 * próprio cliente.
 */
export function brandKitSyncKey(
  client: BrandKitClient | null,
  loaded: MagicUpBrandKit | null | undefined,
): string | null {
  if (!client) return null;
  if (!loaded) return `${client.id}:client-fallback`;
  return `${client.id}:${loaded.id ?? 'server'}:${loaded.updatedAt ?? ''}`;
}

/** Kit inicial montado a partir do cadastro do cliente no CRM (sem kit salvo). */
export function buildBrandKitFromClient(client: BrandKitClient): MagicUpBrandKit {
  return {
    ...DEFAULT_BRAND_KIT,
    clientId: client.id,
    clientName: client.name,
    primaryLogoUrl: client.logo_url || null,
    logoUrls: client.logo_url
      ? [
          {
            id: 'crm-logo',
            label: 'Logo CRM',
            url: client.logo_url,
            variant: 'principal',
            isPrimary: true,
          },
        ]
      : [],
    primaryColor: client.cor_primaria_hex || null,
  };
}
