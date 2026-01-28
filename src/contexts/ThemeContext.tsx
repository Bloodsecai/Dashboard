'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getFirebaseDb, getFirebaseAuth } from '@/lib/firebase';

type Theme = 'light' | 'dark';
export type ColorPalette = 'purple' | 'blue' | 'emerald' | 'rose' | 'orange' | 'indigo';

const PALETTE_STORAGE_KEY = 'selectedPalette';

// Color palette definitions with primary and secondary colors
export const COLOR_PALETTES: Record<ColorPalette, {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  primaryRgb: string;
  secondaryRgb: string;
}> = {
  purple: {
    name: 'Purple',
    primary: '#7c3aed',
    secondary: '#ec4899',
    accent: '#a855f7',
    primaryRgb: '124, 58, 237',
    secondaryRgb: '236, 72, 153',
  },
  blue: {
    name: 'Blue',
    primary: '#3b82f6',
    secondary: '#06b6d4',
    accent: '#0ea5e9',
    primaryRgb: '59, 130, 246',
    secondaryRgb: '6, 182, 212',
  },
  emerald: {
    name: 'Emerald',
    primary: '#10b981',
    secondary: '#14b8a6',
    accent: '#34d399',
    primaryRgb: '16, 185, 129',
    secondaryRgb: '20, 184, 166',
  },
  rose: {
    name: 'Rose',
    primary: '#f43f5e',
    secondary: '#ec4899',
    accent: '#fb7185',
    primaryRgb: '244, 63, 94',
    secondaryRgb: '236, 72, 153',
  },
  orange: {
    name: 'Orange',
    primary: '#f97316',
    secondary: '#eab308',
    accent: '#fb923c',
    primaryRgb: '249, 115, 22',
    secondaryRgb: '234, 179, 8',
  },
  indigo: {
    name: 'Indigo',
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#818cf8',
    primaryRgb: '99, 102, 241',
    secondaryRgb: '139, 92, 246',
  },
};

interface ThemeContextType {
  theme: Theme;
  palette: ColorPalette;
  toggleTheme: () => void;
  setPalette: (palette: ColorPalette) => Promise<void>;
  isLoadingPalette: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [palette, setPaletteState] = useState<ColorPalette>('purple');
  const [isLoadingPalette, setIsLoadingPalette] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Apply palette CSS variables to document
  const applyPalette = useCallback((paletteKey: ColorPalette) => {
    const colors = COLOR_PALETTES[paletteKey];
    document.documentElement.style.setProperty('--color-primary', colors.primary);
    document.documentElement.style.setProperty('--color-secondary', colors.secondary);
    document.documentElement.style.setProperty('--color-accent', colors.accent);
    document.documentElement.style.setProperty('--color-primary-rgb', colors.primaryRgb);
    document.documentElement.style.setProperty('--color-secondary-rgb', colors.secondaryRgb);
  }, []);

  // Load theme and palette from localStorage on mount (for guests and initial load)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    }

    // Load palette from localStorage (for guests or before auth loads)
    const savedPalette = localStorage.getItem(PALETTE_STORAGE_KEY) as ColorPalette;
    if (savedPalette && COLOR_PALETTES[savedPalette]) {
      setPaletteState(savedPalette);
      applyPalette(savedPalette);
    } else {
      // Apply default palette immediately
      applyPalette('purple');
    }
  }, [applyPalette]);

  // Listen for auth state changes
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setCurrentUser(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Load palette from Firestore when user is available (overrides localStorage)
  useEffect(() => {
    const loadPalette = async () => {
      if (!currentUser?.uid) {
        setIsLoadingPalette(false);
        return;
      }

      try {
        const db = getFirebaseDb();
        if (!db) {
          console.warn('[Theme] Firestore not initialized');
          setIsLoadingPalette(false);
          return;
        }

        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          const savedPalette = data?.preferences?.theme?.palette as ColorPalette;
          if (savedPalette && COLOR_PALETTES[savedPalette]) {
            setPaletteState(savedPalette);
            applyPalette(savedPalette);
            // Sync to localStorage
            try {
              localStorage.setItem(PALETTE_STORAGE_KEY, savedPalette);
            } catch (e) {
              // Ignore localStorage errors
            }
          }
        }
      } catch (error) {
        console.error('Error loading palette preference:', error);
      } finally {
        setIsLoadingPalette(false);
      }
    };

    loadPalette();
  }, [currentUser, applyPalette]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

  const setPalette = async (newPalette: ColorPalette) => {
    if (!COLOR_PALETTES[newPalette]) return;

    // Apply immediately for instant feedback
    setPaletteState(newPalette);
    applyPalette(newPalette);

    // Always save to localStorage for persistence (works for guests too)
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, newPalette);
    } catch (error) {
      console.error('Error saving palette to localStorage:', error);
    }

    // Save to Firestore if user is logged in
    if (currentUser?.uid) {
      try {
        const db = getFirebaseDb();
        if (db) {
          const userDocRef = doc(db, 'users', currentUser.uid);
          await setDoc(userDocRef, {
            preferences: {
              theme: {
                palette: newPalette
              }
            }
          }, { merge: true });
        }
      } catch (error) {
        console.error('Error saving palette preference:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, palette, toggleTheme, setPalette, isLoadingPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
