'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getFirebaseDb, firebaseReady } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Sale } from '@/types';
import { ImportRecord } from '@/types';

interface CSVRow {
  [key: string]: string;
}

interface ColumnMapping {
  product: string;
  amount: string;
  date: string;
  customer: string;
  status: string;
  notes: string;
}

export default function ImportPage() {
  const [sheetUrl, setSheetUrl] = useState('');
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    product: '',
    amount: '',
    date: '',
    customer: '',
    status: '',
    notes: '',
  });
  const [imports, setImports] = useState<ImportRecord[]>([]);

  const autoDetectMappings = (headerKeys: string[]) => {
    const mapping: Partial<ColumnMapping> = {};
    
    // Common column name patterns
    const productPatterns = ['product', 'item', 'name', 'description', 'service'];
    const amountPatterns = ['amount', 'price', 'cost', 'value', 'total', 'revenue'];
    const datePatterns = ['date', 'time', 'created', 'timestamp', 'when'];
    const customerPatterns = ['customer', 'client', 'buyer', 'user', 'account'];
    const statusPatterns = ['status', 'state', 'condition', 'phase'];
    const notesPatterns = ['notes', 'comment', 'remark', 'description', 'detail'];

    headerKeys.forEach(header => {
      const lowerHeader = header.toLowerCase().trim();
      
      if (productPatterns.some(p => lowerHeader.includes(p))) {
        mapping.product = header;
      } else if (amountPatterns.some(p => lowerHeader.includes(p))) {
        mapping.amount = header;
      } else if (datePatterns.some(p => lowerHeader.includes(p))) {
        mapping.date = header;
      } else if (customerPatterns.some(p => lowerHeader.includes(p))) {
        mapping.customer = header;
      } else if (statusPatterns.some(p => lowerHeader.includes(p))) {
        mapping.status = header;
      } else if (notesPatterns.some(p => lowerHeader.includes(p))) {
        mapping.notes = header;
      }
    });

    setColumnMapping(prev => ({ ...prev, ...mapping }));
  };

  useEffect(() => {
    const fetchImports = async () => {
      const db = getFirebaseDb();
      if (!firebaseReady || !db) return;
      
      try {
        const querySnapshot = await getDocs(collection(db, 'imports'));
        const importsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ImportRecord));
        setImports(importsData.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()));
      } catch (error) {
        console.error('Failed to fetch imports:', error);
      }
    };

    fetchImports();
  }, []);

  const handleImport = async () => {
    const db = getFirebaseDb();

    if (!firebaseReady || !db) {
      toast.error('Firebase not ready');
      return;
    }

    if (!columnMapping.product || !columnMapping.amount || !columnMapping.date) {
      toast.error('Please map required columns: Product, Amount, and Date');
      return;
    }

    setImporting(true);
    setImportProgress('Starting import...');

    try {
      let importedCount = 0;
      let skippedCount = 0;
      const totalRows = csvData.length;

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        setImportProgress(`Processing row ${i + 1}/${totalRows}...`);

        // Extract data
        const product = row[columnMapping.product]?.trim() || '';
        const amountStr = row[columnMapping.amount]?.trim() || '';
        const dateStr = row[columnMapping.date]?.trim() || '';
        const customer = columnMapping.customer ? row[columnMapping.customer]?.trim() || '' : '';
        const statusStr = columnMapping.status ? row[columnMapping.status]?.trim() || '' : '';
        const notes = columnMapping.notes ? row[columnMapping.notes]?.trim() || '' : '';

        // Validate and transform data
        const amount = parseFloat(amountStr.replace(/[^\d.-]/g, ''));
        if (isNaN(amount)) {
          console.warn(`Invalid amount for row ${i + 1}: ${amountStr}`);
          continue;
        }

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          console.warn(`Invalid date for row ${i + 1}: ${dateStr}`);
          continue;
        }

        const status = statusStr.toLowerCase();
        if (status && !['paid', 'pending', 'refunded'].includes(status)) {
          console.warn(`Invalid status for row ${i + 1}: ${statusStr}`);
          // Default to 'paid' if invalid
        }

        // Create fingerprint
        const fingerprint = `${date.toISOString().split('T')[0]}_${amount}_${product}_${customer}`;

        // Check for duplicates
        const existingQuery = query(
          collection(db, 'sales'),
          where('importFingerprint', '==', fingerprint)
        );
        const existingDocs = await getDocs(existingQuery);

        if (!existingDocs.empty) {
          skippedCount++;
          continue;
        }

        // Create sale document
        const saleData: Omit<Sale, 'id'> = {
          amount,
          product,
          customer,
          date: Timestamp.fromDate(date),
          status: (status as 'paid' | 'pending' | 'refunded') || 'paid',
          notes,
          source: 'google_sheets',
          createdAt: Timestamp.now(),
          importFingerprint: fingerprint,
        };

        await addDoc(collection(db, 'sales'), saleData);
        importedCount++;
      }

      // Save import record
      const importRecord: Omit<ImportRecord, 'id'> = {
        timestamp: Timestamp.now(),
        recordCount: totalRows,
        sheetUrl,
        status: 'success',
        importedCount,
        skippedCount,
      };

      await addDoc(collection(db, 'imports'), importRecord);

      toast.success(`Import completed! Imported ${importedCount} records, skipped ${skippedCount} duplicates`);

      // Clear data
      setCsvData([]);
      setHeaders([]);
      setColumnMapping({
        product: '',
        amount: '',
        date: '',
        customer: '',
        status: '',
        notes: '',
      });

    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed. Please check your data and try again.');
    } finally {
      setImporting(false);
      setImportProgress('');
    }
  };

  const handleFetchData = async () => {
    if (!sheetUrl) {
      toast.error('Please enter a Google Sheets URL');
      return;
    }

    setLoading(true);
    try {
      // Convert Google Sheets URL to CSV URL
      let csvUrl = sheetUrl;
      if (sheetUrl.includes('docs.google.com/spreadsheets')) {
        const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv`;
        }
      }

      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch data from the URL');
      }

      const csvText = await response.text();

      Papa.parse(csvText, {
        header: true,
        complete: (results) => {
          const data = (results.data as CSVRow[]).slice(0, 20);
          setCsvData(data);
          if (results.data.length > 0) {
            const headerKeys = Object.keys(results.data[0] as CSVRow);
            setHeaders(headerKeys);
            autoDetectMappings(headerKeys);
          }
          toast.success(`Fetched ${results.data.length} rows successfully`);
        },
        error: (error: any) => {
          toast.error('Failed to parse CSV data');
          console.error(error);
        },
      });
    } catch (error) {
      toast.error('Failed to fetch data. Please check the URL.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Import from Google Sheets</h1>
        <p className="text-text-secondary">Import sales data from your Google Sheets</p>
      </div>

      <Card>
        <div className="space-y-4">
          <div>
            <Input
              type="url"
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              label="Google Sheets URL"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              helperText="Enter the URL of your published Google Sheet or the edit URL"
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleFetchData} loading={loading} icon={Upload}>
              Fetch Data
            </Button>
            <Button variant="secondary" icon={FileText}>
              Instructions
            </Button>
          </div>
        </div>
      </Card>

      {csvData.length > 0 && (
        <Card title="Data Preview">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-card/80">
                <tr>
                  {headers.map((header) => (
                    <th key={header} className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {csvData.map((row, index) => (
                  <tr key={index} className="hover:bg-card/50">
                    {headers.map((header) => (
                      <td key={header} className="px-4 py-2 text-sm text-text-primary">
                        {row[header] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 border-t border-border pt-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Column Mapping</h3>
            <p className="text-text-secondary mb-4">
              Map your Google Sheets columns to the corresponding fields:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Product *
                </label>
                <select
                  value={columnMapping.product}
                  onChange={(e) => setColumnMapping(prev => ({ ...prev, product: e.target.value }))}
                  className="w-full px-3 py-2 bg-card/60 backdrop-blur-sm border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    backgroundColor: '#1a1a1a',
                    color: '#ffffff',
                    colorScheme: 'dark'
                  }}
                >
                  <option 
                    value="" 
                    style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}
                  >
                    Select column
                  </option>
                  {headers.map(header => (
                    <option 
                      key={header} 
                      value={header}
                      style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}
                    >
                      {header}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Amount *
                </label>
                <select
                  value={columnMapping.amount}
                  onChange={(e) => setColumnMapping(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 bg-card/60 backdrop-blur-sm border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    backgroundColor: '#1a1a1a',
                    color: '#ffffff',
                    colorScheme: 'dark'
                  }}
                >
                  <option 
                    value="" 
                    style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}
                  >
                    Select column
                  </option>
                  {headers.map(header => (
                    <option 
                      key={header} 
                      value={header}
                      style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}
                    >
                      {header}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Date *
                </label>
                <select
                  value={columnMapping.date}
                  onChange={(e) => setColumnMapping(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 bg-card/60 backdrop-blur-sm border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    backgroundColor: '#1a1a1a',
                    color: '#ffffff',
                    colorScheme: 'dark'
                  }}
                >
                  <option 
                    value="" 
                    style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}
                  >
                    Select column
                  </option>
                  {headers.map(header => (
                    <option 
                      key={header} 
                      value={header}
                      style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}
                    >
                      {header}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Customer
                </label>
                <select
                  value={columnMapping.customer}
                  onChange={(e) => setColumnMapping(prev => ({ ...prev, customer: e.target.value }))}
                  className="w-full px-3 py-2 bg-card/60 backdrop-blur-sm border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    backgroundColor: '#1a1a1a',
                    color: '#ffffff',
                    colorScheme: 'dark'
                  }}
                >
                  <option 
                    value="" 
                    style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}
                  >
                    Select column (optional)
                  </option>
                  {headers.map(header => (
                    <option 
                      key={header} 
                      value={header}
                      style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}
                    >
                      {header}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Status
                </label>
                <select
                  value={columnMapping.status}
                  onChange={(e) => setColumnMapping(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-card/60 backdrop-blur-sm border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    backgroundColor: '#1a1a1a',
                    color: '#ffffff',
                    colorScheme: 'dark'
                  }}
                >
                  <option 
                    value="" 
                    style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}
                  >
                    Select column (optional)
                  </option>
                  {headers.map(header => (
                    <option 
                      key={header} 
                      value={header}
                      style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}
                    >
                      {header}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Notes
                </label>
                <select
                  value={columnMapping.notes}
                  onChange={(e) => setColumnMapping(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-card/60 backdrop-blur-sm border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    backgroundColor: '#1a1a1a',
                    color: '#ffffff',
                    colorScheme: 'dark'
                  }}
                >
                  <option 
                    value="" 
                    style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}
                  >
                    Select column (optional)
                  </option>
                  {headers.map(header => (
                    <option 
                      key={header} 
                      value={header}
                      style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}
                    >
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-text-secondary">
              Showing first 20 rows of {csvData.length} total rows
            </p>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? importProgress : 'Import to Firestore'}
            </Button>
          </div>
        </Card>
      )}

      <Card title="Import History">
        {imports.length === 0 ? (
          <p className="text-text-secondary">No import history yet</p>
        ) : (
          <div className="space-y-4">
            {imports.map((importRecord) => (
              <div key={importRecord.id} className="flex items-center justify-between p-4 bg-card/50 rounded-lg">
                <div>
                  <p className="font-medium text-text-primary">
                    {format(importRecord.timestamp.toDate(), 'MMM dd, yyyy HH:mm')}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {importRecord.recordCount} records • {importRecord.importedCount || 0} imported • {importRecord.skippedCount || 0} skipped
                  </p>
                  <p className="text-xs text-text-muted truncate max-w-md">
                    {importRecord.sheetUrl}
                  </p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  importRecord.status === 'success' ? 'bg-success/20 text-success' :
                  importRecord.status === 'partial' ? 'bg-warning/20 text-warning' :
                  'bg-danger/20 text-danger'
                }`}>
                  {importRecord.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}