/**
 * KitLibraryStats — cards de estatística da Biblioteca de Kits (KMM-075).
 *
 * O 4o card contava `['published', 'shared']`, status que o app NUNCA grava:
 * `getPersistedKitStatus` (src/lib/kit-builder/persistence.ts:31) só devolve
 * 'draft' ou 'ready'. Medido em 2026-11-18 em produção: custom_kits tem 21
 * 'draft' e 1 'ready', zero 'published'/'shared'. O card mostrava 0 sempre.
 * Agora conta 'ready', que é o status real de kit terminado — o mesmo critério
 * do filtro "Prontos" da página.
 */
import { FileText, Library, Sparkles, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { CustomKitRow } from '@/hooks/kit-builder';

export function KitLibraryStats({ kits }: { kits: CustomKitRow[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <LibraryStat
        icon={<Library className="h-5 w-5" />}
        label="Total de kits"
        value={kits.length}
        detail="Seus projetos no Kit Maker"
      />
      <LibraryStat
        icon={<FileText className="h-5 w-5" />}
        label="Rascunhos"
        value={kits.filter((kit) => kit.status === 'draft').length}
        detail="Em edição"
      />
      <LibraryStat
        icon={<Star className="h-5 w-5" />}
        label="Favoritos"
        value={kits.filter((kit) => kit.is_favorite).length}
        detail="Acesso rápido"
      />
      <LibraryStat
        icon={<Sparkles className="h-5 w-5" />}
        label="Prontos"
        value={kits.filter((kit) => kit.status === 'ready').length}
        detail="Fechados e prontos para enviar"
      />
    </div>
  );
}

function LibraryStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}
