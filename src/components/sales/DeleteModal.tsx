'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Sale } from '@/types';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sale?: Sale | null;
  loading?: boolean;
}

export function DeleteModal({ isOpen, onClose, onConfirm, sale, loading }: DeleteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Sale">
      <div className="space-y-4">
        <div className="text-center">
          <div className="w-12 h-12 bg-danger/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-danger"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            Delete Sale
          </h3>
          <p className="text-text-secondary mb-4">
            Are you sure you want to delete this sale? This action cannot be undone.
          </p>
        </div>

        {sale && (
          <div className="bg-card/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-text-secondary">Product:</span>
              <span className="text-text-primary">{sale.product}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Amount:</span>
              <span className="text-text-primary">
                ₱{sale.amount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Status:</span>
              <span className="text-text-primary capitalize">{sale.status}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            loading={loading}
          >
            Delete Sale
          </Button>
        </div>
      </div>
    </Modal>
  );
}