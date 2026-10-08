import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, Palette, Ruler } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TECHNIQUE_FILTERS, type TechniqueFilter } from './logoTechniqueFilters';
import type { TechniqueColorConfig } from '../techniqueColorUtils';

/** Estado de geometria do preview — três rótulos, três níveis de confiança. */
export type GeometryState = 'ilustrativa' | 'sem_regra' | 'validada';

/**
 * Fatos de geometria disponíveis no editor. Nenhum deles é inventado aqui:
 * vêm do cadastro do produto (dimensões), dos limites oficiais da área de
 * gravação (a "máscara") e do tamanho da logo escolhido pelo usuário.
 */
export interface GeometryFacts {
  /** Filtro de técnica EFETIVO — o mesmo que a prévia aplica. Decide se há regra. */
  techniqueFilter: TechniqueFilter;
  productWidthCm?: number | null;
  productHeightCm?: number | null;
  maxWidthCm?: number | null;
  maxHeightCm?: number | null;
  logoWidthCm?: number | null;
  logoHeightCm?: number | null;
}

export interface GeometryDescriptor {
  state: GeometryState;
  /** Rótulo exibido. Medidas em cm SÓ no estado `validada`. */
  label: string;
  /** Números por trás do rótulo — `null` fora de `validada` (nunca falsa precisão). */
  measuresCm: {
    logoWidthCm: number;
    logoHeightCm: number;
    areaWidthCm: number;
    areaHeightCm: number;
  } | null;
}

const positiveOrNull = (v: number | null | undefined): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;

/** cm com 1 casa, no padrão pt-BR, sem depender de ICU. */
const formatCm = (v: number) => v.toFixed(1).replace('.', ',');

/** true quando a técnica casa uma regra de simulação conhecida (não o `default`). */
export function techniqueHasRule(techniqueFilter: TechniqueFilter): boolean {
  return techniqueFilter !== TECHNIQUE_FILTERS.default;
}

/**
 * Rotula a geometria da prévia. Decisão do mais restritivo ao mais frouxo:
 *
 *  1. `sem_regra`   — técnica sem regra de simulação: NUNCA vira selo de compatível e
 *                     nenhuma medida é exibida (régua só com regra + fronteira oficial).
 *  2. `validada`    — técnica com regra + dimensões reais do produto + limites oficiais
 *                     da área (a máscara): ÚNICO estado que mostra medidas em cm.
 *  3. `ilustrativa` — dimensões conhecidas mas SEM máscara oficial (ou dimensões
 *                     ausentes, trava Q13): posicionamento ilustrativo, sem fronteira
 *                     oficial desenhada e sem cm.
 */
export function describeGeometry(facts: GeometryFacts): GeometryDescriptor {
  if (!techniqueHasRule(facts.techniqueFilter)) {
    return {
      state: 'sem_regra',
      label: 'Técnica sem regra de área · sem selo de compatibilidade',
      measuresCm: null,
    };
  }

  const productW = positiveOrNull(facts.productWidthCm);
  const productH = positiveOrNull(facts.productHeightCm);
  const areaW = positiveOrNull(facts.maxWidthCm);
  const areaH = positiveOrNull(facts.maxHeightCm);
  const logoW = positiveOrNull(facts.logoWidthCm);
  const logoH = positiveOrNull(facts.logoHeightCm);

  if (
    (productW !== null || productH !== null) &&
    areaW !== null &&
    areaH !== null &&
    logoW !== null &&
    logoH !== null
  ) {
    return {
      state: 'validada',
      label:
        `Geometria validada · logo ${formatCm(logoW)} × ${formatCm(logoH)} cm` +
        ` · área oficial ${formatCm(areaW)} × ${formatCm(areaH)} cm`,
      measuresCm: {
        logoWidthCm: logoW,
        logoHeightCm: logoH,
        areaWidthCm: areaW,
        areaHeightCm: areaH,
      },
    };
  }

  return {
    state: 'ilustrativa',
    label: 'Geometria ilustrativa · posicionamento sem fronteira oficial',
    measuresCm: null,
  };
}

const GEOMETRY_ICONS: Record<GeometryState, typeof Ruler> = {
  validada: Ruler,
  ilustrativa: Info,
  sem_regra: AlertTriangle,
};

interface LogoPreviewCanvasProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  productImageUrl: string;
  logoPreview: string | null;
  logoDisplay: { widthPx: number; heightPx: number } | null;
  positionX: number;
  positionY: number;
  logoRotation: number;
  userScaleFactor: number;
  processedLogoUrl: string | null;
  techniqueFilter: TechniqueFilter;
  colorConfigFilter: { filter: string; opacity: number } | null;
  techniqueColorConfig?: TechniqueColorConfig | null;
  techniqueName?: string;
  /**
   * Fatos de geometria (cm) para rotular a prévia: dimensões reais do produto,
   * limites oficiais da área e tamanho real da logo. Ausentes ⇒ prévia ilustrativa.
   */
  productWidthCm?: number | null;
  productHeightCm?: number | null;
  maxWidthCm?: number | null;
  maxHeightCm?: number | null;
  logoWidthCm?: number | null;
  logoHeightCm?: number | null;
  onPointerDown: (e: React.PointerEvent) => void;
  onColorConfigClick?: () => void;
}

