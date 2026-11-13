import type { Technique } from './mockupGenerationService';
import type { TechniqueWithLimits } from '@/hooks/useMockupTechniques';

export type MockupTechnique = Technique | TechniqueWithLimits | null;

export interface BatchMockup {
  areaName: string;
  url: string;
}

export interface MockupAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
}
