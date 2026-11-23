import { useSyncExternalStore } from 'react';

export const DARK_SCHEME = '(prefers-color-scheme: dark)';
export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
export const FINE_POINTER = '(hover: hover) and (pointer: fine)';

const list = (query: string) => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query) : null);

export const matches = (query: string) => list(query)?.matches ?? false;

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    notify => {
      const media = list(query);
      media?.addEventListener('change', notify);
      return () => media?.removeEventListener('change', notify);
    },
    () => matches(query),
    () => false,
  );
}
