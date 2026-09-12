/**
 * Personalization Config
 * Configuração de personalização para caixa e itens
 * Integrado com técnicas reais do banco externo via useProductCustomizationOptions
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Palette,
  Package,
  ChevronDown,
  ChevronUp,
  Check,
  Settings,
  Loader2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Images,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ImageUploadButton } from '@/components/admin/ImageUploadButton';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  formatCurrency,
  getKitItemLineId,
  type KitBox,
  type KitItem,
  type KitItemPersonalization,
} from '@/lib/kit-builder';
import { useProductCustomizationOptions } from '@/hooks/products';
import { useCustomizationPriceReactive } from '@/hooks/simulation';
import type { GravacaoLocation } from '@/types/customization';
import {
  generateMockupApi,
  type GenerateMockupParams,
} from '@/hooks/mockup/mockupGenerationService';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/security/sanitize-error';

interface PersonalizationConfigProps {
  box: KitBox | null;
  items: KitItem[];
  kitQuantity?: number;
  boxPersonalization: KitItemPersonalization;
  itemPersonalizations: Record<string, KitItemPersonalization>;
  onBoxPersonalizationChange: (config: KitItemPersonalization) => void;
  onItemPersonalizationChange: (itemId: string, config: KitItemPersonalization) => void;
}

/** Flattened technique with location info */
export interface FlatTechnique {
  technique_id: string;
  tecnica_nome: string;
  grupo_tecnica: string;
  codigo_tabela: string;
  location_name: string;
  location_code: string;
  max_cores: number;
  usa_dimensao: boolean;
  efetiva_largura_max: number;
  efetiva_altura_max: number;
}

function clampConfiguredDimension(value: number | undefined, maximum: number): number | undefined {
  if (!Number.isFinite(value) || (value ?? 0) <= 0) return undefined;
  return Math.min(value!, maximum);
}

/**
 * A quotation price is only valid for the exact technique, color count and
 * artwork dimensions it was calculated from. Centralising the reset avoids a
 * stale price being carried from a previous configuration into the quote.
 */
export function reconcilePersonalizationForTechnique(
  personalization: KitItemPersonalization,
  technique: FlatTechnique,
): KitItemPersonalization {
  return {
    ...personalization,
    techniqueId: technique.technique_id,
    techniqueName: technique.tecnica_nome,
    techniqueCode: technique.codigo_tabela,
    positionCode: technique.location_code,
    positionName: technique.location_name,
    position: technique.location_name,
    colors: Math.min(personalization.colors || 1, technique.max_cores),
    width: technique.usa_dimensao
      ? (clampConfiguredDimension(personalization.width, technique.efetiva_largura_max) ??
        technique.efetiva_largura_max)
      : undefined,
    height: technique.usa_dimensao
      ? (clampConfiguredDimension(personalization.height, technique.efetiva_altura_max) ??
        technique.efetiva_altura_max)
      : undefined,
    estimatedPrice: undefined,
    pricedQuantity: undefined,
    setupCost: undefined,
    totalPrice: undefined,
    generatedMockupUrl: undefined,
  };
}

export function buildKitMockupRequest(
  displayName: string,
  imageUrl: string | null,
  personalization: KitItemPersonalization,
): GenerateMockupParams | null {
  if (
    !imageUrl ||
    !personalization.enabled ||
    !personalization.techniqueName ||
    !personalization.artworkUrl
  ) {
    return null;
  }

  return {
    productImage: imageUrl,
    productName: displayName,
    technique: {
      id: personalization.techniqueId || personalization.techniqueName,
      name: personalization.techniqueName,
      code: personalization.techniqueCode || null,
    },
    areas: [
      {
        id: globalThis.crypto.randomUUID(),
        name: personalization.positionName || personalization.position || 'Frente',
        positionX: 50,
        positionY: 50,
        logoWidth: personalization.width || 5,
        logoHeight: personalization.height || 5,
        logoPreview: personalization.artworkUrl,
      },
    ],
  };
}

