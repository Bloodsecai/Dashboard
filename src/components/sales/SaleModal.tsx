'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Sale } from '@/types';

const saleSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  product: z.string().min(1, 'Product is required'),
  customer: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  status: z.enum(['paid', 'pending', 'refunded']),
  notes: z.string().optional(),
});

type SaleForm = z.infer<typeof saleSchema>;

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Sale, 'id' | 'createdAt'>) => void;
  sale?: Sale | null;
  loading?: boolean;
}

export function SaleModal({ isOpen, onClose, onSubmit, sale, loading }: SaleModalProps) {
  const { currency } = useCurrency();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SaleForm>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      amount: 0,
      product: '',
      customer: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      status: 'paid',
      notes: '',
    },
  });

  useEffect(() => {
    if (sale) {
      setValue('amount', sale.amount);
      setValue('product', sale.product);
      setValue('customer', sale.customer || '');
      setValue('date', format(sale.date.toDate(), 'yyyy-MM-dd'));
      setValue('status', sale.status);
      setValue('notes', sale.notes || '');
    } else {
      reset({
        amount: 0,
        product: '',
        customer: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'paid',
        notes: '',
      });
    }
  }, [sale, setValue, reset]);

  const handleFormSubmit = (data: SaleForm) => {
    onSubmit({
      amount: data.amount,
      product: data.product,
      customer: data.customer || '',
      date: Timestamp.fromDate(new Date(data.date)),
      status: data.status,
      notes: data.notes || '',
      source: 'manual',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={sale ? 'Edit Sale' : 'Add New Sale'}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Amount ({currency})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-400 light:text-gray-600 font-medium">
                {currency === 'PHP' && '₱'}
                {currency === 'USD' && '$'}
                {currency === 'EUR' && '€'}
                {currency === 'GBP' && '£'}
                {currency === 'JPY' && '¥'}
                {currency === 'SGD' && 'S$'}
                {currency === 'MYR' && 'RM'}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 rounded-lg 
                           bg-white/5 dark:bg-white/5 light:bg-white 
                           border border-white/10 dark:border-white/10 light:border-gray-300 
                           text-white dark:text-white light:text-gray-900 
                           placeholder-gray-500 dark:placeholder-gray-500 light:placeholder-gray-400 
                           focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                           transition-all"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Product
            </label>
            <input
              type="text"
              placeholder="Product name"
              className="w-full px-4 py-3 rounded-lg 
                         bg-white/5 dark:bg-white/5 light:bg-white 
                         border border-white/10 dark:border-white/10 light:border-gray-300 
                         text-white dark:text-white light:text-gray-900 
                         placeholder-gray-500 dark:placeholder-gray-500 light:placeholder-gray-400 
                         focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                         transition-all"
              {...register('product')}
            />
            {errors.product && (
              <p className="text-sm text-red-500 mt-1">{errors.product.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Customer
            </label>
            <input
              type="text"
              placeholder="Customer name (optional)"
              className="w-full px-4 py-3 rounded-lg 
                         bg-white/5 dark:bg-white/5 light:bg-white 
                         border border-white/10 dark:border-white/10 light:border-gray-300 
                         text-white dark:text-white light:text-gray-900 
                         placeholder-gray-500 dark:placeholder-gray-500 light:placeholder-gray-400 
                         focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                         transition-all"
              {...register('customer')}
            />
            {errors.customer && (
              <p className="text-sm text-red-500 mt-1">{errors.customer.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Date
            </label>
            <input
              type="date"
              className="w-full px-4 py-3 rounded-lg 
                         bg-white/5 dark:bg-white/5 light:bg-white 
                         border border-white/10 dark:border-white/10 light:border-gray-300 
                         text-white dark:text-white light:text-gray-900 
                         focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                         transition-all
                         [color-scheme:dark] dark:[color-scheme:dark] light:[color-scheme:light]"
              {...register('date')}
            />
            {errors.date && (
              <p className="text-sm text-red-500 mt-1">{errors.date.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Status
          </label>
          <div className="flex gap-4">
            {(['paid', 'pending', 'refunded'] as const).map((status) => (
              <label key={status} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={status}
                  {...register('status')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-text-primary capitalize">{status}</span>
              </label>
            ))}
          </div>
          {errors.status && (
            <p className="text-sm text-red-500 mt-1">{errors.status.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Notes
          </label>
          <textarea
            {...register('notes')}
            className="w-full px-4 py-3 rounded-lg 
                       bg-white/5 dark:bg-white/5 light:bg-white 
                       border border-white/10 dark:border-white/10 light:border-gray-300 
                       text-white dark:text-white light:text-gray-900 
                       placeholder-gray-500 dark:placeholder-gray-500 light:placeholder-gray-400 
                       focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                       transition-all resize-none"
            rows={4}
            placeholder="Additional notes (optional)"
          />
          {errors.notes && (
            <p className="text-sm text-red-500 mt-1">{errors.notes.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-white/10 dark:border-white/10 light:border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-lg 
                       bg-white/5 dark:bg-white/5 light:bg-gray-100 
                       border border-white/10 dark:border-white/10 light:border-gray-300 
                       text-white dark:text-white light:text-gray-900 
                       hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-gray-200 
                       transition-all font-medium"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-lg 
                       bg-blue-600 hover:bg-blue-700 
                       text-white font-medium 
                       transition-all 
                       hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50 
                       active:scale-95
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : (sale ? 'Update Sale' : 'Add Sale')}
          </button>
        </div>
      </form>
    </Modal>
  );
}