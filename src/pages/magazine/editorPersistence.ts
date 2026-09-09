import type { Magazine } from '@/types/magazine';

export type EditorPatch = Partial<
  Pick<Magazine, 'branding' | 'content' | 'pageOrder' | 'subtitle' | 'templateId' | 'title'>
>;

/** One editor session, one write queue. This is NOT a cross-user database lock. */
export class EditorPersistence {
  magazine: Magazine;
  error: string | null = null;
  private pending: EditorPatch = {};
  private failedMutation: (() => Promise<Magazine>) | null = null;
  private queued = 0;
  private tail: Promise<unknown> = Promise.resolve();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly write: (id: string, patch: EditorPatch) => Promise<Magazine | null>;
  private readonly changed: () => void;

  constructor(
    initial: Magazine,
    write: (id: string, patch: EditorPatch) => Promise<Magazine | null>,
    changed: () => void,
  ) {
    this.magazine = initial;
    this.write = write;
    this.changed = changed;
  }

  get dirty() {
    return Object.keys(this.pending).length > 0 || this.failedMutation !== null || this.queued > 0;
  }
  get saving() {
    return this.queued > 0 || this.timer !== null;
  }

  edit(patch: EditorPatch) {
    // CRITICAL FIX: update the snapshot synchronously BEFORE React setState.
    // Two mutations in the same tick must see each other's values.
    this.magazine = { ...this.magazine, ...patch };
    this.pending = { ...this.pending, ...patch };
    this.cancelTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      // Error remains visible and patch stays available for explicit retry.
      void this.flush().catch(() => undefined);
    }, 400);
    this.changed();
  }

  cancelTimer() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private reconcile(updated: Magazine | null) {
    if (updated?.id !== this.magazine.id) {
      throw new Error('O servidor não confirmou a gravação da revista. Tente novamente.');
    }
    this.magazine = { ...updated, ...this.pending };
    this.error = null;
    this.changed();
  }

  private async drain() {
    while (Object.keys(this.pending).length > 0) {
      const patch = this.pending;
      this.pending = {};
      try {
        this.reconcile(await this.write(this.magazine.id, patch));
      } catch (error) {
        this.pending = { ...patch, ...this.pending };
        throw error;
      }
    }
  }

  private enqueue<T>(action: () => Promise<T>, replay?: () => Promise<Magazine>): Promise<T> {
    this.queued += 1;
    this.changed();
    const task = this.tail
      .then(action)
      .catch((error: unknown) => {
        if (replay) this.failedMutation = replay;
        this.error = error instanceof Error ? error.message : 'Não foi possível salvar a revista.';
        throw error;
      })
      .finally(() => {
        this.queued -= 1;
        this.changed();
      });
    this.tail = task.catch(() => undefined);
    return task;
  }

  flush(): Promise<void> {
    this.cancelTimer();
    const replay = this.failedMutation;
    this.failedMutation = null;
    return this.enqueue(async () => {
      if (replay) await replay();
      await this.drain();
      this.error = null;
      this.changed();
    }, replay ?? undefined);
  }

  mutate(action: (id: string) => Promise<Magazine | null>): Promise<Magazine> {
    this.cancelTimer();
    if (this.failedMutation) {
      const error = new Error(
        'Existe uma operação não salva. Tente salvar novamente antes de continuar.',
      );
      this.error = error.message;
      this.changed();
      return Promise.reject(error);
    }
    let mutationConfirmed = false;
    const operation = async () => {
      await this.drain();
      // If a metadata edit created while the mutation was in flight fails in
      // the final drain, retry only that drain. A confirmed item operation
      // must not be replayed and accidentally duplicate its side effect.
      if (!mutationConfirmed) {
        this.reconcile(await action(this.magazine.id));
        mutationConfirmed = true;
      }
      await this.drain();
      return this.magazine;
    };
    return this.enqueue(operation, operation);
  }
}
