import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Activity, ActivityType } from '@/types';

export function useActivities(maxItems?: number) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'));

    if (maxItems) {
      q = query(q, limit(maxItems));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Activity));
      setActivities(activitiesData);
      setLoading(false);
    });

    return unsubscribe;
  }, [maxItems]);

  const addActivity = async (activityData: {
    type: ActivityType;
    description?: string;
    salesId?: string;
    customerId?: string;
  }) => {
    await addDoc(collection(db, 'activities'), {
      ...activityData,
      createdAt: serverTimestamp(),
    });
  };

  const deleteActivity = async (id: string) => {
    await deleteDoc(doc(db, 'activities', id));
  };

  // Group activities by type
  const activitiesByType = activities.reduce((acc, activity) => {
    const type = activity.type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    activities,
    loading,
    addActivity,
    deleteActivity,
    activitiesByType,
    totalCount: activities.length,
  };
}