export function LogoPreviewCanvas({
  containerRef,
  productImageUrl,
  logoPreview,
  logoDisplay,
  positionX,
  positionY,
  logoRotation,
  userScaleFactor,
  processedLogoUrl,
  techniqueFilter,
  colorConfigFilter,
  techniqueColorConfig,
  techniqueName,
  productWidthCm,
  productHeightCm,
  maxWidthCm,
  maxHeightCm,
  logoWidthCm,
  logoHeightCm,
  onPointerDown,
  onColorConfigClick,
}: LogoPreviewCanvasProps) {
  const isCanvasProcessed =
    processedLogoUrl &&
    (techniqueColorConfig?.category === 'laser' || techniqueColorConfig?.category === 'serigrafia');

  const geometry = describeGeometry({
    techniqueFilter,
    productWidthCm,
    productHeightCm,
    maxWidthCm,
    maxHeightCm,
    logoWidthCm,
    logoHeightCm,
  });
  const GeometryIcon = GEOMETRY_ICONS[geometry.state];

  return (
    <>
      {/* Technique preview indicator */}
      {techniqueName && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2">
          <div
            className="h-4 w-4 rounded-full border-2 border-primary"
            style={{
              background: techniqueFilter.filter.includes('grayscale')
                ? 'linear-gradient(135deg, hsl(var(--muted-foreground)), hsl(var(--muted)))'
                : techniqueFilter.filter.includes('sepia')
                  ? 'linear-gradient(135deg, hsl(var(--warning)), hsl(var(--warning) / 0.65))'
                  : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))',
            }}
          />
          <span className="text-xs text-muted-foreground">
            Simulando: <span className="font-medium text-foreground">{techniqueName}</span>
          </span>
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {techniqueFilter.description}
          </Badge>
        </div>
      )}

      {/* Preview area */}
      <div
        // RefObject<T | null> (from useRef<T | null>) is structurally identical to
        // the LegacyRef<T> the JSX ref prop expects in @types/react 18.3; narrow the type param.
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className="relative aspect-square overflow-hidden rounded-lg border bg-muted/30"
      >
        <img
          src={productImageUrl}
          alt="Imagem do produto para preview de personalização"
          className="absolute inset-0 h-full w-full object-contain"
          loading="lazy"
          onError={(e) => {
            const t = e.currentTarget;
            const currentSrc = t.src;
            if (currentSrc.includes('/thumbnail')) {
              t.src = currentSrc.replace('/thumbnail', '');
            } else if (!currentSrc.endsWith('/placeholder.svg') && !t.dataset.fallback) {
              t.dataset.fallback = '1';
              t.src = '/placeholder.svg';
            }
          }}
        />

        {logoPreview && logoDisplay ? (
          <div
            className={cn(
              'absolute touch-none select-none overflow-hidden',
              'cursor-grab active:cursor-grabbing',
              'rounded-sm ring-2 ring-primary/30',
            )}
            onPointerDown={onPointerDown}
            style={{
              left: `${positionX}%`,
              top: `${positionY}%`,
              width: `${logoDisplay.widthPx}px`,
              height: `${logoDisplay.heightPx}px`,
              transform: `translate(-50%, -50%)`,
            }}
          >
            <img
              src={isCanvasProcessed ? processedLogoUrl : logoPreview}
              alt="Logo para personalização"
              className="absolute inset-0 h-full w-full object-contain"
              style={{
                transform: `rotate(${logoRotation}deg) scale(${userScaleFactor})`,
                opacity: isCanvasProcessed
                  ? 0.92
                  : (colorConfigFilter?.opacity ?? techniqueFilter.opacity),
                filter: !isCanvasProcessed
                  ? (colorConfigFilter?.filter ?? techniqueFilter.filter)
                  : 'none',
                mixBlendMode: techniqueFilter.blend as React.CSSProperties['mixBlendMode'],
              }}
              draggable={false}
              loading="lazy"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <p className="px-4 text-center text-sm text-muted-foreground">
              Faça upload do logo para posicioná-lo
            </p>
          </div>
        )}

        {/* Rótulo do estado de geometria (Codex p.11): medidas em cm só quando validada */}
        {logoPreview && logoDisplay && (
          <div
            data-testid="logo-geometry-state"
            data-state={geometry.state}
            className={cn(
              'pointer-events-none absolute inset-x-2 bottom-2 flex items-start gap-1.5 rounded-md border px-2 py-1 text-[10px] leading-snug backdrop-blur-sm',
              geometry.state === 'validada'
                ? 'border-primary/30 bg-primary/5 text-foreground'
                : 'border-border bg-background/90 text-muted-foreground',
            )}
          >
            <GeometryIcon aria-hidden="true" className="mt-px h-3 w-3 flex-shrink-0" />
            <span>{geometry.label}</span>
          </div>
        )}

        {/* Live preview badge + Color config badge */}
        {logoPreview && (
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            <Badge
              variant="secondary"
              className="gap-1 bg-background/90 text-[10px] backdrop-blur-sm"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              Preview em tempo real
            </Badge>
            {techniqueColorConfig && (
              <Badge
                variant="outline"
                role="button"
                tabIndex={0}
                aria-label="Configurar cores da técnica"
                className="cursor-pointer gap-1 bg-background/90 text-[10px] backdrop-blur-sm hover:bg-accent"
                onClick={onColorConfigClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onColorConfigClick?.();
                  }
                }}
              >
                <Palette aria-hidden="true" className="h-3 w-3" />
                {techniqueColorConfig.category === 'laser'
                  ? `Laser ${techniqueColorConfig.laserTone === 'claro' ? 'Claro' : 'Escuro'}`
                  : techniqueColorConfig.category === 'serigrafia'
                    ? `${techniqueColorConfig.colorCount || 1} cor${(techniqueColorConfig.colorCount || 1) > 1 ? 'es' : ''}`
                    : 'Policromia'}
              </Badge>
            )}
          </div>
        )}
      </div>
    </>
  );
}
