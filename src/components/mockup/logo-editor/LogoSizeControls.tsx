import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Ruler, Target, Lock, LockOpen, Minus, Plus } from 'lucide-react';

interface LogoSizeControlsProps {
  logoPreview: string | null;
  logoWidth: number;
  logoHeight: number;
  logoScale: number;
  logoRotation: number;
  positionX: number;
  positionY: number;
  maxWidth?: number | null;
  maxHeight?: number | null;
  onSizeChange: (width: number, height: number) => void;
  onLogoScaleChange?: (scale: number) => void;
}

export function LogoSizeControls({
  logoPreview,
  logoWidth,
  logoHeight,
  logoScale,
  logoRotation,
  positionX,
  positionY,
  maxWidth,
  maxHeight,
  onSizeChange,
  onLogoScaleChange,
}: LogoSizeControlsProps) {
  const effectiveMaxW = maxWidth && maxWidth > 0 ? maxWidth : 20;
  const effectiveMaxH = maxHeight && maxHeight > 0 ? maxHeight : 20;

  // Vínculo de proporções: ligado, cada lado arrasta o outro mantendo a razão
  // largura:altura da área, para o logo inteiro ser exibido sem distorção.
  const [aspectLinked, setAspectLinked] = useState(true);
  const ratio = logoWidth > 0 && logoHeight > 0 ? logoWidth / logoHeight : 1;
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // Com o vínculo ligado, o intervalo da dimensão editada já embute os limites
  // da dimensão vinculada: o corte vira um fator comum aos dois eixos, então a
  // razão se mantém mesmo quando um dos lados bate no mínimo ou no máximo.
  const setWidth = (nextWidth: number) => {
    if (aspectLinked) {
      const linkedMinW = Math.max(1, ratio);
      const linkedMaxW = Math.min(effectiveMaxW, effectiveMaxH * ratio);
      const width = Math.min(linkedMaxW, Math.max(linkedMinW, nextWidth));
      onSizeChange(round2(width), round2(width / ratio));
      return;
    }
    onSizeChange(round2(Math.min(effectiveMaxW, Math.max(1, nextWidth))), logoHeight);
  };

  const setHeight = (nextHeight: number) => {
    if (aspectLinked) {
      const linkedMinH = Math.max(1, 1 / ratio);
      const linkedMaxH = Math.min(effectiveMaxH, effectiveMaxW / ratio);
      const height = Math.min(linkedMaxH, Math.max(linkedMinH, nextHeight));
      onSizeChange(round2(height * ratio), round2(height));
      return;
    }
    onSizeChange(logoWidth, round2(Math.min(effectiveMaxH, Math.max(1, nextHeight))));
  };

  return (
    <div className="flex gap-4 border-t pt-2">
      {/* Left: Engraving Area */}
      <div className="w-1/2 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler aria-hidden="true" className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">Área de Gravação</span>
          </div>
          {maxWidth && maxHeight && maxWidth > 0 && maxHeight > 0 && (
            <Badge variant="outline" className="text-[10px]">
              Máx {maxWidth}×{maxHeight}cm
            </Badge>
          )}
        </div>

        {/* Width */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Largura</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                aria-label="Diminuir largura"
                className="h-7 w-7"
                disabled={logoWidth <= 1}
                onClick={() => setWidth(logoWidth - 0.5)}
              >
                <Minus aria-hidden="true" className="h-3 w-3" />
              </Button>
              <span className="min-w-[44px] rounded bg-muted/50 px-1.5 py-0.5 text-center text-xs font-bold">
                {logoWidth}cm
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Aumentar largura"
                className="h-7 w-7"
                disabled={logoWidth >= effectiveMaxW}
                onClick={() => setWidth(logoWidth + 0.5)}
              >
                <Plus aria-hidden="true" className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Slider
            value={[logoWidth]}
            onValueChange={(v) => setWidth(v[0])}
            min={1}
            max={effectiveMaxW}
            step={0.5}
            aria-label="Largura (cm)"
          />
        </div>

        {/* Height */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Altura</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                aria-label="Diminuir altura"
                className="h-7 w-7"
                disabled={logoHeight <= 1}
                onClick={() => setHeight(logoHeight - 0.5)}
              >
                <Minus aria-hidden="true" className="h-3 w-3" />
              </Button>
              <span className="min-w-[44px] rounded bg-muted/50 px-1.5 py-0.5 text-center text-xs font-bold">
                {logoHeight}cm
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Aumentar altura"
                className="h-7 w-7"
                disabled={logoHeight >= effectiveMaxH}
                onClick={() => setHeight(logoHeight + 0.5)}
              >
                <Plus aria-hidden="true" className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Slider
            value={[logoHeight]}
            onValueChange={(v) => setHeight(v[0])}
            min={1}
            max={effectiveMaxH}
            step={0.5}
            aria-label="Altura (cm)"
          />
        </div>

        {/* Max area button */}
        <div className="flex items-center justify-end">
          {maxWidth && maxHeight && maxWidth > 0 && maxHeight > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-1.5 text-[10px] text-primary hover:text-primary"
              onClick={() =>
                aspectLinked ? setWidth(effectiveMaxW) : onSizeChange(maxWidth, maxHeight)
              }
            >
              <Target aria-hidden="true" className="mr-1 h-3 w-3" />
              Máxima
            </Button>
          )}
        </div>
      </div>

      {/* Right: Logo Scale */}
      <div className="w-1/2 space-y-3">
        <div className="flex items-center gap-2">
          <Ruler aria-hidden="true" className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold">Tamanho da Logo</span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Escala</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                aria-label="Diminuir escala"
                className="h-7 w-7"
                disabled={!logoPreview || logoScale <= 10}
                onClick={() => onLogoScaleChange?.(Math.max(10, logoScale - 5))}
              >
                <Minus aria-hidden="true" className="h-3 w-3" />
              </Button>
              <span className="min-w-[44px] rounded bg-muted/50 px-1.5 py-0.5 text-center text-xs font-bold">
                {logoScale}%
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Aumentar escala"
                className="h-7 w-7"
                disabled={!logoPreview || logoScale >= 500}
                onClick={() => onLogoScaleChange?.(Math.min(500, logoScale + 5))}
              >
                <Plus aria-hidden="true" className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Slider
            value={[logoScale]}
            onValueChange={(v) => onLogoScaleChange?.(v[0])}
            min={10}
            max={500}
            step={5}
            disabled={!logoPreview}
            aria-label="Escala (%)"
          />
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant={aspectLinked ? 'secondary' : 'outline'}
            size="sm"
            className="h-7 gap-1.5 px-2 text-[10px]"
            aria-pressed={aspectLinked}
            aria-label={`Vínculo de proporções (${aspectLinked ? 'ligado' : 'desligado'})`}
            onClick={() => setAspectLinked((v) => !v)}
          >
            {aspectLinked ? (
              <Lock aria-hidden="true" className="h-3 w-3 text-primary" />
            ) : (
              <LockOpen aria-hidden="true" className="h-3 w-3 text-muted-foreground" />
            )}
            {aspectLinked ? 'Proporção vinculada' : 'Proporção livre'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-1.5 text-[10px] text-primary hover:text-primary"
            onClick={() => onLogoScaleChange?.(100)}
            disabled={!logoPreview || logoScale === 100}
          >
            <Target aria-hidden="true" className="mr-1 h-3 w-3" />
            Resetar 100%
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Mantém a proporção da marca ao redimensionar.
        </p>

        {/* Status */}
        <div className="border-t pt-2">
          <div className="flex flex-col gap-1 text-[10px] text-muted-foreground">
            <span>
              Pos: {positionX}% × {positionY}%
            </span>
            <span>
              Área: {logoWidth}×{logoHeight}cm
            </span>
            <span>
              Escala: {logoScale}%{logoRotation ? ` · Rot: ${logoRotation}°` : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
