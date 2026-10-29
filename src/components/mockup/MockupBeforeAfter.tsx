/**
 * MockupBeforeAfter — Slider comparison between positioning preview and AI result
 */

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftRight } from 'lucide-react';

interface MockupBeforeAfterProps {
  beforeImage: string; // Product image with logo overlay (positioning preview)
  afterImage: string; // AI-generated mockup
  className?: string;
}

// A divisória fica entre 2% e 98% para o puxador não sair do quadro.
const MIN_POSITION = 2;
const MAX_POSITION = 98;
const KEYBOARD_STEP = 1;

const clampPosition = (value: number) => Math.max(MIN_POSITION, Math.min(MAX_POSITION, value));

export function MockupBeforeAfter({ beforeImage, afterImage, className }: MockupBeforeAfterProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    setSliderPosition(clampPosition(x));
  }, []);

  // Teclado: setas movem 1 ponto, Home/End vão aos extremos (WAI-ARIA APG slider).
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        next = sliderPosition - KEYBOARD_STEP;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        next = sliderPosition + KEYBOARD_STEP;
        break;
      case 'Home':
        next = MIN_POSITION;
        break;
      case 'End':
        next = MAX_POSITION;
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
    setSliderPosition(clampPosition(next));
  }, [sliderPosition]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label="Comparação antes e depois"
      aria-valuemin={MIN_POSITION}
      aria-valuemax={MAX_POSITION}
      aria-valuenow={Math.round(sliderPosition)}
      aria-valuetext={`${Math.round(sliderPosition)}% de posicionamento`}
      tabIndex={0}
      className={cn(
        'relative cursor-col-resize touch-none select-none overflow-hidden rounded-xl border-2 border-primary/20',
        'aspect-square bg-muted/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* After image (full background) */}
      <img
        src={afterImage}
        alt="Mockup gerado pela IA"
        className="absolute inset-0 h-full w-full object-contain"
        draggable={false}
        loading="lazy"
      />

      {/* Before image (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPosition}%` }}>
        <img
          src={beforeImage}
          alt="Preview de posicionamento"
          className="absolute left-0 top-0 h-full object-contain"
          style={{ width: `${(1 / (sliderPosition / 100)) * 100}%`, maxWidth: 'none' }}
          draggable={false}
          loading="lazy"
        />
      </div>

      {/* Slider line */}
      <div
        className="absolute bottom-0 top-0 z-10 w-0.5 bg-primary shadow-lg shadow-primary/50"
        style={{ left: `${sliderPosition}%` }}
      >
        {/* Handle */}
        <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
          <ArrowLeftRight aria-hidden="true" className="h-5 w-5" />
        </div>
      </div>

      {/* Labels */}
      <Badge
        variant="secondary"
        className="absolute left-3 top-3 z-20 bg-background/80 text-[10px] backdrop-blur-sm"
      >
        Posicionamento
      </Badge>
      <Badge
        variant="secondary"
        className="absolute right-3 top-3 z-20 bg-background/80 text-[10px] backdrop-blur-sm"
      >
        IA Gerada
      </Badge>
    </div>
  );
}
