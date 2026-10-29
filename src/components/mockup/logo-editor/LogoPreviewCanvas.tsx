import { useEffect, useId, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, Palette, Ruler } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TECHNIQUE_FILTERS, type TechniqueFilter } from './logoTechniqueFilters';
import type { TechniqueColorConfig } from '../techniqueColorUtils';

/** Bbox de uma marca depois de girar/escalar, em px. */
export interface MarkFootprint {
  width: number;
  height: number;
}

/** Tamanho medido da área de aplicação (o preview), em px. */
export interface CanvasSize {
  width: number;
  height: number;
}

/**
 * Bbox real da marca depois do giro (`rotationDeg`) e da escala (`scaleFactor`).
 *
 * A <img> usa `object-contain` dentro da caixa de calibração (`logoDisplay`), então
 * a caixa cheia é um limite superior: a bbox nunca subestima a marca girada e um
 * corte não passa em branco. Antes disso a caixa era fixa COM `overflow-hidden` —
 * girar 90° uma marca larga (ou escalar acima de 1) a cortava sem aviso.
 */
export function getMarkFootprint(
  logoDisplay: { widthPx: number; heightPx: number },
  rotationDeg: number,
  scaleFactor: number,
): MarkFootprint {
  const radians = (rotationDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const width = Math.abs(logoDisplay.widthPx * scaleFactor);
  const height = Math.abs(logoDisplay.heightPx * scaleFactor);
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  };
}

/** Tolerância em px: não acusa corte por arredondamento sub-pixel. */
const CLIP_TOLERANCE_PX = 0.5;

/**
 * A marca (na bbox girada/escalada) ultrapassa a área de aplicação? A área tem
 * `overflow-hidden`, então o que passa da borda é cortado. Área de tamanho 0 =
 * ainda não medida: aí não afirmamos corte (não inventamos aviso sem dado).
 */
export function isMarkClipped(
  footprint: MarkFootprint,
  position: { x: number; y: number },
  area: CanvasSize,
  tolerance: number = CLIP_TOLERANCE_PX,
): boolean {
  if (area.width <= 0 || area.height <= 0) return false;

  const centerX = (position.x / 100) * area.width;
  const centerY = (position.y / 100) * area.height;

  return (
    centerX - footprint.width / 2 < -tolerance ||
    centerX + footprint.width / 2 > area.width + tolerance ||
    centerY - footprint.height / 2 < -tolerance ||
    centerY + footprint.height / 2 > area.height + tolerance
  );
}

/** Mede a área de aplicação (o preview) e acompanha mudanças de tamanho. */
function useAreaSize(ref: React.RefObject<HTMLDivElement | null>): CanvasSize {
  const [area, setArea] = useState<CanvasSize>({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      // clientWidth/Height é a caixa de conteúdo (o que `overflow-hidden` recorta de
      // verdade: sem a borda do card). Cai para o rect quando ainda não há layout.
      const width = el.clientWidth || rect.width || 0;
      const height = el.clientHeight || rect.height || width;
      setArea((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      );
    };

    update();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(update);
      observer.observe(el);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [ref]);

  return area;
}

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
  onKeyDown?: (e: React.KeyboardEvent) => void;
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
  onKeyDown,
  onColorConfigClick,
}: LogoPreviewCanvasProps) {
  const isCanvasProcessed =
    processedLogoUrl &&
    (techniqueColorConfig?.category === 'laser' || techniqueColorConfig?.category === 'serigrafia');

  const hasLogo = Boolean(logoPreview && logoDisplay);
  const instructionsId = useId();
  const area = useAreaSize(containerRef);

  // A caixa da marca (não é a área de aplicação) cresce com o giro/escala para nunca
  // cortar a marca; `dragWidth/dragHeight` mantêm a pega do arraste no tamanho de
  // calibração — a área de interação nunca encolhe abaixo dela.
  const footprint = logoDisplay ? getMarkFootprint(logoDisplay, logoRotation, userScaleFactor) : null;
  const dragWidth = logoDisplay && footprint ? Math.max(logoDisplay.widthPx, footprint.width) : 0;
  const dragHeight = logoDisplay && footprint ? Math.max(logoDisplay.heightPx, footprint.height) : 0;
  const clipped = footprint ? isMarkClipped(footprint, { x: positionX, y: positionY }, area) : false;
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
        className="relative aspect-square overflow-hidden rounded-lg border bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        role="group"
        aria-label="Área de posicionamento do logo"
        aria-describedby={instructionsId}
        tabIndex={hasLogo ? 0 : undefined}
        onKeyDown={hasLogo ? (e) => e.target === e.currentTarget && onKeyDown?.(e) : undefined}
      >
        <span id={instructionsId} className="sr-only">
          Use as setas do teclado para mover o logo em passos finos. Segure Shift para passos
          maiores.
        </span>
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

        {logoPreview && logoDisplay && footprint ? (
          <div
            data-testid="logo-drag-area"
            // Área de interação: fica no tamanho de calibração para a pega não encolher.
            className={cn('absolute touch-none select-none', 'cursor-grab active:cursor-grabbing')}
            onPointerDown={onPointerDown}
            style={{
              left: `${positionX}%`,
              top: `${positionY}%`,
              width: `${dragWidth}px`,
              height: `${dragHeight}px`,
              transform: `translate(-50%, -50%)`,
            }}
          >
            {/* Caixa da marca: acompanha giro/escala e NÃO recorta (antes era fixa com
                `overflow-hidden` e cortava a marca girada sem aviso). */}
            <div
              data-testid="logo-brand-box"
              data-clipped={clipped ? 'true' : 'false'}
              className="absolute left-1/2 top-1/2 rounded-sm ring-2 ring-primary/30"
              style={{
                width: `${footprint.width}px`,
                height: `${footprint.height}px`,
                transform: `translate(-50%, -50%)`,
              }}
            >
              <img
                src={isCanvasProcessed ? processedLogoUrl : logoPreview}
                alt="Logo para personalização"
                className="absolute left-1/2 top-1/2 object-contain"
                style={{
                  width: `${logoDisplay.widthPx}px`,
                  height: `${logoDisplay.heightPx}px`,
                  transform: `translate(-50%, -50%) rotate(${logoRotation}deg) scale(${userScaleFactor})`,
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
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <p className="px-4 text-center text-sm text-muted-foreground">
              Faça upload do logo para posicioná-lo
            </p>
          </div>
        )}

        {/* Aviso explícito de corte: a marca ultrapassa a área de aplicação */}
        {logoPreview && clipped && (
          <Badge
            variant="destructive"
            role="status"
            data-testid="logo-clip-warning"
            className="pointer-events-none absolute bottom-10 left-1/2 z-10 -translate-x-1/2 gap-1 text-[10px]"
          >
            <AlertTriangle aria-hidden="true" className="h-3 w-3" />
            Marca cortada pela área de aplicação
          </Badge>
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
