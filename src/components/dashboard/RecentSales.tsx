'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ArrowRight, Package } from 'lucide-react';
import { NormalizedSale } from '@/lib/salesDataService';
import { AllSalesModal } from './AllSalesModal';

interface RecentSalesProps {
  sales: NormalizedSale[];
  allSales: NormalizedSale[]; // Full dataset for modal
}

export function RecentSales({ sales, allSales }: RecentSalesProps) {
  const { formatAmount } = useCurrency();

  // Modal state - internal to this component
  const [open, setOpen] = useState(false);

  // Get date from normalized sale (already a Date object)
  const getDate = (sale: NormalizedSale): Date => {
    return sale.date instanceof Date ? sale.date : new Date(sale.date);
  };

  const recentSales = [...sales]
    .sort((a, b) => getDate(b).getTime() - getDate(a).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-3">
      {recentSales.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6 text-text-muted" />
          </div>
          <p className="text-text-secondary">No sales yet</p>
          <p className="text-sm text-text-muted mt-1">Sales will appear here once recorded</p>
        </div>
      ) : (
        <>
          {recentSales.map((sale, index) => (
            <div
              key={sale.id}
              className="flex items-center justify-between p-4 glass-card rounded-xl hover:bg-white/[0.04] transition-all group stagger-item"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-center gap-4">
                {/* Product Icon */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-purple/20 to-primary-pink/10 flex items-center justify-center group-hover:from-primary-purple/30 group-hover:to-primary-pink/20 transition-colors">
                  <Package className="w-5 h-5 text-primary-purple" />
                </div>

                {/* Product Info */}
                <div>
                  <p className="font-medium text-white group-hover:text-white transition-colors">
                    {(sale.product || 'Unknown Product').length > 30
                      ? (sale.product || 'Unknown Product').substring(0, 30) + '...'
                      : (sale.product || 'Unknown Product')}
                  </p>
                  <p className="text-sm text-text-muted">
                    {sale.customer || 'Anonymous'} • {format(getDate(sale), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Amount */}
                <span className="font-semibold text-white">
                  {formatAmount(sale.amount || 0)}
                </span>

                {/* Status Badge */}
                <Badge variant={sale.status || 'pending'}>
                  {sale.status || 'pending'}
                </Badge>
              </div>
            </div>
          ))}

          {/* View All Button - Opens Modal */}
          <button
            onClick={() => setOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 text-primary-purple hover:text-primary-pink transition-colors group"
          >
            <span className="text-sm font-medium">View All Sales</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </>
      )}

      {/* Sales History Modal */}
      <AllSalesModal
        isOpen={open}
        onClose={() => setOpen(false)}
        sales={allSales}
        title={`All Sales History (${allSales.length} records)`}
      />
    </div>
  );
}
