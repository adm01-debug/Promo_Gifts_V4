import type { GeneratedMockup } from '@/hooks/mockup/mockupGenerationService';

export interface Client {
  id: string;
  name: string;
}

export interface MockupHistoryPanelProps {
  mockupHistory: GeneratedMockup[];
  isLoading: boolean;
  clients: Client[];
  techniques?: readonly { id: string; name: string }[];
  onLoadFromHistory: (mockup: GeneratedMockup) => void;
  onDownload: (url: string) => void;
  onDelete: (id: string) => void;
}
