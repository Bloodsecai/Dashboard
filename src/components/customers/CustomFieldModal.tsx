'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Trash2 } from 'lucide-react';
import { Customer } from '@/types';

interface CustomFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  onAddField: (fieldName: string, fieldValue: string) => Promise<void>;
  onRemoveField: (fieldName: string) => Promise<void>;
  onUpdateField: (fieldName: string, fieldValue: string) => Promise<void>;
}

export function CustomFieldModal({
  isOpen,
  onClose,
  customer,
  onAddField,
  onRemoveField,
  onUpdateField,
}: CustomFieldModalProps) {
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const customFields = customer.customFields || {};
  const fieldEntries = Object.entries(customFields);

  const handleAddField = async () => {
    if (!newFieldName.trim()) {
      setError('Field name is required');
      return;
    }
    if (!newFieldValue.trim()) {
      setError('Field value is required');
      return;
    }
    if (customFields[newFieldName]) {
      setError('Field with this name already exists');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onAddField(newFieldName.trim(), newFieldValue.trim());
      setNewFieldName('');
      setNewFieldValue('');
    } catch (err) {
      setError('Failed to add field');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveField = async (fieldName: string) => {
    setLoading(true);
    try {
      await onRemoveField(fieldName);
    } catch (err) {
      setError('Failed to remove field');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (fieldName: string, currentValue: string) => {
    setEditingField(fieldName);
    setEditValue(currentValue);
  };

  const handleSaveEdit = async (fieldName: string) => {
    if (!editValue.trim()) {
      setError('Field value cannot be empty');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onUpdateField(fieldName, editValue.trim());
      setEditingField(null);
      setEditValue('');
    } catch (err) {
      setError('Failed to update field');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Custom Fields - ${customer.name}`} size="md">
      <div className="space-y-6">
        {/* Existing Custom Fields */}
        {fieldEntries.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
              Existing Fields
            </h3>
            <div className="space-y-2">
              {fieldEntries.map(([name, value]) => (
                <div
                  key={name}
                  className="flex items-center gap-3 p-3 bg-card/50 rounded-lg border border-border"
                >
                  <div className="flex-1">
                    <p className="text-xs text-text-muted">{name}</p>
                    {editingField === name ? (
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-1 bg-card/60 border border-border rounded text-sm text-text-primary"
                          autoFocus
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleSaveEdit(name)}
                          disabled={loading}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <p
                        className="text-sm text-text-primary cursor-pointer hover:text-primary"
                        onClick={() => handleStartEdit(name, value)}
                        title="Click to edit"
                      >
                        {value}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveField(name)}
                    disabled={loading}
                    className="p-1 text-danger hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {fieldEntries.length === 0 && (
          <p className="text-text-secondary text-center py-4">No custom fields yet</p>
        )}

        {/* Add New Field */}
        <div className="space-y-3 pt-4 border-t border-border">
          <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
            Add New Field
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Field name"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              disabled={loading}
            />
            <Input
              placeholder="Field value"
              value={newFieldValue}
              onChange={(e) => setNewFieldValue(e.target.value)}
              disabled={loading}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button
            variant="primary"
            onClick={handleAddField}
            disabled={loading || !newFieldName.trim() || !newFieldValue.trim()}
            icon={Plus}
            className="w-full"
          >
            Add Field
          </Button>
        </div>
      </div>
    </Modal>
  );
}
