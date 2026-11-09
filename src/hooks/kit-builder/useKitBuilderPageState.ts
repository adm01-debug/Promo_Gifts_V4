import { dbInvoke } from '@/lib/db/postgrest';
import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  transformToKitItem,
  useCustomKitPersistence,
  useCustomKitsRealtime,
  useDuplicateKitDetector,
  useKitAutoSave,
  useKitBuilder,
  useKitUndoRedo,
  useTemplateSnapshot,
} from '@/hooks/kit-builder';
import type { BackupFullState } from '@/hooks/kit-builder/useKitAutoSave';
import { useKitBuilderQuote, type KitQuoteClient } from '@/pages/kit-builder/useKitBuilderQuote';
import {
  calculateTotalKitPrice,
  type ExternalProductForKit,
  type KitBox,
  type KitItem,
  type KitIdentity,
  type KitPersonalization,
  type KitAISuggestionBrief,
  type KitAIComposition,
  type KitBuilderFlow,
  type KitType,
} from '@/lib/kit-builder';
import type { KitOrigin } from '@/lib/kit-builder/types';
import { logger } from '@/lib/logger';
import { OCCASIONS, type Occasion } from '@/components/kit-builder/KitOccasionSelector';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readDraftNotes(personalizationData: Record<string, unknown>): string {
  const draft = isRecord(personalizationData.__draft) ? personalizationData.__draft : null;
  const notes = draft?.notes;
  return typeof notes === 'string' ? notes : '';
}

function readDraftClient(personalizationData: Record<string, unknown>): KitQuoteClient {
  const draft = isRecord(personalizationData.__draft) ? personalizationData.__draft : null;
  const client = draft && isRecord(draft.quoteClient) ? draft.quoteClient : null;
  if (!client) return {};

  const text = (key: string): string | undefined => {
    const value = client[key];
    return typeof value === 'string' ? value : undefined;
  };
  return {
    client_cnpj: text('client_cnpj'),
    client_company: text('client_company'),
    client_email: text('client_email'),
    client_id: text('client_id'),
    client_name: text('client_name'),
    client_phone: text('client_phone'),
  };
}

function readDraftFlow(personalizationData: Record<string, unknown>): KitBuilderFlow | undefined {
  const draft = isRecord(personalizationData.__draft) ? personalizationData.__draft : null;
  const flow = draft?.flow;
  return flow === 'box-first' || flow === 'items-first' ? flow : undefined;
}

function readDraftAIBriefing(
  personalizationData: Record<string, unknown>,
): KitAISuggestionBrief | undefined {
  const draft = isRecord(personalizationData.__draft) ? personalizationData.__draft : null;
  const briefing = draft?.aiBriefing;
  if (!isRecord(briefing)) return undefined;

  const kitType = briefing.kit_type;
  const targetPrice = briefing.target_price_brl;
  if (
    (kitType !== 'montado' && kitType !== 'original' && kitType !== 'simples') ||
    !isRecord(targetPrice) ||
    !Number.isFinite(targetPrice.min) ||
    !Number.isFinite(targetPrice.max)
  ) {
    return undefined;
  }

  const strings = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

  return {
    kit_type: kitType,
    box_keywords: strings(briefing.box_keywords),
    item_keywords: strings(briefing.item_keywords),
    target_price_brl: { min: Number(targetPrice.min), max: Number(targetPrice.max) },
    narrative: typeof briefing.narrative === 'string' ? briefing.narrative : '',
    ...(typeof briefing.title === 'string' ? { title: briefing.title } : {}),
    ...(typeof briefing.description === 'string' ? { description: briefing.description } : {}),
    ...(typeof briefing.style_tag === 'string' ? { style_tag: briefing.style_tag } : {}),
  };
}

function toSavedKitSnapshot(row: {
  name: string;
  kit_type?: string | null;
  box_data: Record<string, unknown> | null;
  items_data: Record<string, unknown>[];
  personalization_data: Record<string, unknown>;
  kit_quantity: number;
  color: string;
  icon: string;
  tag: string | null;
  description: string | null;
  is_favorite: boolean;
}) {
  if (!Array.isArray(row.items_data)) return null;
  const kitType: KitType =
    row.kit_type === 'original' || row.kit_type === 'simples' ? row.kit_type : 'montado';
  return {
    name: row.name || '',
    kitType,
    box: isRecord(row.box_data) ? (row.box_data as unknown as KitBox) : null,
    items: row.items_data as unknown as KitItem[],
    personalization: isRecord(row.personalization_data)
      ? (row.personalization_data as unknown as KitPersonalization)
      : { box: { enabled: false }, items: {} },
    quoteClient: readDraftClient(row.personalization_data),
    notes: readDraftNotes(row.personalization_data),
    flow: readDraftFlow(row.personalization_data),
    aiBriefing: readDraftAIBriefing(row.personalization_data),
    kitQuantity: Number.isFinite(row.kit_quantity) && row.kit_quantity > 0 ? row.kit_quantity : 1,
    identity: {
      color: row.color || '#3B82F6',
      icon: row.icon || 'Package',
      tag: row.tag || '',
      description: row.description || '',
      isFavorite: row.is_favorite ?? false,
    } satisfies KitIdentity,
  };
}

