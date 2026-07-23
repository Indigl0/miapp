import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';

export function useLiveQuery<T>(
  querier: () => Promise<T> | T,
  deps: unknown[] = [],
  fallback: T,
): T {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    let active = true;
    const sub = liveQuery(querier);
    const unsub = sub.subscribe({
      next: (result: T) => { if (active) setValue(result); },
      error: () => {},
    });
    return () => { active = false; unsub.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}
