/**
 * useMagicUpState.helpers — tipos e data-fetchers extraídos de useMagicUpState.ts
 * (refatoração pura, sem mudança de comportamento).
 */
import { supabase } from '@/integrations/supabase/client';
import { normalizeProductSearch } from '@/utils/product-search';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { searchCrm } from '@/lib/crm-db';
import type { CrmCompany } from '@/types/crm';
import type { GenerationHistoryItem } from '@/components/magic-up/AdImageResult';
import {
  DEFAULT_BRAND_KIT,
  DEFAULT_BRIEF,
  DEFAULT_CAMPAIGN,
  type MagicUpBrandKit,
  type MagicUpBrandLogo,
  type MagicUpCampaign,
  type MagicUpCampaignStatus,
} from '@/pages/magic-up/magicUpStrategy';

export interface MagicUpProduct {
  id: string;
  name: string;
  sku: string;
  images: Array<{
    url_cdn?: string;
    url_original?: string;
    is_primary?: boolean;
    is_og_image?: boolean;
    image_type?: string;
    supplier_code?: string;
  }> | null;
  primary_image_url?: string | null;
  og_image_url?: string | null;
}

export interface Technique {
  id: string;
  name: string;
  code: string;
}

export interface ProductColor {
  hex: string;
  name: string;
  code: string;
  stock?: number;
}

export interface ProductImage {
  url: string;
  supplierCode: string | null;
  isPrimary: boolean;
  isOgImage: boolean;
}

export interface SelectedClient {
  id: string;
  name: string;
  logo_url?: string | null;
  ramo_atividade?: string | null;
  cor_primaria_hex?: string | null;
  cor_primaria_nome?: string | null;
}

export interface VariationItem {
  id: string | null;
  imageUrl: string;
  isFavorite: boolean;
  qualityScore?: number;
  qualityDiagnosis?: MagicUpQualityDiagnosis;
  curationStatus?: MagicUpCurationStatus;
  isWinner?: boolean;
}

// ============================================
// DATA FETCHERS (corpos dos queryFn/effects do hook)
// ============================================

export async function searchMagicUpClients(debouncedClientSearch: string): Promise<CrmCompany[]> {
  if (debouncedClientSearch.length < 3) return [];
  const [byRazao, byNomeFantasia] = await Promise.all([
    searchCrm<CrmCompany>('companies', 'razao_social', debouncedClientSearch, {
      select: 'id, razao_social, nome_fantasia, ramo_atividade, logo_url',
      limit: 20,
    }),
    searchCrm<CrmCompany>('companies', 'nome_fantasia', debouncedClientSearch, {
      select: 'id, razao_social, nome_fantasia, ramo_atividade, logo_url',
      limit: 20,
    }),
  ]);
  const map = new Map<string, CrmCompany>();
  [...byRazao, ...byNomeFantasia].forEach((c) => map.set(c.id, c));
  return Array.from(map.values()).slice(0, 20);
}

