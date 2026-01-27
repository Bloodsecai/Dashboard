import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Sale } from '@/types';

export function useSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'sales'), (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Sale));
      setSales(salesData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const addSale = async (saleData: Omit<Sale, 'id' | 'createdAt'>) => {
    await addDoc(collection(db, 'sales'), {
      ...saleData,
      createdAt: serverTimestamp(),
    });
  };

  const updateSale = async (id: string, updates: Partial<Sale>) => {
    await updateDoc(doc(db, 'sales', id), updates);
  };

  const deleteSale = async (id: string) => {
    await deleteDoc(doc(db, 'sales', id));
  };

  return { sales, loading, addSale, updateSale, deleteSale };
}