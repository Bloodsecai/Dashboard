import { useMemo } from 'react';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Sale } from '@/types';

export function useKPIs(sales: Sale[]) {
  return useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.amount, 0);
    const salesCount = sales.length;

    const todayRevenue = sales
      .filter(sale => isWithinInterval(sale.date.toDate(), { start: todayStart, end: todayEnd }))
      .reduce((sum, sale) => sum + sale.amount, 0);

    const monthRevenue = sales
      .filter(sale => isWithinInterval(sale.date.toDate(), { start: monthStart, end: monthEnd }))
      .reduce((sum, sale) => sum + sale.amount, 0);

    return {
      totalRevenue,
      salesCount,
      todayRevenue,
      monthRevenue,
    };
  }, [sales]);
}