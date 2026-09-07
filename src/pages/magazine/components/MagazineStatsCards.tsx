/**
 * MagazineStatsCards — KPI strip do módulo Magazine.
 *
 * Padrão idêntico ao NoveltyStatsCards (useCountUp + Card + hover glow +
 * scale-fade-in escalonado). 5 variantes mapeadas para o esquema de cor
 * semântico do design system.
 *
 * Props:
 *   counts  — objeto com all/draft/published/archived/views
 *   isLoading — exibe skeleton enquanto dados chegam
 */

import { Card, CardContent } from '@/components/ui/card';
import {
  BookOpen,
  FileText,
  CheckCircle2,
  Archive,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// ── Count-up (mesma impl. do NoveltyStatsCards — ISSUE-28) ────────────────────
function useCountUp(end: number, duration = 800) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  countRef.current = count;

  useEffect(() => {
    const startValue = countRef.current;
    if (startValue === end) return;
    let startTime: number | null = null;
    let rafId: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - (1 - progress) ** 4;
      setCount(Math.round(startValue + (end - startValue) * easeOutQuart));
      if (progress < 1) rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [end, duration]);
  return count;
}

// ── Variantes de cor ────────────────────────────────────────────────────────
type Variant = 'default' | 'info' | 'orange' | 'success' | 'warning';

const variantStyles: Record<Variant, { iconBg: string; iconColor: string; glow: string }> = {
  success: {
    iconBg: 'bg-success/15',
    iconColor: 'text-success',
    glow: 'hover:shadow-[0_0_20px_hsl(var(--success)/0.15)]',
  },
  warning: {
    iconBg: 'bg-warning/15',
    iconColor: 'text-warning',
    glow: 'hover:shadow-[0_0_20px_hsl(var(--warning)/0.15)]',
  },
  info: {
    iconBg: 'bg-info/15',
    iconColor: 'text-info',
    glow: 'hover:shadow-[0_0_20px_hsl(var(--info)/0.15)]',
  },
  default: {
    iconBg: 'bg-primary/15',
    iconColor: 'text-primary',
    glow: 'hover:shadow-[0_0_20px_hsl(var(--primary)/0.15)]',
  },
  orange: {
    iconBg: 'bg-brand-primary/15',
    iconColor: 'text-brand-primary',
    glow: 'hover:shadow-[0_0_20px_hsl(var(--brand-primary)/0.15)]',
  },
};

// ── StatCard ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  variant: Variant;
  delay?: number;
}

function StatCard({ label, value, suffix = '', icon, variant, delay = 0 }: StatCardProps) {
  const animatedValue = useCountUp(value, 800);
  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        'border-border/50 transition-all duration-300 hover:border-primary/30',
        styles.glow,
      )}
      style={{ animation: `scale-fade-in 0.4s ease-out ${delay}ms backwards` }}
    >
      <CardContent className="p-2.5 sm:p-3">
        <div className="flex items-center gap-2.5">
          <div className={cn('shrink-0 rounded-lg p-2', styles.iconBg, styles.iconColor)}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold tabular-nums leading-tight sm:text-xl">
              {animatedValue.toLocaleString('pt-BR')}
              {suffix}
            </p>
            <p className="truncate text-[10px] leading-tight text-muted-foreground sm:text-xs">
              {label}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────────────
function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="border-border/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg sm:h-11 sm:w-11" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Exported component ───────────────────────────────────────────────────────
export interface MagazineCounts {
  all: number;
  draft: number;
  published: number;
  archived: number;
  views: number;
}

interface MagazineStatsCardsProps {
  counts: MagazineCounts;
  isLoading?: boolean;
}

export function MagazineStatsCards({ counts, isLoading = false }: MagazineStatsCardsProps) {
  if (isLoading) return <StatsCardsSkeleton />;

  // Sem revistas = sem KPI strip (empty state cuida do layout)
  if (counts.all === 0 && !isLoading) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      <StatCard
        label="Total de revistas"
        value={counts.all}
        icon={<BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />}
        variant="default"
        delay={0}
      />
      <StatCard
        label="Rascunhos"
        value={counts.draft}
        icon={<FileText className="h-4 w-4 sm:h-5 sm:w-5" />}
        variant="warning"
        delay={100}
      />
      <StatCard
        label={counts.published === 1 ? 'Publicada' : 'Publicadas'}
        value={counts.published}
        icon={<CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />}
        variant="success"
        delay={150}
      />
      <StatCard
        label={counts.archived === 1 ? 'Arquivada' : 'Arquivadas'}
        value={counts.archived}
        icon={<Archive className="h-4 w-4 sm:h-5 sm:w-5" />}
        variant="info"
        delay={200}
      />
      <StatCard
        label="Visualizações totais"
        value={counts.views}
        icon={<BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />}
        variant="orange"
        delay={300}
      />
    </div>
  );
}

// Fallback de erro (reutilizável)
export function MagazineStatsCardsError() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="border-border/50 border-destructive/20">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2.5">
              <div className="shrink-0 rounded-lg bg-destructive/10 p-2">
                <AlertCircle className="h-4 w-4 text-destructive/70 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold tabular-nums leading-tight text-muted-foreground sm:text-xl">
                  —
                </p>
                <p className="text-[10px] leading-tight text-muted-foreground/60 sm:text-xs">
                  Indisponível
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
