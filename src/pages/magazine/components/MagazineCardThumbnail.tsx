/**
 * MagazineCardThumbnail — thumbnail real da capa da revista renderizado
 * pelo `MagazinePageRenderer` (page.kind = 'cover'). Preserva branding,
 * categoria e fontes reais. Recorta verticalmente para caber num card
 * paisagem (~2.2:1, referência Blue Premium §20) sem distorcer.
 */

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Magazine } from '@/types/magazine';
import { MagazinePageRenderer } from './MagazinePageRenderer';

export const MagazineCardThumbnail = memo(
  ({ magazine, className }: { magazine: Magazine; className?: string }) => {
    const coverPage = useMemo(() => ({ index: 0, kind: 'cover' as const, items: [] }), []);
    return (
      <div
        aria-hidden
        className={cn('relative aspect-[11/5] w-full overflow-hidden bg-neutral-100', className)}
      >
        {/* Wrapper alinhado ao topo — recorta apenas a base (branding + título). */}
        <div className="absolute inset-x-0 top-0">
          <MagazinePageRenderer magazine={magazine} page={coverPage} totalPages={1} fitContainer />
        </div>
        {/* Gradiente de fade para o card (evita corte abrupto) */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.18) 100%)' }}
        />
      </div>
    );
  },
);
MagazineCardThumbnail.displayName = 'MagazineCardThumbnail';
