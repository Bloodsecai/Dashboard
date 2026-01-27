'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronUp, ChevronDown, Search, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Customer } from '@/types';
import { useCurrency } from '@/contexts/CurrencyContext';

interface CustomersTableProps {
  customers: Customer[];
  onRowClick?: (customer: Customer) => void;
  onAddCustomField?: (customer: Customer) => void;
}

type SortField = 'name' | 'email' | 'phone' | 'address' | 'lastPurchase' | 'totalSpent' | 'orderCount' | 'status' | string;
type SortDirection = 'asc' | 'desc';

export function CustomersTable({ customers, onRowClick, onAddCustomField }: CustomersTableProps) {
  const [sortField, setSortField] = useState<SortField>('totalSpent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const { formatAmount } = useCurrency();

  // Collect all unique custom field names across all customers
  const allCustomFieldNames = useMemo(() => {
    const fieldNames = new Set<string>();
    customers.forEach(customer => {
      if (customer.customFields) {
        Object.keys(customer.customFields).forEach(key => fieldNames.add(key));
      }
    });
    return Array.from(fieldNames).sort();
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;

    const query = searchQuery.toLowerCase();
    return customers.filter(customer => {
      // Search in standard fields
      const standardMatch =
        customer.name.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query) ||
        customer.address?.toLowerCase().includes(query);

      // Search in custom fields
      const customFieldMatch = customer.customFields
        ? Object.values(customer.customFields).some(value =>
            value.toLowerCase().includes(query)
          )
        : false;

      return standardMatch || customFieldMatch;
    });
  }, [customers, searchQuery]);

  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      let aValue: string | number | Date | undefined;
      let bValue: string | number | Date | undefined;

      // Check if sorting by custom field
      if (allCustomFieldNames.includes(sortField)) {
        aValue = a.customFields?.[sortField] || '';
        bValue = b.customFields?.[sortField] || '';
      } else {
        switch (sortField) {
          case 'lastPurchase':
            aValue = a.lastPurchase?.toDate?.()?.getTime() || 0;
            bValue = b.lastPurchase?.toDate?.()?.getTime() || 0;
            break;
          case 'totalSpent':
            aValue = a.totalSpent || 0;
            bValue = b.totalSpent || 0;
            break;
          case 'orderCount':
            aValue = a.orderCount || 0;
            bValue = b.orderCount || 0;
            break;
          default:
            aValue = (a as unknown as Record<string, unknown>)[sortField] as string || '';
            bValue = (b as unknown as Record<string, unknown>)[sortField] as string || '';
        }
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if ((aValue as number) < (bValue as number)) return sortDirection === 'asc' ? -1 : 1;
      if ((aValue as number) > (bValue as number)) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredCustomers, sortField, sortDirection, allCustomFieldNames]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCustomers.slice(start, start + pageSize);
  }, [sortedCustomers, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedCustomers.length / pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-text-primary transition-colors"
    >
      {children}
      {sortField === field && (
        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
      )}
    </button>
  );

  const formatLastPurchase = (customer: Customer) => {
    if (customer.lastPurchase?.toDate) {
      return format(customer.lastPurchase.toDate(), 'MMM dd, yyyy');
    }
    return '-';
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search by name, email, phone, address, or custom fields..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2 bg-card/60 backdrop-blur-sm border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
        />
      </div>

      {/* Table */}
      <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-card/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  <SortButton field="name">Customer Name</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  <SortButton field="email">Email</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  <SortButton field="phone">Phone</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  <SortButton field="address">Address</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  <SortButton field="lastPurchase">Last Purchase</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  <SortButton field="totalSpent">Total Spent</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  <SortButton field="orderCount">Orders</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  <SortButton field="status">Status</SortButton>
                </th>
                {/* Dynamic Custom Field Columns */}
                {allCustomFieldNames.map(fieldName => (
                  <th
                    key={fieldName}
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                  >
                    <SortButton field={fieldName}>{fieldName}</SortButton>
                  </th>
                ))}
                {/* Actions Column */}
                <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Fields
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan={9 + allCustomFieldNames.length}
                    className="px-6 py-12 text-center text-text-secondary"
                  >
                    {searchQuery ? 'No customers found matching your search' : 'No customers found'}
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-card/50 transition-colors"
                  >
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary cursor-pointer"
                      onClick={() => onRowClick?.(customer)}
                    >
                      {customer.name}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm text-text-primary cursor-pointer"
                      onClick={() => onRowClick?.(customer)}
                    >
                      {customer.email || '-'}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm text-text-primary cursor-pointer"
                      onClick={() => onRowClick?.(customer)}
                    >
                      {customer.phone || '-'}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm text-text-primary max-w-xs truncate cursor-pointer"
                      onClick={() => onRowClick?.(customer)}
                    >
                      {customer.address || '-'}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm text-text-primary cursor-pointer"
                      onClick={() => onRowClick?.(customer)}
                    >
                      {formatLastPurchase(customer)}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary cursor-pointer"
                      onClick={() => onRowClick?.(customer)}
                    >
                      {formatAmount(customer.totalSpent || 0)}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm text-text-primary cursor-pointer"
                      onClick={() => onRowClick?.(customer)}
                    >
                      {customer.orderCount || 0}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap cursor-pointer"
                      onClick={() => onRowClick?.(customer)}
                    >
                      <Badge variant={customer.status || 'active'}>
                        {customer.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    {/* Dynamic Custom Field Values */}
                    {allCustomFieldNames.map(fieldName => (
                      <td
                        key={fieldName}
                        className="px-6 py-4 whitespace-nowrap text-sm text-text-primary cursor-pointer"
                        onClick={() => onRowClick?.(customer)}
                      >
                        {customer.customFields?.[fieldName] || '-'}
                      </td>
                    ))}
                    {/* Add Custom Field Button */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddCustomField?.(customer);
                        }}
                        className="p-1"
                        title="Add custom field"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-card/60 border border-border rounded px-2 py-1 text-sm"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-text-secondary">entries</span>
        </div>

        <div className="text-sm text-text-secondary">
          Showing {sortedCustomers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
          {Math.min(currentPage * pageSize, sortedCustomers.length)} of {sortedCustomers.length} customers
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-text-secondary">
            Page {currentPage} of {totalPages || 1}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
