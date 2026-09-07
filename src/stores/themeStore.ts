import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const applyThemeToDOM = (theme: ThemeMode) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme: ThemeMode) => {
        set({ theme });
        applyThemeToDOM(theme);
      },
      toggleTheme: () => {
        const current = get().theme;
        const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
        set({ theme: next });
        applyThemeToDOM(next);
      },
    }),
    {
      name: 'schools_up_theme_mode',
      onRehydrateStorage: () => (state) => {
        applyThemeToDOM(state?.theme || 'light');
      },
    }
  )
);

if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (useThemeStore.getState().theme === 'system') {
      applyThemeToDOM('system');
    }
  });
  applyThemeToDOM(useThemeStore.getState().theme || 'light');
}

