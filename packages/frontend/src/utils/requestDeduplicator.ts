type PendingRequestMap = Map<string, Promise<unknown>>;

export class RequestDeduplicator {
  private pending: PendingRequestMap = new Map();

  async run<T>(key: string, factory: () => Promise<T>): Promise<T> {
    if (this.pending.has(key)) {
      return this.pending.get(key)! as Promise<T>;
    }

    const promise = factory()
      .catch((error) => {
        throw error;
      })
      .finally(() => {
        this.pending.delete(key);
      });

    this.pending.set(key, promise);
    return promise;
  }

  clear(key?: string) {
    if (typeof key === 'string') {
      this.pending.delete(key);
      return;
    }
    this.pending.clear();
  }
}

export const globalRequestDeduplicator = new RequestDeduplicator();

