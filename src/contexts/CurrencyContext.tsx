'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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

  useEffect(() => {
    const saved = localStorage.getItem('currency') as Currency;
    if (saved && currencyConfig[saved]) {
      setCurrencyState(saved);
    }
  }, []);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('currency', newCurrency);
    window.dispatchEvent(new Event('currencyChange')); // Trigger re-render
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