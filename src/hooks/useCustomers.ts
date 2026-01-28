'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { Customer, Sale } from '@/types';

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isServerReady, setIsServerReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [listenerKey, setListenerKey] = useState(0);

  // Retry function
  const retry = useCallback(() => {
    setIsServerReady(false);
    setErrorMsg(null);
    setLoading(true);
    setCustomers([]); // Clear stale data
    setListenerKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) {
      setErrorMsg('Firestore not initialized. Check Firebase env vars.');
      setLoading(false);
      return;
    }

    let serverReadyLocal = false;
    setLoading(true);
    setErrorMsg(null);
    setCustomers([]); // Clear stale data to prevent ghost rows

    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      console.log('[useCustomers] Subscribing to customers collection');
    }

    // 8-second timeout
    const timeoutId = setTimeout(() => {
      if (!serverReadyLocal) {
        setLoading(false);
        setErrorMsg("Can't reach Firestore. Check Vercel env vars or Firestore rules.");
        if (isDev) {
          console.error('[useCustomers] Timeout: No server response after 8 seconds');
        }
      }
    }, 8000);

    // Query with orderBy for consistent ordering
    const customersQuery = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));

    // Real-time listener on customers collection
    const unsubscribe = onSnapshot(
      customersQuery,
      (snapshot) => {
        const fromCache = snapshot.metadata.fromCache;

        if (isDev) {
          console.log('[useCustomers] Snapshot received:', {
            fromCache,
            docCount: snapshot.docs.length,
          });
        }

        // Skip cache data on initial load to prevent ghost rows
        if (fromCache && !serverReadyLocal) {
          return;
        }

        const customersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Customer));
        setCustomers(customersData);

        if (!fromCache) {
          serverReadyLocal = true;
          setIsServerReady(true);
          clearTimeout(timeoutId);
          setErrorMsg(null);
        }

        setLoading(false);
      },
      (error: any) => {
        const errorCode = error?.code || 'unknown';
        const errorMessage = error?.message || 'Failed to load customers';

        if (isDev) {
          console.error('[useCustomers] Firestore error:', {
            code: errorCode,
            message: errorMessage,
            fullError: error,
          });
        }

        clearTimeout(timeoutId);

        // User-friendly error messages
        let userMessage = errorMessage;
        if (errorCode === 'permission-denied') {
          userMessage = 'Permission denied. Check Firestore security rules.';
        } else if (errorCode === 'unavailable') {
          userMessage = "Can't reach Firestore. Check your internet connection.";
        }

        setErrorMsg(userMessage);
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [listenerKey]);

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalSpent' | 'orderCount'>) => {
    const db = getFirebaseDb();
    if (!db) throw new Error('Firestore not initialized');

    const docRef = await addDoc(collection(db, 'customers'), {
      ...customerData,
      totalSpent: 0,
      orderCount: 0,
      customFields: customerData.customFields || {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  };

  const updateCustomer = async (id: string, updates: Partial<Omit<Customer, 'id' | 'createdAt'>>) => {
    const db = getFirebaseDb();
    if (!db) throw new Error('Firestore not initialized');

    await updateDoc(doc(db, 'customers', id), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  };

  const deleteCustomer = async (id: string) => {
    const db = getFirebaseDb();
    if (!db) throw new Error('Firestore not initialized');

    await deleteDoc(doc(db, 'customers', id));
  };

  const addCustomField = async (id: string, fieldName: string, fieldValue: string) => {
    const customer = customers.find(c => c.id === id);
    if (!customer) throw new Error('Customer not found');

    const db = getFirebaseDb();
    if (!db) throw new Error('Firestore not initialized');

    const updatedCustomFields = {
      ...(customer.customFields || {}),
      [fieldName]: fieldValue,
    };

    await updateDoc(doc(db, 'customers', id), {
      customFields: updatedCustomFields,
      updatedAt: serverTimestamp(),
    });
  };

  const removeCustomField = async (id: string, fieldName: string) => {
    const customer = customers.find(c => c.id === id);
    if (!customer) throw new Error('Customer not found');

    const db = getFirebaseDb();
    if (!db) throw new Error('Firestore not initialized');

    const updatedCustomFields = { ...(customer.customFields || {}) };
    delete updatedCustomFields[fieldName];

    await updateDoc(doc(db, 'customers', id), {
      customFields: updatedCustomFields,
      updatedAt: serverTimestamp(),
    });
  };

  const getCustomerByName = async (name: string): Promise<Customer | null> => {
    const db = getFirebaseDb();
    if (!db) return null;

    const q = query(collection(db, 'customers'), where('name', '==', name));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Customer;
  };

  const findOrCreateCustomer = async (name: string): Promise<string> => {
    const existing = await getCustomerByName(name);
    if (existing) return existing.id;

    return await addCustomer({
      name,
      email: '',
      phone: '',
      address: '',
      status: 'active',
      customFields: {},
    });
  };

  return {
    customers,
    loading,
    isServerReady,
    errorMsg,
    retry,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addCustomField,
    removeCustomField,
    getCustomerByName,
    findOrCreateCustomer,
  };
}

// Hook to merge customer data from sales with customer records
export function useMergedCustomers(sales: Sale[], customerRecords: Customer[]) {
  return useMemo(() => {
    const customerMap = new Map<string, Customer>();

    // First, add all customers from the database
    customerRecords.forEach(customer => {
      customerMap.set(customer.name, { ...customer });
    });

    // Then, merge sales data
    sales.forEach(sale => {
      if (sale.customer) {
        const existing = customerMap.get(sale.customer);

        if (existing) {
          // Update existing customer with sales data
          existing.totalSpent = (existing.totalSpent || 0) + sale.amount;
          existing.orderCount = (existing.orderCount || 0) + 1;

          const saleDate = sale.date.toDate();
          const currentLastPurchase = existing.lastPurchase?.toDate?.();
          if (!currentLastPurchase || saleDate > currentLastPurchase) {
            existing.lastPurchase = sale.date;
          }
        } else {
          // Create a virtual customer from sales data
          customerMap.set(sale.customer, {
            id: `virtual-${sale.customer}`,
            name: sale.customer,
            email: '',
            phone: '',
            address: '',
            status: 'active',
            customFields: {},
            totalSpent: sale.amount,
            orderCount: 1,
            lastPurchase: sale.date,
            createdAt: sale.createdAt,
            updatedAt: sale.createdAt,
          });
        }
      }
    });

    // Recalculate totals for real customers
    const realCustomers = Array.from(customerMap.values()).filter(c => !c.id.startsWith('virtual-'));
    realCustomers.forEach(customer => {
      const customerSales = sales.filter(s => s.customer === customer.name);
      customer.totalSpent = customerSales.reduce((sum, s) => sum + s.amount, 0);
      customer.orderCount = customerSales.length;

      if (customerSales.length > 0) {
        const latestSale = customerSales.reduce((latest, sale) =>
          sale.date.toMillis() > latest.date.toMillis() ? sale : latest
        );
        customer.lastPurchase = latestSale.date;

        // Determine status based on last purchase (inactive if no purchase in last 90 days)
        const daysSinceLastPurchase = Math.floor(
          (new Date().getTime() - latestSale.date.toDate().getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceLastPurchase > 90 && customer.status === 'active') {
          customer.status = 'inactive';
        }
      }
    });

    return Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [sales, customerRecords]);
}