function kitMockupInputFingerprint(
  displayName: string,
  imageUrl: string | null,
  personalization: KitItemPersonalization,
): string {
  return JSON.stringify({
    artworkColors: personalization.artworkColors ?? [],
    artworkUrl: personalization.artworkUrl ?? null,
    displayName,
    enabled: personalization.enabled,
    height: personalization.height ?? null,
    imageUrl,
    position: personalization.position ?? null,
    positionCode: personalization.positionCode ?? null,
    positionName: personalization.positionName ?? null,
    techniqueCode: personalization.techniqueCode ?? null,
    techniqueId: personalization.techniqueId ?? null,
    techniqueName: personalization.techniqueName ?? null,
    width: personalization.width ?? null,
  });
}

function flattenTechniques(locations: GravacaoLocation[]): FlatTechnique[] {
  const result: FlatTechnique[] = [];
  for (const loc of locations) {
    for (const tech of loc.options) {
      result.push({
        technique_id: tech.technique_id,
        tecnica_nome: tech.tecnica_nome,
        grupo_tecnica: tech.grupo_tecnica,
        codigo_tabela: tech.codigo_tabela,
        location_name: loc.location_name,
        location_code: loc.location_code,
        max_cores: tech.max_cores,
        usa_dimensao: tech.usa_dimensao,
        efetiva_largura_max: tech.efetiva_largura_max,
        efetiva_altura_max: tech.efetiva_altura_max,
      });
    }
  }
  return result;
}

// ============================================
// Card de personalização — busca técnicas internamente
// ============================================

interface ItemPersonalizationCardProps {
  productId: string;
  displayName: string;
  imageUrl: string | null;
  personalization: KitItemPersonalization;
  onChange: (config: KitItemPersonalization) => void;
  isBox?: boolean;
  kitQuantity: number;
  showInlinePreview?: boolean;
}

