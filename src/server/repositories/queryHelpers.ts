/**
 * Resolve a single record by a targeted DB lookup when the repository exposes
 * one (avoids loading an entire table on hot clinical paths), falling back to a
 * full scan + predicate for repositories or test mocks that only implement
 * getAll(). `byId` should be null when no targeted method is available.
 */
export async function resolveOne<T>(
  byId: (() => Promise<T | null | undefined>) | null,
  list: () => Promise<T[]>,
  predicate: (x: T) => boolean,
): Promise<T | undefined> {
  if (byId) {
    const hit = await byId();
    if (hit) return hit;
  }
  return (await list()).find(predicate);
}

/**
 * Build a `byId` thunk only if `method` exists on `store`, else null. Kept loose
 * (`unknown`-keyed) because the data layer is a dynamic DAO without a uniform
 * finder interface across stores.
 */
export function byIdIfAvailable<T = unknown>(
  store: Record<string, unknown> | undefined | null,
  method: string,
  arg: string,
): (() => Promise<T | null | undefined>) | null {
  const fn = store?.[method];
  return typeof fn === 'function'
    ? () => (fn as (a: string) => Promise<T | null | undefined>)(arg)
    : null;
}
