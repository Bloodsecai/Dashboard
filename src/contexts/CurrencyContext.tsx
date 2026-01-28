'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { useAuth } from '@/components/auth/AuthProvider';

type Currency = 'PHP' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'SGD' | 'MYR';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatAmount: (amount: number) => string;
}

const currencyConfig = {
  PHP: { locale: 'en-PH', currency: 'PHP', symbol: '₱' },
  USD: { locale: 'en-US', currency: 'USD', symbol: '$' },
  EUR: { locale: 'de-DE', currency: 'EUR', symbol: '€' },
  GBP: { locale: 'en-GB', currency: 'GBP', symbol: '£' },
  JPY: { locale: 'ja-JP', currency: 'JPY', symbol: '¥' },
  SGD: { locale: 'en-SG', currency: 'SGD', symbol: 'S$' },
  MYR: { locale: 'ms-MY', currency: 'MYR', symbol: 'RM' },
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('PHP');
  const { user, loading } = useAuth();
  const hasFetchedRef = useRef(false);

  // Fetch user's currency preference from Firestore after auth is ready
  useEffect(() => {
    if (loading) return;

    const fetchCurrencyPreference = async () => {
      if (user?.uid) {
        try {
          const db = getFirebaseDb();
          if (!db) {
            console.warn('[Currency] Firestore not initialized');
            setCurrencyState('PHP');
            hasFetchedRef.current = true;
            return;
          }

          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const data = userDoc.data();
            const savedCurrency = data?.preferences?.currency as Currency;
            if (savedCurrency && currencyConfig[savedCurrency]) {
              setCurrencyState(savedCurrency);
              hasFetchedRef.current = true;
              return;
            }
          }
          // Fallback to PHP if no saved preference
          setCurrencyState('PHP');
        } catch (error) {
          console.error('Error fetching currency preference:', error);
          // Fallback to PHP on error
          setCurrencyState('PHP');
        }
      } else {
        // No user logged in, reset to default
        setCurrencyState('PHP');
      }
      hasFetchedRef.current = true;
    };

    fetchCurrencyPreference();
  }, [user, loading]);

  const setCurrency = async (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    window.dispatchEvent(new Event('currencyChange')); // Trigger re-render

    // Save to Firestore if user is authenticated
    if (user?.uid) {
      try {
        const db = getFirebaseDb();
        if (db) {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            preferences: {
              currency: newCurrency
            }
          }, { merge: true });
        }
      } catch (error) {
        console.error('Error saving currency preference:', error);
      }
    }
  };

  const formatAmount = (amount: number): string => {
    const config = currencyConfig[currency];
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
    }).format(amount);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatAmount }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within CurrencyProvider');
  return context;
};