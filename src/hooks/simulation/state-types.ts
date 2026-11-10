export type {
  Product,
  Client,
  Technique,
  TechniqueSettings,
  SimulationOption,
  SavedSimulation,
  SimulatorStep,
} from '@/types/simulation';
export type { ExternalTechnique } from '@/types/external-db';
export type { SimulationScenario } from '@/components/simulator/ScenarioComparison';

export type Location = {
  locationId: string;
  componentName: string;
  locationName: string;
  maxWidth: number;
  maxHeight: number;
  maxArea: number;
  techniqueId: string | null;
  techniqueName: string | null;
  maxColors: number | null;
};

export type ClientRow = {
  id: string;
  razao_social?: string;
  nome_fantasia?: string;
  ramo?: string;
  nicho?: string;
  logo_url?: string;
};
