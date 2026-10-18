/**
 * useMagicUpState — Extracted logic from MagicUp page.
 * Manages product loading, client search, generation, and history.
 * Generation logic delegated to useMagicUpGeneration.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useAriaLive } from '@/components/a11y';
import { useProductCustomizationOptionsForMockup } from '@/hooks/mockup';
import { getCompanyDisplayName, type CrmCompany } from '@/types/crm';
import type { PrintAreaWithTechniques, AreaShape } from '@/types/gravacao';
import type { ScenePrompt } from '@/components/magic-up/PromptBank';
import type { GenerationHistoryItem } from '@/components/magic-up/AdImageResult';
import { useMagicUpGeneration } from '@/hooks/intelligence/useMagicUpGeneration';
import {
  DEFAULT_BRAND_KIT,
  DEFAULT_BRIEF,
  DEFAULT_CREATIVE_CONTROLS,
  buildBrandKitNotes,
  buildCopyPack,
  buildMagicScore,
  campaignFromBrief,
  type MagicUpBatchVariant,
  type MagicUpBrandKit,
  type MagicUpBrandLogo,
  type MagicUpBrief,
  type MagicUpCampaign,
  type MagicUpCampaignStatus,
  type MagicUpCreativeControls,
  type MagicUpCurationStatus,
  type MagicUpRefinement,
} from '@/pages/magic-up/magicUpStrategy';

// ─── Types ───────────────────────────────────────────────────────────

import {
  searchMagicUpClients,
  fetchMagicUpHistory,
  fetchMagicUpCampaigns,
  fetchMagicUpBrandKit,
  fetchMagicUpProducts,
  saveMagicUpCampaignRow,
  type MagicUpProduct,
  type Technique,
  type ProductColor,
  type ProductImage,
  type SelectedClient,
  type VariationItem,
} from './useMagicUpState.helpers';
export type {
  MagicUpProduct,
  Technique,
  ProductColor,
  ProductImage,
  SelectedClient,
  VariationItem,
};

export function useMagicUpState() {
  const { user } = useAuth();
  const { announceStatus, announceAlert } = useAriaLive();
  const queryClient = useQueryClient();

  // Product
  const [products, setProducts] = useState<MagicUpProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  // BUG-MAGICUP-REMOUNT-1 FIX (2026-08-17): `loadingProducts` now toggles on
  // every debounced search (not just once at page mount), since product
  // loading became search-driven. The page-level skeleton must gate on a
  // one-time "first load done" flag instead — otherwise every keystroke
  // unmounts/remounts the whole config+result panel tree (page jumps to top,
  // combobox popover closes) because MagicUp.tsx swaps the entire subtree
  // for a skeleton whenever `loadingProducts` is true.
  const [initialProductsLoaded, setInitialProductsLoaded] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<MagicUpProduct | null>(null);
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [loadingColors, setLoadingColors] = useState(false);

  // Technique & Location
  const { data: customizationData, isLoading: loadingCustomization } =
    useProductCustomizationOptionsForMockup(selectedProduct?.id);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);

  // Logo
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Scene
  const [selectedScene, setSelectedScene] = useState<ScenePrompt | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [sceneTab, setSceneTab] = useState<'ai' | 'bank'>('ai');
  const [brief, setBrief] = useState<MagicUpBrief>(DEFAULT_BRIEF);
  const [activeCampaign, setActiveCampaign] = useState<MagicUpCampaign | null>(null);
  const [creativeControls, setCreativeControls] =
    useState<MagicUpCreativeControls>(DEFAULT_CREATIVE_CONTROLS);
  const [brandNotes, setBrandNotes] = useState('');
  const [brandKit, setBrandKit] = useState<MagicUpBrandKit>(DEFAULT_BRAND_KIT);
  const [activeRefinement, setActiveRefinement] = useState<MagicUpRefinement | null>(null);
  const [batchQueue, setBatchQueue] = useState<MagicUpBatchVariant[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);

  // Magic Up modo rápido (nano-banana / Gemini 2.5 Flash Image) vs pro (Gemini 3 Pro)
  // false = pro (default), true = fast. Controlado por toggle na UI.
  const [fastMode, setFastMode] = useState(false);

  // Client (CRM externo)
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [debouncedClientSearch, setDebouncedClientSearch] = useState('');
  const [showClientResults, setShowClientResults] = useState(false);

  // ─── Client search debounce ──────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedClientSearch(clientSearch), 300);
    return () => clearTimeout(t);
  }, [clientSearch]);

  const { data: clientResults = [], isLoading: loadingClients } = useQuery({
    queryKey: ['magic-up-clients', debouncedClientSearch],
    queryFn: () => searchMagicUpClients(debouncedClientSearch),
    enabled: debouncedClientSearch.length >= 3,
  });

  // ─── Load History ──────────────────────────────────────────────
  const { data: history = [] } = useQuery<GenerationHistoryItem[]>({
    queryKey: ['magic-up-history', user?.id],
    queryFn: () => fetchMagicUpHistory(user?.id),
    enabled: !!user?.id,
  });

  const { data: campaigns = [] } = useQuery<MagicUpCampaign[]>({
    queryKey: ['magic-up-campaigns', user?.id],
    queryFn: () => fetchMagicUpCampaigns(user?.id),
    enabled: !!user?.id,
  });

  const { data: loadedBrandKit, isFetching: loadingBrandKit } = useQuery<MagicUpBrandKit | null>({
    queryKey: ['magic-up-brand-kit', user?.id, selectedClient?.id],
    queryFn: () => fetchMagicUpBrandKit(user?.id, selectedClient),
    enabled: !!user?.id && !!selectedClient?.id,
  });

  // ─── Product search debounce ──────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedProductSearch(productSearch), 300);
    return () => clearTimeout(t);
  }, [productSearch]);

  // ─── Load Products ──────────────────────────────────────────────
  // BUG-MAGICUP-PRODSEARCH-1 FIX (2026-08-17): antes carregava o catálogo
  // inteiro (7k+ produtos ativos) via fetchPromobrindProducts() sem limit,
  // que pagina até um timeout de 30s ordenando por nome — para catálogos
  // grandes, produtos cujo nome cai depois do ponto de corte (ex.: "Mochila")
  // nunca chegavam a ser carregados, e a busca local (Fuse.js) dava 0
  // resultados mesmo com centenas de produtos correspondentes no banco.
  // Agora busca no servidor conforme o usuário digita, igual ao padrão já
  // usado para clientes (debouncedClientSearch acima).
  //
  // BUG-MAGICUP-PRODSEARCH-2 FIX (2026-08-17): a busca server-side usa full-text
  // search (search_vector, stemming PT-BR) sobre nome+descrição+categoria — por
  // isso "mochila" também retorna bolsas cuja categoria é "Sacochila (Mochila
  // Saco)" ou cuja descrição menciona "alça tipo mochila". Esses matches são
  // tecnicamente relevantes, mas a query só ordena por nome (A-Z), então esses
  // resultados "peninsulares" enterravam os produtos literalmente chamados
  // "Mochila ...". Busca um pool maior (150) e reordena no cliente: produtos
  // cujo nome contém o termo digitado vêm primeiro, o resto do FTS depois —
  // aí corta para os 50 exibidos.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProducts(true);
      try {
        const ranked = await fetchMagicUpProducts(debouncedProductSearch);
        if (cancelled) return;
        setProducts(ranked);
      } catch {
        if (!cancelled) toast.error('Erro ao carregar produtos');
      } finally {
        if (!cancelled) {
          setLoadingProducts(false);
          setInitialProductsLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedProductSearch]);

  // ─── Load Colors & Images on Product Change ──────────────────────
  useEffect(() => {
    if (!selectedProduct) {
      setColors([]);
      setProductImages([]);
      setSelectedColor(null);
      setSelectedLocationId(null);
      setSelectedTechnique(null);
      return;
    }
    // Guarda contra resposta fora-de-ordem: ao trocar de produto rapidamente, a
    // resposta mais lenta (produto antigo) não pode sobrescrever o estado atual.
    let cancelled = false;
    (async () => {
      setLoadingColors(true);
      try {
        const { dbInvoke } = await import('@/lib/db/postgrest');
        const [variantsResult, imagesResult] = await Promise.all([
          dbInvoke<Record<string, unknown>>({
            table: 'product_variants',
            operation: 'select',
            filters: { product_id: selectedProduct.id },
            orderBy: { column: 'color_name', ascending: true },
            limit: 100,
          }),
          dbInvoke<Record<string, unknown>>({
            table: 'product_images',
            operation: 'select',
            filters: { product_id: selectedProduct.id },
            orderBy: { column: 'display_order', ascending: true },
            limit: 100,
          }),
        ]);
        if (cancelled) return;
        const images: ProductImage[] = (imagesResult.records || [])
          .filter((img: Record<string, unknown>) => img.image_type !== 'box')
          .map((img: Record<string, unknown>) => ({
            url: img.url_cdn || img.url_original || '',
            supplierCode: img.supplier_code || null,
            isPrimary: img.is_primary,
            isOgImage: img.is_og_image || false,
          }))
          .filter((img) => !!(img as ProductImage).url) as ProductImage[];
        setProductImages(images);
        const uniqueColors = new Map<string, ProductColor>();
        (variantsResult.records || []).forEach((v: Record<string, unknown>) => {
          const colorName = v.color_name as string | undefined;
          if (!colorName || uniqueColors.has(colorName)) return;
          uniqueColors.set(colorName, {
            hex: (v.color_hex as string) || '#CCCCCC',
            name: colorName,
            code: (v.color_code as string) || '',
            stock: (v.stock_quantity as number) ?? 0,
          });
        });
        setColors(Array.from(uniqueColors.values()));
      } catch {
        if (cancelled) return;
        setColors([]);
        setProductImages([]);
      } finally {
        if (!cancelled) setLoadingColors(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct?.id]);

  // ─── Print Areas from customization data ───────────────────────
  const printAreas = useMemo((): PrintAreaWithTechniques[] => {
    if (!customizationData?.locations) return [];
    return customizationData.locations.map((loc, idx) => ({
      area_id: loc.location_code,
      area_code: loc.location_code,
      area_name: loc.location_name,
      component_name: null,
      location_name: loc.location_name,
      max_width: Math.max(...loc.options.map((o) => o.efetiva_largura_max || 0), 0),
      max_height: Math.max(...loc.options.map((o) => o.efetiva_altura_max || 0), 0),
      unit: 'cm',
      shape: (loc.options[0]?.shape || 'rectangle') as AreaShape,
      is_curved: loc.options.some((o) => o.is_curved),
      is_primary: idx === 0,
      display_order: loc.location_order,
      techniques: loc.options.map((o) => ({
        id: o.technique_id,
        nome: o.tecnica_nome,
        codigo: o.codigo_tabela,
      })),
    }));
  }, [customizationData]);

  const loadingPrintAreas = loadingCustomization;

  useEffect(() => {
    if (!selectedClient) {
      setBrandKit(DEFAULT_BRAND_KIT);
      setBrandNotes('');
      return;
    }
    if (loadedBrandKit) {
      setBrandKit(loadedBrandKit);
      setBrandNotes(buildBrandKitNotes(loadedBrandKit));
      if (loadedBrandKit.primaryLogoUrl && !logoPreview)
        setLogoPreview(loadedBrandKit.primaryLogoUrl);
      return;
    }
    setBrandKit({
      ...DEFAULT_BRAND_KIT,
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      primaryLogoUrl: selectedClient.logo_url || null,
      logoUrls: selectedClient.logo_url
        ? [
            {
              id: 'crm-logo',
              label: 'Logo CRM',
              url: selectedClient.logo_url,
              variant: 'principal',
              isPrimary: true,
            },
          ]
        : [],
      primaryColor: selectedClient.cor_primaria_hex || null,
    });
  }, [loadedBrandKit, logoPreview, selectedClient]);

  // ─── Derived: Techniques from print areas ───────────────────────
  const availableTechniques = useMemo((): Technique[] => {
    if (!printAreas?.length) return [];
    const techMap = new Map<string, Technique>();
    const source = selectedLocationId
      ? printAreas.filter((a) => a.area_id === selectedLocationId)
      : printAreas;
    for (const area of source) {
      for (const t of area.techniques || []) {
        if (!techMap.has(t.id)) techMap.set(t.id, { id: t.id, name: t.nome, code: t.codigo });
      }
    }
    return [...techMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [printAreas, selectedLocationId]);

  useEffect(() => {
    if (
      selectedTechnique &&
      availableTechniques.length > 0 &&
      !availableTechniques.some((t) => t.id === selectedTechnique.id)
    )
      setSelectedTechnique(null);
  }, [availableTechniques, selectedTechnique]);

  // ─── Current preview image ─────────────────────────────────────
  const currentImage = useMemo(() => {
    if (productImages.length === 0) return selectedProduct?.primary_image_url || null;
    if (selectedColor?.code) {
      const match = productImages.find((img) => img.supplierCode === selectedColor.code);
      if (match) return match.url;
    }
    return (
      productImages.find((i) => i.isOgImage)?.url ||
      productImages.find((i) => i.isPrimary)?.url ||
      productImages[0]?.url ||
      null
    );
  }, [productImages, selectedColor, selectedProduct]);

  const selectedLocationName = useMemo(() => {
    if (!selectedLocationId || !printAreas) return null;
    const area = printAreas.find((a) => a.area_id === selectedLocationId);
    return area ? [area.component_name, area.location_name].filter(Boolean).join(' — ') : null;
  }, [selectedLocationId, printAreas]);

  // ─── Effective prompt ─────────────────────────────────────────
  const effectivePrompt = useMemo(() => {
    const base = selectedScene?.prompt ?? '';
    const extra = additionalDetails.trim();
    if (base && extra) return `${base}\n\nADDITIONAL DETAILS: ${extra}`;
    return extra || base;
  }, [selectedScene, additionalDetails]);

  const fullPromptPreview = useMemo(() => {
    if (!selectedProduct || !effectivePrompt) return '';
    return `BRIEFING: objetivo=${brief.objective}; canal=${brief.channel}; público=${brief.audience}; tom=${brief.tone}; CTA=${brief.cta}; ocasião=${brief.occasion}
CONTROLE CRIATIVO: modo=${creativeControls.creativeMode}; composição=${creativeControls.composition}; formato=${creativeControls.aspectRatio}; qualidade=${creativeControls.qualityMode}; evitar=${creativeControls.negativePrompt.join(', ')}
REFINAMENTO: ${activeRefinement?.instruction || 'Nenhum'}
${brandNotes ? `DIRETRIZES DA MARCA: ${brandNotes}` : ''}
PRODUTO: ${selectedProduct.name}${selectedColor ? ` (${selectedColor.name})` : ''}
TÉCNICA: ${selectedTechnique?.name || 'Não especificada'} @ ${selectedLocationName || 'Não especificado'}
${selectedClient ? `CLIENTE: ${selectedClient.name}${selectedClient.ramo_atividade ? ` (${selectedClient.ramo_atividade})` : ''}` : ''}
${selectedClient?.cor_primaria_hex ? `COR DA MARCA: ${selectedClient.cor_primaria_nome || selectedClient.cor_primaria_hex}` : ''}
CENÁRIO: ${effectivePrompt}`;
  }, [
    brief,
    creativeControls,
    activeRefinement,
    brandNotes,
    selectedProduct,
    selectedColor,
    selectedTechnique,
    selectedLocationName,
    effectivePrompt,
    selectedClient,
  ]);

  const qualityScore = useMemo(
    () =>
      buildMagicScore({
        hasProduct: !!selectedProduct,
        hasLogo: !!logoPreview,
        hasClient: !!selectedClient,
        hasTechnique: !!selectedTechnique,
        hasBrief: !!brief.objective && !!brief.channel,
        channel: brief.channel,
      }),
    [selectedProduct, logoPreview, selectedClient, selectedTechnique, brief],
  );

  const copyPack = useMemo(
    () =>
      buildCopyPack({
        productName: selectedProduct?.name,
        clientName: selectedClient?.name,
        cta: brief.cta,
        tone: brief.tone,
        channel: brief.channel,
      }),
    [selectedProduct?.name, selectedClient?.name, brief],
  );

  const handleSetBrief = useCallback((next: MagicUpBrief) => {
    setBrief(next);
    setActiveCampaign((current) => (current ? { ...current, ...next } : current));
  }, []);

  const handleSelectCampaign = useCallback(
    (campaign: MagicUpCampaign) => {
      setActiveCampaign(campaign);
      setBrief({
        objective: campaign.objective,
        channel: campaign.channel,
        audience: campaign.audience,
        tone: campaign.tone,
        cta: campaign.cta,
        occasion: campaign.occasion,
      });
      announceStatus(`Campanha ${campaign.title} selecionada`);
    },
    [announceStatus],
  );

  const handleDuplicateCampaign = useCallback(
    (campaign: MagicUpCampaign) => {
      const copy = {
        ...campaign,
        id: null,
        title: `${campaign.title} · cópia`,
        status: 'draft' as MagicUpCampaignStatus,
      };
      setActiveCampaign(copy);
      setBrief({
        objective: copy.objective,
        channel: copy.channel,
        audience: copy.audience,
        tone: copy.tone,
        cta: copy.cta,
        occasion: copy.occasion,
      });
      announceStatus('Campanha duplicada como rascunho');
    },
    [announceStatus],
  );

  const handleSaveCampaign = useCallback(async () => {
    if (!user?.id) {
      toast.error('Faça login para salvar campanhas');
      announceAlert('Login necessário para salvar campanha');
      return;
    }
    const draft =
      activeCampaign ??
      campaignFromBrief({
        brief,
        clientId: selectedClient?.id,
        clientName: selectedClient?.name,
        productName: selectedProduct?.name,
      });
    const saved = await saveMagicUpCampaignRow({
      userId: user.id,
      draft,
      selectedClientId: selectedClient?.id,
      selectedClientName: selectedClient?.name,
      selectedProductId: selectedProduct?.id,
      brandNotes,
    });
    if (!saved) {
      toast.error('Erro ao salvar campanha');
      announceAlert('Erro ao salvar campanha');
      return;
    }
    setActiveCampaign({
      ...draft,
      id: saved.id,
      clientId: saved.client_id,
      clientName: saved.client_name,
      updatedAt: saved.updated_at,
    });
    queryClient.invalidateQueries({ queryKey: ['magic-up-campaigns'] });
    toast.success('Campanha salva');
    announceStatus('Campanha salva com sucesso');
  }, [
    activeCampaign,
    announceAlert,
    announceStatus,
    brandNotes,
    brief,
    queryClient,
    selectedClient,
    selectedProduct,
    user?.id,
  ]);

  const handleUpdateBrandKit = useCallback((patch: Partial<MagicUpBrandKit>) => {
    setBrandKit((current) => {
      const next = { ...current, ...patch };
      setBrandNotes(buildBrandKitNotes(next));
      return next;
    });
  }, []);

  const handleUseBrandLogo = useCallback(
    (logo: MagicUpBrandLogo) => {
      setLogoPreview(logo.url);
      setBrandKit((current) => ({
        ...current,
        primaryLogoUrl: logo.url,
        logoUrls: current.logoUrls.map((item) => ({ ...item, isPrimary: item.id === logo.id })),
      }));
      announceStatus('Logo do Brand Kit aplicado');
    },
    [announceStatus],
  );

  const handleAddCurrentLogoToBrandKit = useCallback(() => {
    if (!logoPreview) return;
    const nextLogo: MagicUpBrandLogo = {
      id: crypto.randomUUID(),
      label: `Logo ${brandKit.logoUrls.length + 1}`,
      url: logoPreview,
      variant: brandKit.logoUrls.length ? 'colorida' : 'principal',
      isPrimary: brandKit.logoUrls.length === 0,
    };
    handleUpdateBrandKit({
      logoUrls: [...brandKit.logoUrls, nextLogo],
      primaryLogoUrl: brandKit.primaryLogoUrl || logoPreview,
    });
  }, [brandKit.logoUrls, brandKit.primaryLogoUrl, handleUpdateBrandKit, logoPreview]);

  const handleSaveBrandKit = useCallback(async () => {
    if (!user?.id) {
      toast.error('Faça login para salvar Brand Kit');
      announceAlert('Login necessário para salvar Brand Kit');
      return;
    }
    if (!selectedClient?.id) {
      toast.error('Selecione uma empresa para salvar o Brand Kit');
      announceAlert('Selecione uma empresa para salvar Brand Kit');
      return;
    }
    const logos = brandKit.logoUrls.length
      ? brandKit.logoUrls
      : logoPreview
        ? [
            {
              id: 'current-logo',
              label: 'Logo atual',
              url: logoPreview,
              variant: 'principal' as const,
              isPrimary: true,
            },
          ]
        : [];
    const payload = {
      client_id: selectedClient.id,
      client_name: selectedClient.name,
      logo_urls: logos,
      primary_color: brandKit.primaryColor,
      secondary_color: brandKit.secondaryColor,
      tone_of_voice: brandKit.toneOfVoice,
      visual_style: brandKit.visualStyle,
      required_words: brandKit.requiredWords,
      forbidden_words: brandKit.forbiddenWords,
      notes: brandKit.notes,
      metadata: { source: 'magic-up' },
    };
    const result = brandKit.id
      ? await supabase
          .from('magic_up_brand_kits')
          .update(payload satisfies TablesUpdate<'magic_up_brand_kits'>)
          .eq('id', brandKit.id)
          .select('id, updated_at')
          .single()
      : await supabase
          .from('magic_up_brand_kits')
          .insert({ ...payload, user_id: user.id } satisfies TablesInsert<'magic_up_brand_kits'>)
          .select('id, updated_at')
          .single();
    if (result.error || !result.data) {
      toast.error('Erro ao salvar Brand Kit');
      announceAlert('Erro ao salvar Brand Kit');
      return;
    }
    setBrandKit((current) => ({
      ...current,
      ...payload,
      id: result.data.id,
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      primaryLogoUrl: logos.find((logo) => logo.isPrimary)?.url || logos[0]?.url || null,
      logoUrls: logos,
      updatedAt: result.data.updated_at,
    }));
    queryClient.invalidateQueries({ queryKey: ['magic-up-brand-kit'] });
    toast.success('Brand Kit salvo');
    announceStatus('Brand Kit salvo com sucesso');
  }, [announceAlert, announceStatus, brandKit, logoPreview, queryClient, selectedClient, user?.id]);

  const handleApplyRefinement = useCallback(
    (refinement: MagicUpRefinement) => {
      setActiveRefinement(refinement);
      if (refinement.creativePatch) {
        setCreativeControls((current) => ({
          ...current,
          ...refinement.creativePatch,
          negativePrompt: refinement.creativePatch?.negativePrompt || current.negativePrompt,
        }));
      }
      setAdditionalDetails((current) =>
        current.includes(refinement.instruction)
          ? current
          : [current.trim(), refinement.instruction].filter(Boolean).join('\n'),
      );
      announceStatus(`Refinamento aplicado: ${refinement.label}`);
    },
    [announceStatus],
  );

  // ─── Generation (delegated) ────────────────────────────────────
  const generation = useMagicUpGeneration({
    selectedProduct,
    currentImage,
    logoPreview,
    effectivePrompt,
    selectedColor,
    selectedTechnique,
    selectedLocationName,
    selectedScene,
    selectedClient,
    userId: user?.id,
    brief,
    creativeControls,
    qualityScore,
    copyPack,
    fullPromptPreview,
    activeCampaign,
    brandKit,
    brandNotes,
    activeRefinement,
    imageModel: fastMode ? 'fast' : 'pro',
  });

  useEffect(() => {
    if (generation.generating) announceStatus('Geração do Magic Up iniciada');
  }, [announceStatus, generation.generating]);

  const handleSetBatchQueue = useCallback(
    (queue: MagicUpBatchVariant[]) => {
      setBatchQueue(queue);
      announceStatus(`${queue.length} variações adicionadas à fila`);
    },
    [announceStatus],
  );

  const handleClearBatchQueue = useCallback(() => {
    setBatchQueue([]);
    announceStatus('Fila de variações limpa');
  }, [announceStatus]);

  const handleRunBatchQueue = useCallback(async () => {
    if (!batchQueue.length || batchRunning || !generation.canGenerate) return;
    setBatchRunning(true);
    announceStatus('Geração em lote iniciada');
    try {
      for (const variant of batchQueue) {
        await generation.handleGenerate(variant);
        announceStatus(`Variação gerada: ${variant.label}`);
      }
      toast.success('Fila de variações concluída');
    } catch {
      announceAlert('Erro ao executar fila de variações');
    } finally {
      setBatchRunning(false);
    }
  }, [announceAlert, announceStatus, batchQueue, batchRunning, generation]);

  const handleSetCurationStatus = useCallback(
    async (status: MagicUpCurationStatus) => {
      await generation.handleSetCurationStatus(status);
      announceStatus(`Status de curadoria atualizado: ${status}`);
    },
    [announceStatus, generation],
  );

  // ─── Handlers ──────────────────────────────────────────────────
  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx. 10MB)');
      return;
    }
    setLogoUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setLogoPreview(ev.target?.result as string);
        setLogoUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setLogoUploading(false);
      toast.error('Erro ao carregar logo');
    }
  }, []);

  const handleSelectClient = useCallback(
    (company: CrmCompany) => {
      const client: SelectedClient = {
        id: company.id,
        name: getCompanyDisplayName(company),
        logo_url: company.logo_url || null,
        ramo_atividade: company.ramo_atividade || null,
        cor_primaria_hex: null,
        cor_primaria_nome: null,
      };
      setSelectedClient(client);
      setClientSearch('');
      setShowClientResults(false);
      if (company.logo_url && !logoPreview) setLogoPreview(company.logo_url);
    },
    [logoPreview],
  );

  const handleSelectProduct = useCallback(
    (p: MagicUpProduct | null) => {
      setSelectedProduct(p);
      setSelectedColor(null);
      generation.setVariations([]);
      generation.setActiveVariation(0);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [generation.setActiveVariation, generation.setVariations],
  );

  const handleClearClient = useCallback(() => {
    setSelectedClient(null);
    setLogoPreview(null);
  }, []);

  const step = !selectedProduct ? 1 : !logoPreview ? 2 : !effectivePrompt ? 3 : 4;

  return {
    products,
    loadingProducts,
    initialProductsLoaded,
    productSearch,
    setProductSearch,
    selectedProduct,
    colors,
    productImages,
    selectedColor,
    setSelectedColor,
    loadingColors,
    handleSelectProduct,
    printAreas,
    loadingPrintAreas,
    availableTechniques,
    selectedLocationId,
    setSelectedLocationId,
    selectedTechnique,
    setSelectedTechnique,
    logoPreview,
    logoUploading,
    handleLogoUpload,
    selectedScene,
    setSelectedScene,
    additionalDetails,
    setAdditionalDetails,
    showPromptPreview,
    setShowPromptPreview,
    sceneTab,
    setSceneTab,
    brief,
    setBrief: handleSetBrief,
    activeCampaign,
    setActiveCampaign,
    campaigns,
    handleSaveCampaign,
    handleSelectCampaign,
    handleDuplicateCampaign,
    creativeControls,
    setCreativeControls,
    brandNotes,
    setBrandNotes,
    brandKit,
    loadingBrandKit,
    handleUpdateBrandKit,
    handleUseBrandLogo,
    handleAddCurrentLogoToBrandKit,
    handleSaveBrandKit,
    activeRefinement,
    handleApplyRefinement,
    batchQueue,
    batchRunning,
    handleSetBatchQueue,
    handleRunBatchQueue,
    handleClearBatchQueue,
    qualityScore,
    copyPack,
    effectivePrompt,
    fullPromptPreview,
    selectedClient,
    clientSearch,
    setClientSearch,
    showClientResults,
    setShowClientResults,
    clientResults,
    loadingClients,
    handleSelectClient,
    handleClearClient,
    ...generation,
    handleSetCurationStatus,
    currentImage,
    selectedLocationName,
    history,
    step,
    fastMode,
    setFastMode,
  };
}
