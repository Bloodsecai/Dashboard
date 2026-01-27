'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { useSales } from '@/hooks/useSales';
import { useCustomers, useMergedCustomers } from '@/hooks/useCustomers';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CustomersTable } from '@/components/customers/CustomersTable';
import { CustomFieldModal } from '@/components/customers/CustomFieldModal';
import { format } from 'date-fns';
import { X, Edit, Save } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Customer } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

export default function CustomersPage() {
  const { sales, loading: salesLoading } = useSales();
  const {
    customers: customerRecords,
    loading: customersLoading,
    addCustomer,
    updateCustomer,
    addCustomField,
    removeCustomField,
  } = useCustomers();
  const { formatAmount } = useCurrency();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customFieldCustomer, setCustomFieldCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    email: '',
    phone: '',
    address: '',
    status: 'active' as 'active' | 'inactive',
  });

  // Merge customers from Firebase with calculated data from sales
  const mergedCustomers = useMergedCustomers(sales, customerRecords);

  const loading = salesLoading || customersLoading;

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditForm({
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      status: customer.status || 'active',
    });
    setIsEditing(false);
  };

  const handleAddCustomField = (customer: Customer) => {
    // If this is a virtual customer (from sales only), create it in Firebase first
    if (customer.id.startsWith('virtual-')) {
      // Create customer in Firebase
      addCustomer({
        name: customer.name,
        email: '',
        phone: '',
        address: '',
        status: 'active',
        customFields: {},
      }).then((newId) => {
        // Open modal with the new customer
        setCustomFieldCustomer({
          ...customer,
          id: newId,
        });
      }).catch((err) => {
        console.error('Error creating customer:', err);
        toast.error('Failed to create customer record');
      });
    } else {
      setCustomFieldCustomer(customer);
    }
  };

  const handleSaveCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      // If virtual customer, create it first
      if (selectedCustomer.id.startsWith('virtual-')) {
        await addCustomer({
          name: selectedCustomer.name,
          ...editForm,
          customFields: {},
        });
        toast.success('Customer created successfully');
      } else {
        await updateCustomer(selectedCustomer.id, editForm);
        toast.success('Customer updated successfully');
      }
      setIsEditing(false);
      // Update the selected customer with new values
      setSelectedCustomer(prev => prev ? { ...prev, ...editForm } : null);
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Failed to save customer');
    }
  };

  const handleAddField = async (fieldName: string, fieldValue: string) => {
    if (!customFieldCustomer) return;
    await addCustomField(customFieldCustomer.id, fieldName, fieldValue);
    toast.success(`Field "${fieldName}" added`);
  };

  const handleRemoveField = async (fieldName: string) => {
    if (!customFieldCustomer) return;
    await removeCustomField(customFieldCustomer.id, fieldName);
    toast.success(`Field "${fieldName}" removed`);
  };

  const handleUpdateField = async (fieldName: string, fieldValue: string) => {
    if (!customFieldCustomer) return;
    await addCustomField(customFieldCustomer.id, fieldName, fieldValue);
    toast.success(`Field "${fieldName}" updated`);
  };

  // Get customer sales for the drawer
  const getCustomerSales = (customerName: string) => {
    return sales.filter(s => s.customer === customerName)
      .sort((a, b) => b.date.toMillis() - a.date.toMillis());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Customers</h1>
        <p className="text-text-secondary">View customer information and purchase history</p>
      </div>

      <CustomersTable
        customers={mergedCustomers}
        onRowClick={handleRowClick}
        onAddCustomField={handleAddCustomField}
      />

      {/* Customer Details Drawer */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="absolute right-0 top-0 h-full w-[450px] bg-card/90 backdrop-blur-xl border-l border-border p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-text-primary">{selectedCustomer.name}</h2>
                  <Badge variant={selectedCustomer.status || 'active'} className="mt-1">
                    {selectedCustomer.status === 'inactive' ? 'Inactive' : 'Active'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="p-1"
                    >
                      <Edit className="h-5 w-5" />
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveCustomer}
                      className="p-1"
                    >
                      <Save className="h-5 w-5" />
                    </Button>
                  )}
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="text-text-secondary hover:text-text-primary p-1 rounded-lg hover:bg-card/50 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                  Contact Info
                </h3>
                <div className="space-y-3 bg-card/50 rounded-lg p-4">
                  {isEditing ? (
                    <>
                      <Input
                        label="Email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="customer@example.com"
                      />
                      <Input
                        label="Phone"
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+1 234 567 8900"
                      />
                      <Input
                        label="Address"
                        value={editForm.address}
                        onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="123 Main St, City"
                      />
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-text-primary">Status</label>
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                          className="w-full px-3 py-2 bg-card/60 border border-border rounded-lg text-text-primary"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs text-text-muted">Email</p>
                        <p className="text-sm text-text-primary">{selectedCustomer.email || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-muted">Phone</p>
                        <p className="text-sm text-text-primary">{selectedCustomer.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-muted">Address</p>
                        <p className="text-sm text-text-primary">{selectedCustomer.address || 'Not provided'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Custom Fields */}
              {selectedCustomer.customFields && Object.keys(selectedCustomer.customFields).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                    Custom Fields
                  </h3>
                  <div className="space-y-2 bg-card/50 rounded-lg p-4">
                    {Object.entries(selectedCustomer.customFields).map(([name, value]) => (
                      <div key={name}>
                        <p className="text-xs text-text-muted">{name}</p>
                        <p className="text-sm text-text-primary">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card/50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-primary">
                    {formatAmount(selectedCustomer.totalSpent || 0)}
                  </p>
                  <p className="text-sm text-text-secondary">Total Spent</p>
                </div>
                <div className="bg-card/50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-success">{selectedCustomer.orderCount || 0}</p>
                  <p className="text-sm text-text-secondary">Total Orders</p>
                </div>
              </div>

              {/* Purchase History */}
              <div>
                <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
                  Purchase History
                </h3>
                <div className="space-y-3">
                  {getCustomerSales(selectedCustomer.name).length === 0 ? (
                    <p className="text-text-secondary text-center py-4">No purchases yet</p>
                  ) : (
                    getCustomerSales(selectedCustomer.name).map((sale) => (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between p-3 bg-card/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-text-primary">{sale.product}</p>
                          <p className="text-sm text-text-secondary">
                            {format(sale.date.toDate(), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-text-primary">{formatAmount(sale.amount)}</p>
                          <Badge variant={sale.status} className="text-xs">
                            {sale.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Field Modal */}
      {customFieldCustomer && (
        <CustomFieldModal
          isOpen={!!customFieldCustomer}
          onClose={() => setCustomFieldCustomer(null)}
          customer={customFieldCustomer}
          onAddField={handleAddField}
          onRemoveField={handleRemoveField}
          onUpdateField={handleUpdateField}
        />
      )}
    </div>
  );
}
