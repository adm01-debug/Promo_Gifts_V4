import type { HTMLAttributes } from 'react';
import type { Quote } from '@/hooks/quotes';

export interface PrefetchRowProps extends HTMLAttributes<HTMLDivElement> {
  prefetch: () => void;
}

export interface ColumnDef {
  id: string;
  label: string;
  width: string;
  align?: 'center' | 'left' | 'right';
  required?: boolean;
}

// ── Props ──
export interface QuotesConfigurableListProps {
  quotes: Quote[];
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkStatusChange?: (ids: string[], status: string) => void;
  onBulkExport?: (ids: string[]) => void;
  onDuplicate: (id: string) => void;
  onMarkApproved?: (id: string) => Promise<void> | void;
  /** Background refetch em andamento — usado para "Carregando mais..." */
  isFetching?: boolean;
  /** Mensagem de erro vinda do hook pai; renderiza banner com retry */
  loadError?: string | null;
  /** Callback do botão "Tentar novamente" */
  onRetry?: () => void;
}