function ItemPersonalizationCard({
  productId,
  displayName,
  imageUrl,
  personalization,
  onChange,
  isBox = false,
  kitQuantity,
  showInlinePreview = true,
}: ItemPersonalizationCardProps) {
  const [isOpen, setIsOpen] = useState(personalization.enabled);

  // Fetch real techniques for this product
  const { data: options, isLoading: loadingTechniques } = useProductCustomizationOptions(productId);
  const techniques = useMemo(
    () => (options?.locations ? flattenTechniques(options.locations) : []),
    [options],
  );

  // Find current technique for reactive price
  const currentTech = techniques.find(
    (t) =>
      t.technique_id === personalization.techniqueId &&
      (!personalization.positionCode || t.location_code === personalization.positionCode),
  );

  // Reactive price from real RPC
  const { price: priceData, loading: priceLoading } = useCustomizationPriceReactive(
    personalization.enabled ? personalization.techniqueId || null : null,
    kitQuantity,
    personalization.colors || 1,
    personalization.width || null,
    personalization.height || null,
    currentTech?.usa_dimensao || false,
  );

  const currentUnitPrice = priceData?.preco_unitario ?? personalization.estimatedPrice;

  // #3 FIX: Sync estimatedPrice with RPC result so price-calculator picks it up
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const personalizationRef = useRef(personalization);
  personalizationRef.current = personalization;

  useEffect(() => {
    if (
      priceData?.success &&
      typeof priceData.preco_unitario === 'number' &&
      Number.isFinite(priceData.preco_unitario)
    ) {
      const rpcPrice = priceData.preco_unitario;
      const rpcSetup = priceData.setup_total ?? 0;
      const rpcTotal = priceData.total_cobrado ?? rpcPrice * kitQuantity;
      const current = personalizationRef.current;
      if (
        current.estimatedPrice !== rpcPrice ||
        current.setupCost !== rpcSetup ||
        current.totalPrice !== rpcTotal ||
        current.pricedQuantity !== kitQuantity
      ) {
        onChangeRef.current({
          ...current,
          estimatedPrice: rpcPrice,
          pricedQuantity: kitQuantity,
          setupCost: rpcSetup,
          totalPrice: rpcTotal,
        });
      }
    }
  }, [
    kitQuantity,
    priceData?.preco_unitario,
    priceData?.setup_total,
    priceData?.success,
    priceData?.total_cobrado,
  ]);

  const handleToggle = (enabled: boolean) => {
    onChange({
      ...personalization,
      enabled,
      estimatedPrice: enabled ? personalization.estimatedPrice : undefined,
      pricedQuantity: enabled ? personalization.pricedQuantity : undefined,
      setupCost: enabled ? personalization.setupCost : undefined,
      totalPrice: enabled ? personalization.totalPrice : undefined,
    });
    setIsOpen(enabled);
  };

  const handleTechniqueChange = (selectionId: string) => {
    const tech = techniques.find(
      (candidate) => `${candidate.technique_id}:${candidate.location_code}` === selectionId,
    );
    if (tech) {
      onChange(reconcilePersonalizationForTechnique(personalization, tech));
    }
  };

  const handleColorsChange = (colors: number) => {
    onChange({
      ...personalization,
      colors,
      estimatedPrice: undefined,
      pricedQuantity: undefined,
      setupCost: undefined,
      totalPrice: undefined,
      generatedMockupUrl: undefined,
    });
  };

  const toggleArtworkColor = (color: string) => {
    const current = personalization.artworkColors ?? [];
    const next = current.includes(color)
      ? current.filter((candidate) => candidate !== color)
      : [...current, color].slice(-maxColors);
    onChange({
      ...personalization,
      artworkColors: next,
      colors: Math.max(1, next.length),
      estimatedPrice: undefined,
      pricedQuantity: undefined,
      setupCost: undefined,
      totalPrice: undefined,
      generatedMockupUrl: undefined,
    });
  };

  const maxColors = currentTech?.max_cores || 6;
  const colorOptions = Array.from({ length: maxColors }, (_, i) => i + 1);

  return (
    <Card className={cn(personalization.enabled && 'border-primary/50 bg-primary/5')}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-secondary">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    {isBox ? (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Palette className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  {displayName}
                  {isBox && (
                    <Badge variant="outline" className="text-xs">
                      Caixa
                    </Badge>
                  )}
                </CardTitle>
                {personalization.enabled && personalization.techniqueName && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {personalization.techniqueName} • {personalization.colors || 1} cor(es)
                    {personalization.position && ` • ${personalization.position}`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {personalization.enabled && (
                <span className="text-sm font-semibold">
                  {priceLoading ? (
                    <Loader2 className="inline h-3 w-3 animate-spin text-primary" />
                  ) : !personalization.techniqueId ? (
                    <span className="flex items-center gap-1 text-warning">
                      <AlertTriangle className="h-3 w-3" />
                      Sem técnica
                    </span>
                  ) : Number.isFinite(currentUnitPrice) && (currentUnitPrice ?? -1) >= 0 ? (
                    <span className="text-primary">
                      +{formatCurrency(currentUnitPrice ?? 0)}/un
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-warning">
                      <AlertTriangle className="h-3 w-3" />
                      Preço indisponível
                    </span>
                  )}
                </span>
              )}
              <Switch checked={personalization.enabled} onCheckedChange={handleToggle} />
              {personalization.enabled && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Expandir" className="h-8 w-8">
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div
              className={cn(
                'grid gap-4',
                showInlinePreview && 'xl:grid-cols-[minmax(0,1fr)_13rem]',
              )}
            >
              <div className="space-y-4">
                {/* Técnica */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Técnica de Gravação</Label>
                    {loadingTechniques ? (
                      <div className="flex h-10 items-center gap-2 rounded-md border bg-secondary/50 px-3">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Carregando...</span>
                      </div>
                    ) : techniques.length === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">
                        Nenhuma técnica disponível para este produto
                      </p>
                    ) : (
                      <Select
                        value={
                          personalization.techniqueId &&
                          (personalization.positionCode || personalization.position)
                            ? `${personalization.techniqueId}:${personalization.positionCode || personalization.position}`
                            : ''
                        }
                        onValueChange={handleTechniqueChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a técnica..." />
                        </SelectTrigger>
                        <SelectContent>
                          {techniques.map((tech) => (
                            <SelectItem
                              key={`${tech.technique_id}:${tech.location_code}`}
                              value={`${tech.technique_id}:${tech.location_code}`}
                            >
                              <span className="flex items-center gap-2">
                                <Badge variant="outline" className="px-1 py-0 text-[10px]">
                                  {tech.grupo_tecnica}
                                </Badge>
                                {tech.tecnica_nome}
                                <span className="text-xs text-muted-foreground">
                                  ({tech.location_name})
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Número de Cores</Label>
                    <Select
                      value={String(personalization.colors || 1)}
                      onValueChange={(v) => handleColorsChange(parseInt(v, 10))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {colorOptions.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} {n === 1 ? 'cor' : 'cores'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cores da arte</Label>
                  <div className="flex flex-wrap gap-2">
                    {['#ffffff', '#111827', '#2563eb', '#dc2626', '#16a34a', '#f59e0b'].map(
                      (color) => {
                        const selected = personalization.artworkColors?.includes(color);
                        return (
                          <button
                            key={color}
                            type="button"
                            aria-label={`Cor ${color}`}
                            aria-pressed={selected}
                            onClick={() => toggleArtworkColor(color)}
                            className={cn(
                              'h-8 w-8 rounded-full border-2 shadow-sm',
                              selected ? 'border-primary ring-2 ring-primary/30' : 'border-border',
                            )}
                            style={{ backgroundColor: color }}
                          />
                        );
                      },
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A quantidade selecionada alimenta o cálculo; a produção valida as cores finais.
                  </p>
                </div>

                {/* Dimensões — somente se técnica usa dimensão */}
                {currentTech?.usa_dimensao && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        Largura (cm){' '}
                        <span className="text-xs text-muted-foreground">
                          máx {currentTech.efetiva_largura_max}
                        </span>
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        max={currentTech.efetiva_largura_max}
                        placeholder={`Até ${currentTech.efetiva_largura_max}cm`}
                        value={personalization.width || ''}
                        onChange={(e) => {
                          const value = Number.parseFloat(e.target.value);
                          onChange({
                            ...personalization,
                            width:
                              Number.isFinite(value) && value > 0
                                ? Math.min(value, currentTech.efetiva_largura_max)
                                : undefined,
                            estimatedPrice: undefined,
                            pricedQuantity: undefined,
                            setupCost: undefined,
                            totalPrice: undefined,
                            generatedMockupUrl: undefined,
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Altura (cm){' '}
                        <span className="text-xs text-muted-foreground">
                          máx {currentTech.efetiva_altura_max}
                        </span>
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        max={currentTech.efetiva_altura_max}
                        placeholder={`Até ${currentTech.efetiva_altura_max}cm`}
                        value={personalization.height || ''}
                        onChange={(e) => {
                          const value = Number.parseFloat(e.target.value);
                          onChange({
                            ...personalization,
                            height:
                              Number.isFinite(value) && value > 0
                                ? Math.min(value, currentTech.efetiva_altura_max)
                                : undefined,
                            estimatedPrice: undefined,
                            pricedQuantity: undefined,
                            setupCost: undefined,
                            totalPrice: undefined,
                            generatedMockupUrl: undefined,
                          });
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Preço detalhado */}
                {priceData?.success && (
                  <div className="space-y-1 rounded-lg bg-secondary/50 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Preço unitário</span>
                      <span>{formatCurrency(priceData.preco_unitario ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gravação ({kitQuantity}un)</span>
                      <span>{formatCurrency(priceData.valor_gravacao ?? 0)}</span>
                    </div>
                    {(priceData.setup_total ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Setup</span>
                        <span>{formatCurrency(priceData.setup_total ?? 0)}</span>
                      </div>
                    )}
                    <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
                      <span>Total gravação</span>
                      <span className="text-primary">
                        {formatCurrency(priceData.total_cobrado ?? 0)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {showInlinePreview && (
                <PersonalizationPreview
                  displayName={displayName}
                  imageUrl={imageUrl}
                  personalization={personalization}
                  onChange={onChange}
                />
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function PersonalizationPriceSynchronizer({
  productId,
  personalization,
  onChange,
  quantity,
}: {
  productId: string;
  personalization: KitItemPersonalization;
  onChange: (config: KitItemPersonalization) => void;
  quantity: number;
}) {
  const { data: options } = useProductCustomizationOptions(productId);
  const techniques = useMemo(
    () => (options?.locations ? flattenTechniques(options.locations) : []),
    [options],
  );
  const currentTech = techniques.find(
    (technique) =>
      technique.technique_id === personalization.techniqueId &&
      (!personalization.positionCode || technique.location_code === personalization.positionCode),
  );
  const { price } = useCustomizationPriceReactive(
    personalization.enabled ? personalization.techniqueId || null : null,
    quantity,
    personalization.colors || 1,
    personalization.width || null,
    personalization.height || null,
    currentTech?.usa_dimensao || false,
  );
  const personalizationRef = useRef(personalization);
  personalizationRef.current = personalization;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!price?.success || !Number.isFinite(price.preco_unitario)) return;
    const current = personalizationRef.current;
    const unitPrice = price.preco_unitario ?? 0;
    const setupCost = price.setup_total ?? 0;
    const totalPrice = price.total_cobrado ?? unitPrice * quantity;
    if (
      current.estimatedPrice !== unitPrice ||
      current.setupCost !== setupCost ||
      current.totalPrice !== totalPrice ||
      current.pricedQuantity !== quantity
    ) {
      onChangeRef.current({
        ...current,
        estimatedPrice: unitPrice,
        pricedQuantity: quantity,
        setupCost,
        totalPrice,
      });
    }
  }, [price?.preco_unitario, price?.setup_total, price?.success, price?.total_cobrado, quantity]);

  return null;
}

interface PersonalizationPreviewProps {
  displayName: string;
  imageUrl: string | null;
  personalization: KitItemPersonalization;
  onChange: (config: KitItemPersonalization) => void;
  savedArtworkUrls?: string[];
}

function PersonalizationPreview({
  displayName,
  imageUrl,
  personalization,
  onChange,
  savedArtworkUrls = [],
}: PersonalizationPreviewProps) {
  const [side, setSide] = useState<'back' | 'front'>('front');
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const generationRef = useRef(0);
  const personalizationRef = useRef(personalization);
  personalizationRef.current = personalization;

  const handleGenerateMockup = async () => {
    const request = buildKitMockupRequest(displayName, imageUrl, personalization);
    if (!request) {
      toast.error('Selecione a técnica e envie uma arte antes de gerar a prévia.');
      return;
    }

    const inputFingerprint = kitMockupInputFingerprint(displayName, imageUrl, personalization);
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    setIsGenerating(true);
    try {
      const result = await generateMockupApi(request);
      const generatedMockupUrl = result.singleUrl || result.batchResults[0]?.url;
      if (!generatedMockupUrl) throw new Error('O serviço não retornou uma imagem.');
      if (
        generationRef.current !== generation ||
        kitMockupInputFingerprint(displayName, imageUrl, personalizationRef.current) !==
          inputFingerprint
      ) {
        toast.info('A configuração mudou; gere uma nova prévia com os dados atuais.');
        return;
      }
      onChange({ ...personalizationRef.current, generatedMockupUrl });
      toast.success('Prévia de personalização gerada.');
    } catch (error) {
      toast.error('Não foi possível gerar a prévia', { description: sanitizeError(error) });
    } finally {
      if (generationRef.current === generation) setIsGenerating(false);
    }
  };

  const renderCanvas = (expanded = false) => (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border bg-background',
        expanded ? 'h-[min(78vh,48rem)] w-full' : 'aspect-[4/5]',
      )}
    >
      <div
        className="h-full w-full transition-transform duration-200 motion-reduce:transition-none"
        style={{ transform: `scale(${zoom})${side === 'back' ? ' scaleX(-1)' : ''}` }}
      >
        {personalization.generatedMockupUrl ? (
          <img
            src={personalization.generatedMockupUrl}
            alt={`Mockup gerado de ${displayName}`}
            className="h-full w-full object-contain"
          />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={`${side === 'front' ? 'Frente' : 'Verso'} de ${displayName}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Palette className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/55 via-transparent to-transparent" />
        {!personalization.generatedMockupUrl && personalization.artworkUrl ? (
          <div className="absolute inset-x-[22%] top-[35%] flex aspect-square items-center justify-center overflow-hidden rounded border border-primary/40 bg-background/15 p-2 shadow-lg backdrop-blur-[1px]">
            <img
              src={personalization.artworkUrl}
              alt="Arte enviada para personalização"
              className="h-full w-full object-contain"
            />
          </div>
        ) : !personalization.generatedMockupUrl ? (
          <div className="absolute inset-x-[12%] top-[39%] rounded border border-dashed border-primary/50 bg-background/70 px-2 py-3 text-center text-xs font-medium text-muted-foreground backdrop-blur-sm">
            Envie ou reutilize uma arte
          </div>
        ) : null}
      </div>
      {personalization.positionName && (
        <span className="absolute bottom-2 left-2 rounded bg-background/85 px-2 py-1 text-[10px] font-medium">
          {personalization.positionName} · {side === 'front' ? 'Frente' : 'Verso'}
        </span>
      )}
    </div>
  );

  return (
    <aside className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Prévia do item</p>
          <p className="text-xs text-muted-foreground">Frente, verso e zoom</p>
        </div>
        <ImageUploadButton
          currentImageUrl={personalization.artworkUrl ?? null}
          onUpload={(artworkUrl) =>
            onChange({ ...personalization, artworkUrl, generatedMockupUrl: undefined })
          }
          onRemove={() =>
            onChange({
              ...personalization,
              artworkUrl: undefined,
              generatedMockupUrl: undefined,
            })
          }
          folder="kit-maker/artwork"
          deleteOnRemove={false}
        />
      </div>

      <div className="grid grid-cols-2 rounded-md bg-secondary p-1" aria-label="Lado da prévia">
        {(['front', 'back'] as const).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={side === value ? 'default' : 'ghost'}
            onClick={() => setSide(value)}
          >
            {value === 'front' ? 'Frente' : 'Verso'}
          </Button>
        ))}
      </div>

      <div className="relative">
        {renderCanvas()}
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label="Aumentar zoom"
            onClick={() => setZoom((current) => Math.min(1.6, current + 0.15))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label="Diminuir zoom"
            onClick={() => setZoom((current) => Math.max(0.7, current - 0.15))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label="Abrir prévia em tela cheia"
            onClick={() => setFullscreen(true)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={
          isGenerating ||
          !personalization.enabled ||
          !personalization.techniqueName ||
          !personalization.artworkUrl ||
          !imageUrl
        }
        onClick={handleGenerateMockup}
      >
        {isGenerating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        {isGenerating
          ? 'Gerando prévia...'
          : personalization.generatedMockupUrl
            ? 'Gerar nova prévia'
            : 'Gerar personalização'}
      </Button>

      {savedArtworkUrls.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1 text-xs font-medium">
            <Images className="h-3.5 w-3.5" /> Artes usadas neste kit
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {savedArtworkUrls.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() =>
                  onChange({ ...personalization, artworkUrl: url, generatedMockupUrl: undefined })
                }
                className={cn(
                  'h-12 w-12 shrink-0 overflow-hidden rounded border bg-background p-1',
                  personalization.artworkUrl === url && 'border-primary ring-2 ring-primary/30',
                )}
                aria-label="Reutilizar arte salva"
              >
                <img src={url} alt="Arte salva" className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Prévia indicativa. A arte, a área e a técnica serão validadas antes da produção.
      </p>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-5xl">
          <DialogTitle>Prévia de {displayName}</DialogTitle>
          {renderCanvas(true)}
        </DialogContent>
      </Dialog>
    </aside>
  );
}

// ============================================
// Componente principal
// ============================================

export function PersonalizationConfig({
  box,
  items,
  kitQuantity = 100,
  boxPersonalization,
  itemPersonalizations,
  onBoxPersonalizationChange,
  onItemPersonalizationChange,
}: PersonalizationConfigProps) {
  const targets = [
    ...(box
      ? [
          {
            key: 'box',
            productId: box.id,
            displayName: box.name,
            imageUrl: box.imageUrl,
            personalization: boxPersonalization,
            onChange: onBoxPersonalizationChange,
            isBox: true,
            quantity: kitQuantity,
          },
        ]
      : []),
    ...items.map((item) => {
      const lineId = getKitItemLineId(item);
      return {
        key: lineId,
        productId: item.id,
        displayName: item.name,
        imageUrl: item.imageUrl,
        personalization: itemPersonalizations[lineId] ??
          itemPersonalizations[item.id] ?? { enabled: false },
        onChange: (config: KitItemPersonalization) => onItemPersonalizationChange(lineId, config),
        isBox: false,
        quantity: item.quantity * kitQuantity,
      };
    }),
  ];
  const [activeTargetKey, setActiveTargetKey] = useState(targets[0]?.key ?? '');
  const activeTarget = targets.find((target) => target.key === activeTargetKey) ?? targets[0];
  const firstTargetKey = targets[0]?.key;
  const hasActiveTarget = targets.some((target) => target.key === activeTargetKey);
  const savedArtworkUrls = Array.from(
    new Set(
      targets
        .map((target) => target.personalization.artworkUrl)
        .filter((url): url is string => Boolean(url)),
    ),
  );

  useEffect(() => {
    if (firstTargetKey && !hasActiveTarget) {
      setActiveTargetKey(firstTargetKey);
    }
  }, [activeTargetKey, firstTargetKey, hasActiveTarget]);

  const totalPersonalizations =
    (boxPersonalization.enabled ? 1 : 0) +
    Object.values(itemPersonalizations).filter((p) => p.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Settings className="h-5 w-5" />
            Configurar Personalização
          </h3>
          <p className="text-sm text-muted-foreground">
            Escolha quais itens serão personalizados e configure a técnica de gravação
          </p>
        </div>

        {totalPersonalizations > 0 && (
          <Badge variant="default" className="text-sm">
            <Check className="mr-1 h-3 w-3" />
            {totalPersonalizations} {totalPersonalizations === 1 ? 'item' : 'itens'}{' '}
            personalizado(s)
          </Badge>
        )}
      </div>

      {/* Alerta de quantidade mínima */}
      {kitQuantity < 50 && totalPersonalizations > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-warning/20 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-warning" />
          <div>
            <p className="font-medium text-warning">Quantidade baixa para personalização</p>
            <p className="text-xs text-muted-foreground">
              A maioria das técnicas de gravação exige lote mínimo de 50 unidades. Com {kitQuantity}{' '}
              {kitQuantity === 1 ? 'kit' : 'kits'}, o custo por unidade pode ser significativamente
              maior.
            </p>
          </div>
        </div>
      )}

      {activeTarget && (
        <>
          {targets
            .filter((target) => target.key !== activeTarget.key && target.personalization.enabled)
            .map((target) => (
              <PersonalizationPriceSynchronizer
                key={`price-sync:${target.key}`}
                productId={target.productId}
                personalization={target.personalization}
                onChange={target.onChange}
                quantity={target.quantity}
              />
            ))}
          <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Itens do seu kit</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Selecione um item para personalizar.
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {targets.map((target) => {
                  const configured =
                    target.personalization.enabled &&
                    Boolean(target.personalization.techniqueId) &&
                    Number.isFinite(target.personalization.estimatedPrice) &&
                    Number.isFinite(target.personalization.totalPrice) &&
                    target.personalization.pricedQuantity === target.quantity;
                  return (
                    <button
                      key={target.key}
                      type="button"
                      onClick={() => setActiveTargetKey(target.key)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors',
                        activeTarget.key === target.key
                          ? 'border-primary bg-primary/10'
                          : 'hover:bg-muted/60',
                      )}
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-secondary">
                        {target.imageUrl ? (
                          <img
                            src={target.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="m-3 h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {target.displayName}
                        </span>
                        <span
                          className={cn(
                            'text-xs',
                            configured ? 'text-success' : 'text-muted-foreground',
                          )}
                        >
                          {configured
                            ? 'Personalização concluída'
                            : target.personalization.enabled
                              ? 'Configuração pendente'
                              : 'Sem personalização'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <div className="min-w-0">
              <ItemPersonalizationCard
                key={activeTarget.key}
                productId={activeTarget.productId}
                displayName={activeTarget.displayName}
                imageUrl={activeTarget.imageUrl}
                personalization={activeTarget.personalization}
                onChange={activeTarget.onChange}
                isBox={activeTarget.isBox}
                kitQuantity={activeTarget.quantity}
                showInlinePreview={false}
              />
            </div>

            <PersonalizationPreview
              displayName={activeTarget.displayName}
              imageUrl={activeTarget.imageUrl}
              personalization={activeTarget.personalization}
              onChange={activeTarget.onChange}
              savedArtworkUrls={savedArtworkUrls}
            />
          </div>
        </>
      )}

      {items.length === 0 && !box && (
        <div className="py-12 text-center text-muted-foreground">
          <Palette className="mx-auto mb-3 h-12 w-12 opacity-50" />
          <p>Selecione uma caixa e itens para configurar a personalização</p>
        </div>
      )}
    </div>
  );
}