export function isKitMakerLandingRoute(
  kitIdParam: string | null,
  productIdParam: string | null,
): boolean {
  return !kitIdParam && !productIdParam;
}

export function useKitBuilderPageState() {
  const [searchParams] = useSearchParams();
  const kitIdParam = searchParams.get('kit');
  const productIdParam = searchParams.get('product');
  const originParam = searchParams.get('origin');
  // A direct product entry has already made the first semantic choice, so it
  // must land in the items-first journey instead of showing an empty box step.
  const initialFlow =
    searchParams.get('flow') === 'items' || productIdParam ? 'items-first' : 'box-first';

  const [currentKitId, setCurrentKitId] = useState<string | undefined>(kitIdParam || undefined);
  const [currentRevision, setCurrentRevision] = useState<number | null>(null);
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [quoteClient, setQuoteClient] = useState<KitQuoteClient>({});
  const [aiBriefing, setAIBriefing] = useState<KitAISuggestionBrief | undefined>();
  const [isLanding, setIsLanding] = useState(isKitMakerLandingRoute(kitIdParam, productIdParam));
  const [isHydrating, setIsHydrating] = useState(Boolean(kitIdParam));
  const hydratedKitIdRef = useRef<string | null>(null);

  // Navigating from the mounted landing page to ?kit=<id> does not remount
  // this hook. Derive the mode from the URL so a cloned template immediately
  // opens in the editor instead of remaining behind the landing screen.
  useEffect(() => {
    setIsLanding(isKitMakerLandingRoute(kitIdParam, productIdParam));
  }, [kitIdParam, productIdParam]);

  const {
    kitState,
    wizardState,
    kitQuantity,
    availableBoxes,
    availableItems,
    allAvailableBoxes,
    allAvailableItems,
    isLoadingBoxes,
    isLoadingItems,
    boxError,
    itemError,
    refetchBoxes,
    refetchItems,
    boxFilters,
    itemFilters,
    setBoxFilters,
    setItemFilters,
    setKitName,
    selectBox,
    clearBox,
    addItem,
    removeItem,
    clearItems,
    updateItemQuantity,
    updateItemVariant,
    reorderItems,
    setItemPersonalization,
    setBoxPersonalization,
    setKitQuantity,
    setIdentity,
    setNotes,
    goToStep,
    nextStep,
    prevStep,
    resetKit,
    restoreKitSnapshot,
    applyAIComposition,
    setKitType,
    setKitOrigin,
    loadKit,
    startNewFlow,
  } = useKitBuilder({ initialFlow });

  const { isSaving, saveKit, savedKits, isLoadingKits } = useCustomKitPersistence();
  // Keep the library and an open editor coherent when the same authenticated
  // user edits a kit from another tab/device. The hook degrades to normal
  // query refetching if Realtime is unavailable.
  useCustomKitsRealtime();
  useTemplateSnapshot();
  const { handleAddToQuote, isCreatingQuote } = useKitBuilderQuote();
  const {
    lastSavedAt,
    isSaving: isAutoSaving,
    autoSavedKitId,
    autoSaveError,
    isConflictError,
    retryLastSave,
    cancelPendingSave,
    acknowledgeManualSave,
    consumeUnloadBackup,
  } = useKitAutoSave(
    kitState,
    kitQuantity,
    currentKitId,
    currentRevision,
    (id, revision) => {
      setCurrentKitId(id);
      setCurrentRevision(revision);
    },
    !isHydrating,
    { quoteClient, flow: wizardState.flow, aiBriefing },
  );
  const {
    pushSnapshot,
    undo: undoSnapshot,
    redo: redoSnapshot,
    canUndo,
    canRedo,
    isRestoring,
  } = useKitUndoRedo();
  useDuplicateKitDetector();

  // Captura snapshot a cada mudanÃ§a significativa do kit. O pushSnapshot
  // deduplica snapshots idÃªnticos e respeita isRestoring (o prÃ³prio undo/redo
  // nÃ£o gera novo snapshot). Isto liga o undo/redo, que antes era inerte
  // (pushSnapshot nunca era chamado â†’ canUndo sempre false).
  useEffect(() => {
    if (isHydrating || isRestoring.current) return;
    pushSnapshot({
      name: kitState.name,
      kitType: kitState.kitType,
      box: kitState.box,
      items: kitState.items,
      personalization: kitState.personalization,
      kitQuantity,
      identity: kitState.identity,
      notes: kitState.notes,
      flow: wizardState.flow,
      aiBriefing,
    });
  }, [
    kitState.name,
    kitState.kitType,
    kitState.box,
    kitState.items,
    kitState.personalization,
    kitState.identity,
    kitState.notes,
    kitQuantity,
    wizardState.flow,
    aiBriefing,
    pushSnapshot,
    isRestoring,
    isHydrating,
  ]);

  // undo/redo aplicam o snapshot retornado de volta no estado do kit.
  const undo = useCallback(() => {
    const snap = undoSnapshot();
    if (snap) {
      restoreKitSnapshot(snap);
      setAIBriefing(snap.aiBriefing);
    }
  }, [undoSnapshot, restoreKitSnapshot]);

  const redo = useCallback(() => {
    const snap = redoSnapshot();
    if (snap) {
      restoreKitSnapshot(snap);
      setAIBriefing(snap.aiBriefing);
    }
  }, [redoSnapshot, restoreKitSnapshot]);

  // A saved snapshot must be restored before autosave is allowed to run. This
  // prevents a blank first render from replacing an existing kit after opening
  // /montar-kit?kit=<id>.
  useEffect(() => {
    if (!kitIdParam) {
      setIsHydrating(false);
      return;
    }
    if (isLoadingKits || hydratedKitIdRef.current === kitIdParam) return;

    const row = savedKits.find((kit) => kit.id === kitIdParam);
    hydratedKitIdRef.current = kitIdParam;
    if (!row) {
      logger.warn('[kjÍtµ‰Õ¥±‘•ÉtM…Ù•­¥Ğİ…Ì¹½Ğ™½Õ¹½È¥Ì¹¼±½¹•È…•ÍÍ¥‰±”èœ°­¥Ñ%‘A…É…´¤ì(€€€€€Ñ½…ÍĞ¹•ÉÉ½È ;¼™½¤Á½ÍÏµÙ•°…‰É¥È•ÍÑ”­¥ĞÍ…±Ù¼¸œ¤ì(€€€€€Í•Ñ%Í!å‘É…Ñ¥¹œ¡™…±Í”¤ì(€€€€€É•ÑÕÉ¸ì(€€€ô((€€€½¹ÍĞÍ¹…ÁÍ¡½Ğ€ôÑ½M…Ù•‘-¥ÑM¹…ÁÍ¡½Ğ¡É½Ü¤ì(€€€¥˜€ …Í¹…ÁÍ¡½Ğ¤ì(€€€€€±½•È¹İ…É¸ m­¥Ğµ‰Õ¥±‘•Ét%¹Ù…±¥Í…Ù•­¥ĞÍ¹…ÁÍ¡½Ğèœ°­¥Ñ%‘A…É…´¤ì(€€€€€Ñ½…ÍĞ¹•ÉÉ½È <É…ÍÕ¹¡¼‘¼­¥Ğ•ÍÓ„•´Õ´™½Éµ…Ñ¼¥¹Û…±¥‘¼¸œ¤ì(€€€€€Í•Ñ%Í!å‘É…Ñ¥¹œ¡™…±Í”¤ì(€€€€€É•ÑÕÉ¸ì(€€€ô((€€€±½…‘-¥Ğ¡Í¹…ÁÍ¡½Ğ¤ì(€€€Í•ÑEÕ½Ñ•±¥•¹Ğ¡Í¹…ÁÍ¡½Ğ¹ÅÕ½Ñ•±¥•¹Ğ¤ì(€€€Í•Ñ%	É¥•™¥¹œ¡Í¹…ÁÍ¡½Ğ¹…¥	É¥•™¥¹œ¤ì(€€€Í•ÑÕÉÉ•¹Ñ-¥Ñ%¡É½Ü¹¥¤ì(€€€Í•ÑÕÉÉ•¹ÑI•Ù¥Í¥½¸¡É½Ü¹É•Ù¥Í¥½¸¤ì(€€€¥˜€¡½É¥¥¹A…É…´€ôôô€µ…¹Õ…°œñğ½É¥¥¹A…É…´€ôôô€Ñ•µÁ±…Ñ”œñğ½É¥¥¹A…É…´€ôôô€…¤œ¤ì(€€€€€Í•Ñ-¥Ñ=É¥¥¸¡½É¥¥¹A…É…´¤ì(€€€ô(€€€Í•Ñ%Í!å‘É…Ñ¥¹œ¡™…±Í”¤ì(€ô°m¥Í1½…‘¥¹-¥ÑÌ°­¥Ñ%‘A…É…´°±½…‘-¥Ğ°½É¥¥¹A…É…´°Í…Ù•‘-¥ÑÌ°Í•Ñ-¥Ñ=É¥¥¹t¤ì((€€¼¼1½…1½¥Œ€¡M¥µÁ±¥™¥•™½ÈÑ¡”Á…ÑÑ•É¸•á…µÁ±”¤(€ÕÍ•™™•Ğ  ¤€ôøì(€€€¥˜€¡ÁÉ½‘ÕÑ%‘A…É…´€˜˜€…­¥Ñ%‘A…É…´¤ì(€€€€€€¡…Íå¹Œ€ ¤€ôøì(€€€€€€€ÑÉäì(€€€€€€€€€½¹ÍĞÉ•ÍÕ±Ğ€ô…İ…¥Ğ‘‰%¹Ù½­”ñáÑ•É¹…±AÉ½‘ÕÑ½É-¥Ğø¡ì(€€€€€€€€€€€Ñ…‰±”è€ÁÉ½‘ÕÑÌœ°(€€€€€€€€€€€½Á•É…Ñ¥½¸è€Í•±•Ğœ°(€€€€€€€€€€€™¥±Ñ•ÉÌèì¥èÁÉ½‘ÕÑ%‘A…É…´ô°(€€€€€€€€€€€±¥µ¥Ğè€Ä°(€€€€€€€€€ô¤ì(€€€€€€€€€¥˜€¡É•ÍÕ±Ğ¹É•½É‘Ìü¹±•¹Ñ €ø€À¤ì(€€€€€€€€€€€½¹ÍĞ­¥Ñ%Ñ•´€ôÑÉ…¹Í™½ÉµQ½-¥Ñ%Ñ•´¡É•ÍÕ±Ğ¹É•½É‘ÍlÁt¤ì(€€€€€€€€€€€¥˜€ …­¥Ñ%Ñ•´¤ì(€€€€€€€€€€€€€Ñ½…ÍĞ¹•ÉÉ½È ÍÑ”ÁÉ½‘ÕÑ¼»¼Á½ÍÍÕ¤ÁÉ—¼½µ•É¥…°‘¥ÍÁ½»µÙ•°Á…É„¼­¥Ğ¸œ¤ì(€€€€€€€€€€€€€É•ÑÕÉ¸ì(€€€€€€€€€€€ô(€€€€€€€€€€€…‘‘%Ñ•´¡­¥Ñ%Ñ•´¤ì(€€€€€€€€€€€Í•Ñ-¥Ñ9…µ”¡É•ÍÕ±Ğ¹É•½É‘ÍlÁt¹¹…µ”ñğ€œœ¤ì(€€€€€€€€€ô(€€€€€€€ô…Ñ €¡•ÉÈ¤ì(€€€€€€€€€±½•È¹İ…É¸ m­¥Ğµ‰Õ¥±‘•Ét…¥±•Ñ¼±½…ÁÉ½‘ÕĞèœ°•ÉÈ¤ì(€€€€€€€ô(€€€€€ô¤ ¤ì(€€€ô(€€€€¼¼•Í±¥¹Ğµ‘¥Í…‰±”µ¹•áĞµ±¥¹”É•…Ğµ¡½½­Ì½•á¡…ÕÍÑ¥Ù”µ‘•ÁÌ(€ô°mÁÉ½‘ÕÑ%‘A…É…´°­¥Ñ%‘A…É…µt¤ì((€€¼¼™™•ÑÌ€¡½¹™•ÑÑ¤°Q¥Ñ±”°•ÑŒ¸¤(€½¹ÍĞÁÉ•Ù%ÍY…±¥‘I•˜€ôÕÍ•I•˜¡™…±Í”¤ì(€ÕÍ•™™•Ğ  ¤€ôøì(€€€½¹ÍĞİ…ÍY…±¥€ôÁÉ•Ù%ÍY…±¥‘I•˜¹ÕÉÉ•¹Ğì(€€€ÁÉ•Ù%ÍY…±¥‘I•˜¹ÕÉÉ•¹Ğ€ô­¥ÑMÑ…Ñ”¹¥ÍY…±¥ì(€€€€¼¼=¹±ä™¥É”İ¡•¸ÑÉ…¹Í¥Ñ¥½¹¥¹œ¥¹Ù…±¥“ŠIÙ…±¥°…¹É•ÍÁ•ĞÁÉ•™•ÉÌµÉ•‘Õ•µµ½Ñ¥½¸(€€€¥˜€ …İ…ÍY…±¥€˜˜­¥ÑMÑ…Ñ”¹¥ÍY…±¥€˜˜­¥ÑMÑ…Ñ”¹¥Ñ•µÌ¹±•¹Ñ €ø€À¤ì(€€€€€¥˜€ …İ¥¹‘½Ü¹µ…Ñ¡5•‘¥„ œ¡ÁÉ•™•ÉÌµÉ•‘Õ•µµ½Ñ¥½¸èÉ•‘Õ”¤œ¤¹µ…Ñ¡•Ì¤ì(€€€€€€€½¹™•ÑÑ¤¡ì(€€€€€€€€€Á…ÉÑ¥±•½Õ¹Ğè€ØÀ°(€€€€€€€€€ÍÁÉ•…è€ÜÀ°(€€€€€€€€€½É¥¥¸èìäè€À¸àÔ°àè€À¸Ôô°(€€€€€€€€€½±½ÉÌèm­¥ÑMÑ…Ñ”¹¥‘•¹Ñ¥Ñäü¹½±½Èñğ€œŒÍàÉØt°(€€€€€€€ô¤ì(€€€€€ô(€€€ô(€ô°m­¥ÑMÑ…Ñ”¹¥‘•¹Ñ¥Ñäü¹½±½È°­¥ÑMÑ…Ñ”¹¥ÍY…±¥°­¥ÑMÑ…Ñ”¹¥Ñ•µÌ¹±•¹Ñ¡t¤ì((€½¹ÍĞÁÉ¥¥¹œ€ô…±Õ±…Ñ•Q½Ñ…±-¥ÑAÉ¥” (€€€­¥ÑMÑ…Ñ”¹‰½à°(€€€­¥ÑMÑ…Ñ”¹¥Ñ•µÌ°(€€€­¥ÑMÑ…Ñ”¹Á•ÉÍ½¹…±¥é…Ñ¥½¸°(€€€­¥ÑEÕ…¹Ñ¥Ñä°(€€¤ì((€½¹ÍĞ¡…¹‘±•M…Ù•-¥Ğ€ôÕÍ•…±±‰…¬¡…Íå¹Œ€ ¤€ôøì(€€€¥˜€ …­¥ÑMÑ…Ñ”¹‰½à€˜˜­¥ÑMÑ…Ñ”¹¥Ñ•µÌ¹±•¹Ñ €ôôô€À¤ì(€€€€€Ñ½…ÍĞ¹•ÉÉ½È ‘¥¥½¹”Õµ„…¥á„½Ô¥Ñ•´…¹Ñ•Ì‘”Í…±Ù…È¼­¥Ğ¸œ¤ì(€€€€€É•ÑÕÉ¸ì(€€€ô(€€€¥˜€¡¥ÍÕÑ½M…Ù¥¹œ¤ì(€€€€€Ñ½…ÍĞ¹¥¹™¼ (€€€€€€€€<Í…±Ù…µ•¹Ñ¼…ÕÑ½·…Ñ¥¼•ÍÓ„•´…¹‘…µ•¹Ñ¼¸Õ…É‘”„½¹™¥Éµ‡Ÿ¼…¹Ñ•Ì‘”Í…±Ù…È¹½Ù…µ•¹Ñ”¸œ°(€€€€€€¤ì(€€€€€É•ÑÕÉ¸ì(€€€ô(€€€€¼¼AÉ•Ù•¹ĞÑ¡”‘•‰½Õ¹”Ñ¥µ•È™É½´É…¥¹œÑ¡”•áÁ±¥¥ĞÍ…Ù”…¹ÍÕ‰µ¥ÑÑ¥¹œ(€€€€¼¼„ÍÑ…±”É•Ù¥Í¥½¸¥µµ•‘¥…Ñ•±ä…™Ñ•ÈÑ¡”µ…¹Õ…°½Á•É…Ñ¥½¸¸(€€€…¹•±A•¹‘¥¹M…Ù” ¤ì(€€€ÑÉäì(€€€€€½¹ÍĞ­¥Ñ%€ôÕÉÉ•¹Ñ-¥Ñ%ñğ…ÕÑ½M…Ù•‘-¥Ñ%ñğÕ¹‘•™¥¹•ì(€€€€€½¹ÍĞÍ…Ù•€ô…İ…¥ĞÍ…Ù•-¥Ğ¡­¥ÑMÑ…Ñ”°­¥ÑEÕ…¹Ñ¥Ñä°­¥Ñ%°­¥Ñ%€üÕÉÉ•¹ÑI•Ù¥Í¥½¸€è¹Õ±°°ì(€€€€€€€ÅÕ½Ñ•±¥•¹Ğ°(€€€€€€€™±½Üèİ¥é…É‘MÑ…Ñ”¹™±½Ü°(€€€€€€€…¥	É¥•™¥¹œ°(€€€€€ô¤ì(€€€€€…­¹½İ±•‘•5…¹Õ…±M…Ù”¡Í…Ù•¹¥°Í…Ù•¹É•Ù¥Í¥½¸¤ì(€€€€€Í•ÑÕÉÉ•¹Ñ-¥Ñ%¡Í…Ù•¹¥¤ì(€€€€€Í•ÑÕÉÉ•¹ÑI•Ù¥Í¥½¸¡Í…Ù•¹É•Ù¥Í¥½¸¤ì(€€€ô…Ñ €¡•ÉÉ½È¤ì(€€€€€€¼¼ÕÍ•ÕÍÑ½µ-¥ÑA•ÉÍ¥ÍÑ•¹”…±É•…‘ä‘¥ÍÁ±…åÌ„Í…¹¥Ñ¥é•µ•ÍÍ…”¸-••ÀÑ¡”(€€€€€€¼¼•ÉÉ½È½‰Í•ÉÙ…‰±”İ¥Ñ¡½ÕĞÁÉ½‘Õ¥¹œ„Í•½¹°Á½Ñ•¹Ñ¥…±±äÕ¹Í…™”Ñ½…ÍĞ¸(€€€€€±½•È¹İ…É¸ m­¥Ğµ‰Õ¥±‘•Ét5…¹Õ…°Í…Ù”™…¥±•èœ°•ÉÉ½È¤ì(€€€ô(€ô°l(€€€…ÕÑ½M…Ù•‘-¥Ñ%°(€€€…­¹½İ±•‘•5…¹Õ…±M…Ù”°(€€€…¹•±A•¹‘¥¹M…Ù”°(€€€ÕÉÉ•¹Ñ-¥Ñ%°(€€€ÕÉÉ•¹ÑI•Ù¥Í¥½¸°(€€€¥ÍÕÑ½M…Ù¥¹œ°(€€€­¥ÑEÕ…¹Ñ¥Ñä°(€€€­¥ÑMÑ…Ñ”°(€€€ÅÕ½Ñ•±¥•¹Ğ°(€€€İ¥é…É‘MÑ…Ñ”¹™±½Ü°(€€€…¥	É¥•™¥¹œ°(€€€Í…Ù•-¥Ğ°(€t¤ì((€½¹ÍĞ…ÁÁ±å%MÕ•ÍÑ¥½¸€ôÕÍ•…±±‰…¬ (€€€€ (€€€€€ÍÕ•ÍÑ¥½¸è-¥Ñ%MÕ•ÍÑ¥½¹	É¥•˜°(€€€€€½µÁ½Í¥Ñ¥½¸è-¥Ñ%½µÁ½Í¥Ñ¥½¸°(€€€€€É•ÅÕ•ÍÑ•‘EÕ…¹Ñ¥Ñäüè¹Õµ‰•È°(€€€€¤€ôøì(€€€€€…ÁÁ±å%½µÁ½Í¥Ñ¥½¸¡½µÁ½Í¥Ñ¥½¸°É•ÅÕ•ÍÑ•‘EÕ…¹Ñ¥Ñä¤ì(€€€€€Í•Ñ%	É¥•™¥¹œ¡ÍÕ•ÍÑ¥½¸¤ì(€€€€€Ñ½…ÍĞ¹ÍÕ•ÍÌ ½µÁ½Í§Ÿ¼‘„%…Á±¥…‘„œ°ì(€€€€€€€‘•ÍÉ¥ÁÑ¥½¸è€½¹™¥É„Ù…É¥…¹Ñ•Ì°•ÍÑ½ÅÕ”°Á•ÉÍ½¹…±¥é‡Ÿ¼”Ù…±½É•Ì…¹Ñ•Ì‘”½¹Ñ¥¹Õ…È¸œ°(€€€€€ô¤ì(€€€ô°(€€€m…ÁÁ±å%½µÁ½Í¥Ñ¥½¹t°(€€¤ì((€½¹ÍĞÍÑ…ÉÑ±½Ü€ôÕÍ•…±±‰…¬ (€€€€¡™±½Üè€‰½àµ™¥ÉÍĞœğ€¥Ñ•µÌµ™¥ÉÍĞœ°½É¥¥¸üè-¥Ñ=É¥¥¸¤€ôøì(€€€€€ÍÑ…ÉÑ9•İ±½Ü¡™±½Ü°½É¥¥¸¤ì(€€€€€Í•ÑEÕ½Ñ•±¥•¹Ğ¡íô¤ì(€€€€€Í•Ñ%	É¥•™¥¹œ¡Õ¹‘•™¥¹•¤ì(€€€€€Í•Ñ%Í1…¹‘¥¹œ¡™…±Í”¤ì(€€€ô°(€€€mÍÑ…ÉÑ9•İ±½İt°(€€¤ì((€€¼¼¸½…Í¥½¸¥Ì¥¹Ñ•¹Ñ¥½¹…±±ä…‘Ù¥Í½Éäè¥Ğ¹…ÉÉ½İÌÑ¡”…Ñ…±½œ…¹Í•±•ÑÌ(€€¼¼„­¥ĞÑåÁ”°‰ÕĞ¥Ğ¹•Ù•È¥¹Í•ÉÑÌÁÉ½‘ÕÑÌ½È‰½á•Ìİ¥Ñ¡½ÕĞ½¹™¥Éµ…Ñ¥½¸¸(€½¹ÍĞÍ•±•Ñ=…Í¥½¸€ôÕÍ•…±±‰…¬ (€€€€¡¹•áÑ=…Í¥½¸è=…Í¥½¸ğ¹Õ±°¤€ôøì(€€€€€Í•Ñ=…Í¥½¸¡¹•áÑ=…Í¥½¸¤ì(€€€€€¥˜€ …¹•áÑ=…Í¥½¸¤É•ÑÕÉ¸ì((€€€€€½¹ÍĞµ•Ñ…‘…Ñ„€ô=M%=9L¹™¥¹ ¡¥Ñ•´¤€ôø¥Ñ•´¹¥€ôôô¹•áÑ=…Í¥½¸¤ì(€€€€€¥˜€ …µ•Ñ…‘…Ñ„¤É•ÑÕÉ¸ì((€€€€€Í•Ñ-¥ÑQåÁ”¡µ•Ñ…‘…Ñ„¹ÍÕ•ÍÑ•‘-¥ÑQåÁ”¤ì(€€€€€Í•Ñ%Ñ•µ¥±Ñ•ÉÌ¡ì€¸¸¹¥Ñ•µ¥±Ñ•ÉÌ°Í•…É èµ•Ñ…‘…Ñ„¹¥Ñ•µ-•åİ½É‘ÍlÁtô¤ì(€€€€€Í•Ñ	½á¥±Ñ•ÉÌ¡ì€¸¸¹‰½á¥±Ñ•ÉÌ°Í•…É èµ•Ñ…‘…Ñ„¹‰½á-•åİ½É‘ÍlÁtô¤ì(€€€ô°(€€€m‰½á¥±Ñ•ÉÌ°¥Ñ•µ¥±Ñ•ÉÌ°Í•Ñ	½á¥±Ñ•ÉÌ°Í•Ñ%Ñ•µ¥±Ñ•ÉÌ°Í•Ñ-¥ÑQåÁ•t°(€€¤ì((€½¹ÍĞÉ•Í•Ñ-¥Ñ¹‘EÕ½Ñ•±¥•¹Ğ€ôÕÍ•…±±‰…¬  ¤€ôøì(€€€É•Í•Ñ-¥Ğ ¤ì(€€€Í•ÑEÕ½Ñ•±¥•¹Ğ¡íô¤ì(€€€Í•Ñ%	É¥•™¥¹œ¡Õ¹‘•™¥¹•¤ì(€€€Í•Ñ=…Í¥½¸¡¹Õ±°¤ì(€ô°mÉ•Í•Ñ-¥Ñt¤ì((€½¹ÍĞÉ•ÍÑ½É•É½µ	…­ÕÀ€ôÕÍ•…±±‰…¬ (€€€€¡™Õ±±MÑ…Ñ”è	…­ÕÁÕ±±MÑ…Ñ”¤€ôøì(€€€€€±½…‘-¥Ğ¡ì(€€€€€€€¹…µ”è™Õ±±MÑ…Ñ”¹¹…µ”°(€€€€€€€­¥ÑQåÁ”è™Õ±±MÑ…Ñ”¹­¥ÑQåÁ”°(€€€€€€€‰½àè™Õ±±MÑ…Ñ”¹‰½à°(€€€€€€€¥Ñ•µÌè™Õ±±MÑ…Ñ”¹¥Ñ•µÌ°(€€€€€€€Á•ÉÍ½¹…±¥é…Ñ¥½¸è™Õ±±MÑ…Ñ”¹Á•ÉÍ½¹…±¥é…Ñ¥½¸°(€€€€€€€­¥ÑEÕ…¹Ñ¥Ñäè™Õ±±MÑ…Ñ”¹ÅÑä°(€€€€€€€¥‘•¹Ñ¥Ñäè™Õ±±MÑ…Ñ”¹¥‘•¹Ñ¥Ñä°(€€€€€€€¹½Ñ•Ìè™Õ±±MÑ…Ñ”¹¹½Ñ•Ì°(€€€€€ô¤ì(€€€ô°(€€€m±½…‘-¥Ñt°(€€¤ì((€É•ÑÕÉ¸ì(€€€ÍÑ…Ñ”èì(€€€€€­¥ÑMÑ…Ñ”°(€€€€€İ¥é…É‘MÑ…Ñ”°(€€€€€­¥ÑEÕ…¹Ñ¥Ñä°(€€€€€ÕÉÉ•¹Ñ-¥Ñ%°(€€€€€…ÕÑ½M…Ù•‘-¥Ñ%°(€€€€€…Ù…¥±…‰±•	½á•Ì°(€€€€€…±±Ù…¥±…‰±•	½á•Ì°(€€€€€…Ù…¥±…‰±•%Ñ•µÌ°(€€€€€…±±Ù…¥±…‰±•%Ñ•µÌ°(€€€€€¥Í1½…‘¥¹	½á•Ì°(€€€€€¥Í1½…‘¥¹%Ñ•µÌ°(€€€€€‰½áÉÉ½È°(€€€€€¥Ñ•µÉÉ½È°(€€€€€É•™•Ñ¡	½á•Ì°(€€€€€É•™•Ñ¡%Ñ•µÌ°(€€€€€¥Í!å‘É…Ñ¥¹œ°(€€€€€¥Í1…¹‘¥¹œ°(€€€€€‰½á¥±Ñ•ÉÌ°(€€€€€¥Ñ•µ¥±Ñ•ÉÌ°(€€€€€Í•Ñ	½á¥±Ñ•ÉÌ°(€€€€€Í•Ñ%Ñ•µ¥±Ñ•ÉÌ°(€€€€€½…Í¥½¸°(€€€€€Í•Ñ=…Í¥½¸°(€€€€€ÅÕ½Ñ•±¥•¹Ğ°(€€€€€Í•ÑEÕ½Ñ•±¥•¹Ğ°(€€€€€…¥	É¥•™¥¹œ°(€€€ô°(€€€…Ñ¥½¹Ìèì(€€€€€Í•Ñ-¥Ñ9…µ”°(€€€€€Í•±•Ñ	½à°(€€€€€±•…É	½à°(€€€€€…‘‘%Ñ•´°(€€€€€É•µ½Ù•%Ñ•´°(€€€€€±•…É%Ñ•µÌ°(€€€€€ÕÁ‘…Ñ•%Ñ•µEÕ…¹Ñ¥Ñä°(€€€€€ÕÁ‘…Ñ•%Ñ•µY…É¥…¹Ğ°(€€€€€É•½É‘•É%Ñ•µÌ°(€€€€€Í•Ñ%Ñ•µA•ÉÍ½¹…±¥é…Ñ¥½¸°(€€€€€Í•Ñ	½áA•ÉÍ½¹…±¥é…Ñ¥½¸°(€€€€€Í•Ñ-¥ÑEÕ…¹Ñ¥Ñä°(€€€€€Í•Ñ%‘•¹Ñ¥Ñä°(€€€€€Í•Ñ9½Ñ•Ì°(€€€€€½Q½MÑ•À°(€€€€€¹•áÑMÑ•À°(€€€€€ÁÉ•ÙMÑ•À°(€€€€€É•Í•Ñ-¥ĞèÉ•Í•Ñ-¥Ñ¹‘EÕ½Ñ•±¥•¹Ğ°(€€€€€Í•±•Ñ=…Í¥½¸°(€€€€€Õ¹‘¼°(€€€€€É•‘¼°(€€€€€…¹U¹‘¼°(€€€€€…¹I•‘¼°(€€€€€¡…¹‘±•M…Ù•-¥Ğ°(€€€€€É•ÑÉåÕÑ½M…Ù”èÉ•ÑÉå1…ÍÑM…Ù”°(€€€€€¡…¹‘±•‘‘Q½EÕ½Ñ”°(€€€€€…ÁÁ±å%MÕ•ÍÑ¥½¸°(€€€€€ÍÑ…ÉÑ±½Ü°(€€€€€Í•Ñ-¥Ñ=É¥¥¸°(€€€€€½¹ÍÕµ•U¹±½…‘	…­ÕÀ°(€€€€€É•ÍÑ½É•É½µ	…­ÕÀ°(€€€ô°(€€€µ•Ñ„èì(€€€€€¥ÍM…Ù¥¹œ°(€€€€€¥ÍÕÑ½M…Ù¥¹œ°(€€€€€¥ÍÉ•…Ñ¥¹EÕ½Ñ”°(€€€€€±…ÍÑM…Ù•‘Ğ°(€€€€€…ÕÑ½M…Ù•ÉÉ½È°(€€€€€¥Í½¹™±¥ÑÉÉ½È°(€€€€€ÁÉ¥¥¹œ°(€€€ô°(€ôì)ô(