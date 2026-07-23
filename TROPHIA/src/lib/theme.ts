import { useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'ironlog-theme';
const listeners = new Set<() => void>();

let currentTheme: Theme = (() => {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
})();

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  root.style.colorScheme = theme;
}
apply(currentTheme);

function emit() { listeners.forEach((l) => l()); }

export function getTheme(): Theme { return currentTheme; }
export function setTheme(theme: Theme) {
  currentTheme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
  apply(theme);
  emit();
}
export function toggleTheme() { setTheme(currentTheme === 'dark' ? 'light' : 'dark'); }

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'dark' as Theme);
  return [theme, toggleTheme];
}
