import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

function getInitialTheme() {
  try {
    const saved = localStorage.getItem('cms_theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Storage unavailable (private mode); fall back to the default theme
  }
  return 'light'; // Light suits the brand logo; users can switch to dark
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    try {
      localStorage.setItem('cms_theme', theme);
    } catch {
      // Ignore storage failures; theme still applies for this session
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