export async function fetchMagicUpHistory(
  userId: string | undefined,
): Promise<GenerationHistoryItem[]> {
  if (!userId) return [];
  // BUG-MAGICUPSTATE-HISTORY-SELECT-SILENT-FAIL FIX: { data } without error check —
  // RLS failure silently returned [] making queryFn succeed with empty history list.
  const { data, error: histErr } = await supabase
    .from('magic_up_generations')
    .select(
      'id, generated_image_url, product_name, scene_title, scene_category, is_favorite, created_at, client_name, quality_score, status, channel, aspect_ratio, metadata, copy_pack',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (histErr) throw histErr;
  return (data || []) as GenerationHistoryItem[];
}

export async function fetchMagicUpCampaigns(
  userId: string | undefined,
): Promise<MagicUpCampaign[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('magic_up_campaigns')
    .select(
      'id, title, status, client_id, client_name, objective, channel, audience, tone, cta, occasion, created_at, updated_at',
    )
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return ((data || []) as Tables<'magic_up_campaigns'>[]).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status as MagicUpCampaignStatus,
    clientId: row.client_id,
    clientName: row.client_name,
    objective: row.objective || DEFAULT_BRIEF.objective,
    channel: row.channel || DEFAULT_BRIEF.channel,
    audience: row.audience || DEFAULT_BRIEF.audience,
    tone: row.tone || DEFAULT_BRIEF.tone,
    cta: row.cta || DEFAULT_BRIEF.cta,
    occasion: row.occasion || DEFAULT_BRIEF.occasion,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function fetchMagicUpBrandKit(
  userId: string | undefined,
  selectedClient: { id: string; logo_url?: string | null } | null,
): Promise<MagicUpBrandKit | null> {
  if (!userId || !selectedClient?.id) return null;
  const { data, error } = await supabase
    .from('magic_up_brand_kits')
    .select(
      'id, client_id, client_name, logo_urls, primary_color, secondary_color, tone_of_voice, visual_style, required_words, forbidden_words, notes, updated_at',
    )
    .eq('user_id', userId)
    .eq('client_id', selectedClient?.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const logos = Array.isArray(data.logo_urls)
    ? (data.logo_urls as unknown as MagicUpBrandLogo[])
    : [];
  return {
    id: data.id,
    clientId: data.client_id,
    clientName: data.client_name,
    primaryLogoUrl:
      logos.find((logo) => logo.isPrimary)?.url ||
      logos[0]?.url ||
      selectedClient?.logo_url ||
      null,
    logoUrls: logos,
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
    toneOfVoice: data.tone_of_voice || DEFAULT_BRAND_KIT.toneOfVoice,
    visualStyle: data.visual_style || DEFAULT_BRAND_KIT.visualStyle,
    requiredWords: data.required_words || [],
    forbiddenWords: data.forbidden_words || [],
    notes: data.notes || '',
    updatedAt: data.updated_at,
  };
}

export async function fetchMagicUpProducts(
  debouncedProductSearch: string,
): Promise<MagicUpProduct[]> {
  const { fetchPromobrindProducts } = await import('@/lib/external-db');
  const search = debouncedProductSearch || undefined;
  const data = await fetchPromobrindProducts({
    search,
    limit: search ? 150 : 50,
  });
  const mapped = data.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    images: p.images || [],
    primary_image_url: p.primary_image_url || p.image_url || null,
    og_image_url: p.og_image_url || null,
  })) as unknown as MagicUpProduct[];
  const ranked = search
    ? (() => {
        const term = normalizeProductSearch(search);
        const nameMatches = mapped.filter((p) => normalizeProductSearch(p.name).includes(term));
        const rest = mapped.filter((p) => !normalizeProductSearch(p.name).includes(term));
        return [...nameMatches, ...rest].slice(0, 50);
      })()
    : mapped;
  return ranked;
}

export async function saveMagicUpCampaignRow(args: {
  userId: string;
  draft: MagicUpCampaign;
  selectedClientId: string | undefined;
  selectedClientName: string | undefined;
  selectedProductId: string | undefined;
  brandNotes: string;
}): Promise<{
  id: string;
  updated_at: string;
  client_id: string | null;
  client_name: string | null;
} | null> {
  const { userId, draft, selectedClientId, selectedClientName, selectedProductId, brandNotes } =
    args;
  const basePayload = {
    title: draft.title || DEFAULT_CAMPAIGN.title,
    client_id: selectedClientId || draft.clientId,
    client_name: selectedClientName || draft.clientName,
    objective: draft.objective,
    channel: draft.channel,
    audience: draft.audience,
    tone: draft.tone,
    cta: draft.cta,
    occasion: draft.occasion,
    status: draft.status,
    metadata: {
      source: 'magic-up',
      brand_notes: brandNotes,
      product_id: selectedProductId || null,
    },
  };
  const result = draft.id
    ? await supabase
        .from('magic_up_campaigns')
        .update(basePayload satisfies TablesUpdate<'magic_up_campaigns'>)
        .eq('id', draft.id)
        .select('id, updated_at')
        .single()
    : await supabase
        .from('magic_up_campaigns')
        .insert({ ...basePayload, user_id: userId } satisfies TablesInsert<'magic_up_campaigns'>)
        .select('id, created_at, updated_at')
        .single();
  if (result.error || !result.data) return null;
  return {
    id: result.data.id,
    updated_at: result.data.updated_at,
    client_id: basePayload.client_id || null,
    client_name: basePayload.client_name || null,
  };
}
