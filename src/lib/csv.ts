import Papa from 'papaparse';
import { Sale } from '@/types';
import { format } from 'date-fns';

export function exportSalesToCSV(sales: Sale[], filename: string = 'sales_export.csv') {
  const csvData = sales.map(sale => ({
    Date: format(sale.date.toDate(), 'yyyy-MM-dd'),
    Product: sale.product,
    Customer: sale.customer || '',
    Amount: sale.amount,
    Status: sale.status,
    Source: sale.source,
    Notes: sale.notes || '',
  }));

  const csv = Papa.unparse(csvData);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}