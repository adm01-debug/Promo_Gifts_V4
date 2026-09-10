/**
 * Kit Wizard Keyboard Shortcuts
 * - ArrowLeft/ArrowRight: prev/next step
 * - 1..4: jump to specific step
 * Disabled when focus is in inputs/textareas/contentEditable.
 */
import { useEffect } from 'react';
import type { KitBuilderFlow, KitBuilderStep } from '@/lib/kit-builder';

const BOX_FIRST_STEPS: KitBuilderStep[] = ['box', 'items', 'personalization', 'summary'];
const ITEMS_FIRST_STEPS: KitBuilderStep[] = ['items', 'box', 'personalization', 'summary'];

interface Options {
  enabled?: boolean;
  canProceed: boolean;
  currentStep: KitBuilderStep;
  completedSteps: KitBuilderStep[];
  flow?: KitBuilderFlow;
  onPrev: () => void;
  onNext: () => void;
  onJump: (step: KitBuilderStep) => void;
}

export function useKitWizardShortcuts({
  enabled = true,
  canProceed,
  currentStep,
  completedSteps,
  flow = 'box-first',
  onPrev,
  onNext,
  onJump,
}: Options) {
  useEffect(() => {
    if (!enabled) return;
    const orderedSteps = flow === 'items-first' ? ITEMS_FIRST_STEPS : BOX_FIRST_STEPS;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      const isField =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
      if (isField) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'ArrowLeft') {
        if (currentStep === orderedSteps[0]) return;
        e.preventDefault();
        onPrev();
        return;
      }
      if (e.key === 'ArrowRight') {
        if (currentStep === orderedSteps[orderedSteps.length - 1] || !canProceed) return;
        e.preventDefault();
        onNext();
        return;
      }
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = Number(e.key) - 1;
        const stepTarget = orderedSteps[idx];
        if (!stepTarget) return;
        // Allow only if completed or current
        if (stepTarget === currentStep || completedSteps.includes(stepTarget)) {
          e.preventDefault();
          onJump(stepTarget);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [enabled, canProceed, currentStep, completedSteps, flow, onPrev, onNext, onJump]);
}
