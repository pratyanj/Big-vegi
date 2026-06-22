import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Safe check to see if running in native app
function isNativeApp(): boolean {
  return typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform?.();
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light'; // default to light
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem('theme', theme);

    // Handle Capacitor Status Bar for the active Theme
    if (isNativeApp()) {
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        if (theme === 'dark') {
          // Dark theme: Charcoal dark status bar background + White icons
          StatusBar.setStyle({ style: Style.Dark }).catch(console.error);
          StatusBar.setBackgroundColor({ color: '#1c1917' }).catch(console.error); // stone-900
        } else {
          // Light theme: Emerald status bar background + White icons
          StatusBar.setStyle({ style: Style.Dark }).catch(console.error);
          StatusBar.setBackgroundColor({ color: '#16a34a' }).catch(console.error); // emerald-600
        }
      }).catch(console.error);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
