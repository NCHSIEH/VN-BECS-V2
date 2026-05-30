/**
 * Resolve a single record by a targeted DB lookup when the repository exposes
 * one (avoids loading an entire table on hot clinical paths), falling back to a
 * full scan + predicate for repositories or test mocks that only implement
 * getAll(). `byId` should be null when no targeted method is available.
 */
export async function resolveOne(
  byId: (() => Promise<any>) | null,
  list: () => Promise<any[]>,
  predicate: (x: any) => boolean,
): Promise<any | undefined> {
  if (byId) {
    const hit = await byId();
    if (hit) return hit;
  }
  return (await list()).find(predicate);
}

/** Build a `byId` thunk only if `method` exists on `store`, else null. */
export function byIdIfAvailable(store: any, method: string, arg: string): (() => Promise<any>) | null {
  return typeof store?.[method] === 'function' ? () => store[method](arg) : null;
}
