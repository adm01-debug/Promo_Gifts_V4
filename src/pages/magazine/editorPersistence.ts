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
  private readonly write: (
    id: string,
    patch: EditorPatch,
    expectedEditVersion: number,
  ) => Promise<Magazine | null>;
  private readonly changed: () => void;
  private readonly readLatest?: (id: string) => Promise<Magazine | null>;
  private nonReplayableFailure = false;

  constructor(
    initial: Magazine,
    write: (
      id: string,
      patch: EditorPatch,
      expectedEditVersion: number,
    ) => Promise<Magazine | null>,
    changed: () => void,
    readLatest?: (id: string) => Promise<Magazine | null>,
  ) {
    this.magazine = initial;
    this.write = write;
    this.changed = changed;
    this.readLatest = readLatest;
  }

  get dirty() {
    return Object.keys(this.pending).length > 0 || this.failedMutation !== null || this.queued > 0;
  }
  get saving() {
    return this.queued > 0 || this.timer !== null;
  }
  get pendingPatch(): EditorPatch {
    return { ...this.pending };
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

  private async latestAfter(expectedEditVersion: number): Promise<Magazine | null> {
    if (!this.readLatest) return null;
    try {
      const latest = await this.readLatest(this.magazine.id);
      return latest?.id === this.magazine.id && latest.editVersion > expectedEditVersion
        ? latest
        : null;
    } catch {
      // The original error is more useful than a second failed read.
      return null;
    }
  }

  private patchWasApplied(latest: Magazine, patch: EditorPatch): boolean {
    return Object.entries(patch).every(([key, value]) => {
      const remote = latest[key as keyof EditorPatch];
      return JSON.stringify(remote) === JSON.stringify(value);
    });
  }

  private async drain() {
    while (Object.keys(this.pending).length > 0) {
      const patch = this.pending;
      this.pending = {};
      try {
        const expectedEditVersion = this.magazine.editVersion;
        this.reconcile(await this.write(this.magazine.id, patch, expectedEditVersion));
      } catch (error) {
        const latest = await this.latestAfter(this.magazine.editVersion);
        if (latest && this.patchWasApplied(latest, patch)) {
          // The write committed but its response was lost. Reconciliation is
          // safer than retrying a CAS mutation against a newer revision.
          this.reconcile(latest);
          continue;
        }
        this.pending = { ...patch, ...this.pending };
        throw error;
      }
    }
  }

  private enqueue<T>(
    action: () => Promise<T>,
    replayProvider?: () => (() => Promise<Magazine>) | null,
  ): Promise<T> {
    this.queued += 1;
    this.changed();
    const task = this.tail
      .then(action)
      .catch((error: unknown) => {
        const replay = this.nonReplayableFailure ? null : (replayProvider?.() ?? null);
        this.nonReplayableFailure = false;
        // Preserve the oldest failed side effect. A later operation that was
        // already queued must never replace (and thereby lose) its replay.
        if (replay && !this.failedMutation) this.failedMutation = replay;
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
    let replayInFlight: (() => Promise<Magazine>) | null = null;
    return this.enqueue(
      async () => {
        // Capture only when this queued task actually starts. A previous queued
        // mutation may fail after flush() was called but before it reaches here.
        replayInFlight = this.failedMutation;
        this.failedMutation = null;
        if (replayInFlight) await replayInFlight();
        await this.drain();
        this.error = null;
        this.changed();
      },
      () => replayInFlight,
    );
  }

  mutate(
    action: (id: string, expectedEditVersion: number) => Promise<Magazine | null>,
  ): Promise<Magazine> {
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
      if (this.failedMutation && this.failedMutation !== operation) {
        throw new Error(
          'Existe uma operação não salva. Tente salvar novamente antes de continuar.',
        );
      }
      await this.drain();
      // If a metadata edit created while the mutation was in flight fails in
      // the final drain, retry only that drain. A confirmed item operation
      // must not be replayed and accidentally duplicate its side effect.
      if (!mutationConfirmed) {
        const expectedEditVersion = this.magazine.editVersion;
        try {
          this.reconcile(await action(this.magazine.id, expectedEditVersion));
          mutationConfirmed = true;
        } catch (error) {
          const latest = await this.latestAfter(expectedEditVersion);
          if (latest) {
            this.magazine = latest;
            this.nonReplayableFailure = true;
            this.changed();
            throw new Error(
              'A conexão foi interrompida após a operação. A versão mais recente foi carregada; revise antes de tentar novamente.',
            );
          }
          throw error;
        }
      }
      await this.drain();
      return this.magazine;
    };
    return this.enqueue(operation, () => operation);
  }
}
