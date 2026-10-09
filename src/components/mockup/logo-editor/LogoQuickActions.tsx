import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Target, RotateCw, RotateCcw, FlipHorizontal2, FlipVertical2 } from 'lucide-react';

interface LogoQuickActionsProps {
  logoPreview: string | null;
  positionX: number;
  positionY: number;
  logoRotation: number;
  onPositionChange: (x: number, y: number) => void;
  onRotationChange?: (rotation: number) => void;
}

export function LogoQuickActions({
  logoPreview,
  positionX,
  positionY,
  logoRotation,
  onPositionChange,
  onRotationChange,
}: LogoQuickActionsProps) {
  const toggleOrientation = useCallback(() => {
    const newRotation = ((logoRotation || 0) + 90) % 360;
    onRotationChange?.(newRotation);
  }, [logoRotation, onRotationChange]);

  const rotateClockwise = useCallback(() => {
    const newRotation = ((logoRotation || 0) + 15) % 360;
    onRotationChange?.(newRotation);
  }, [logoRotation, onRotationChange]);

  const rotateCounterClockwise = useCallback(() => {
    const newRotation = ((logoRotation || 0) - 15 + 360) % 360;
    onRotationChange?.(newRotation);
  }, [logoRotation, onRotationChange]);

  return (
    <>
      {/* Centralizar — cada ação declara o alvo (horizontal, vertical ou ambos) */}
      <div className="flex gap-2">
        <div role="group" aria-label="Centralizar logo" className="flex flex-1 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPositionChange(50, positionY)}
                disabled={!logoPreview}
                className="flex-1"
              >
                <Target aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
                Horizontal
              </Button>
            </TooltipTrigger>
            <TooltipContent>Centraliza o logo no eixo horizontal</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPositionChange(50, 50)}
                disabled={!logoPreview}
                className="flex-1"
              >
                <Target aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
                Ambos
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Centraliza o logo nos dois eixos (horizontal e vertical)
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPositionChange(positionX, 50)}
                disabled={!logoPreview}
                className="flex-1"
              >
                <Target aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
                Vertical
              </Button>
            </TooltipTrigger>
            <TooltipContent>Centraliza o logo no eixo vertical</TooltipContent>
          </Tooltip>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleOrientation}
              disabled={!logoPreview}
              className="flex-1"
            >
              {(logoRotation || 0) % 180 === 0 ? (
                <FlipVertical2 aria-hidden="true" className="mr-1 h-4 w-4" />
              ) : (
                <FlipHorizontal2 aria-hidden="true" className="mr-1 h-4 w-4" />
              )}
              Girar
            </Button>
          </TooltipTrigger>
          <TooltipContent>Rotacionar o logo 90° (alternar orientação)</TooltipContent>
        </Tooltip>
      </div>

      {/* Rotation controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={rotateCounterClockwise}
          disabled={!logoPreview}
          className="flex-1"
        >
          <RotateCcw aria-hidden="true" className="mr-1 h-4 w-4" />
          -15°
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={logoRotation ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => onRotationChange?.(0)}
              disabled={!logoPreview || !logoRotation}
              className="min-w-[48px]"
            >
              {logoRotation || 0}°
            </Button>
          </TooltipTrigger>
          <TooltipContent>Resetar rotação para 0°</TooltipContent>
        </Tooltip>
        <Button
          variant="outline"
          size="sm"
          onClick={rotateClockwise}
          disabled={!logoPreview}
          className="flex-1"
        >
          <RotateCw aria-hidden="true" className="mr-1 h-4 w-4" />
          +15°
        </Button>
      </div>
    </>
  );
}
