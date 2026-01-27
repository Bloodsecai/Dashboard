'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { ADMIN_ALLOWLIST } from '@/config/admins';
import { useSales } from '@/hooks/useSales';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/contexts/ProfileContext';
import { exportSalesToCSV } from '@/lib/csv';
import { toast } from 'sonner';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Settings,
  Workflow,
  Key,
  User,
  Download,
  Trash2,
  Copy,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Database,
  Zap,
  ArrowRight,
  Book,
  RefreshCw,
  Link as LinkIcon,
  ImageOff,
  Loader2,
} from 'lucide-react';
import { clsx } from 'clsx';

type TabId = 'general' | 'n8n-tutorial' | 'api-keys' | 'profile';

interface Tab {
  id: TabId;
  name: string;
  icon: React.ElementType;
}

const tabs: Tab[] = [
  { id: 'general', name: 'General', icon: Settings },
  { id: 'n8n-tutorial', name: 'N8N Tutorial', icon: Workflow },
  { id: 'api-keys', name: 'API Keys', icon: Key },
  { id: 'profile', name: 'Profile', icon: User },
];

export default function SettingsPage() {
  const { sales } = useSales();
  const { currency, setCurrency } = useCurrency();
  const { user } = useAuth();
  const { profilePicture, isSaving, updateProfilePictureUrl } = useProfile();
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [profileUrlInput, setProfileUrlInput] = useState('');
  const [profileImageError, setProfileImageError] = useState(false);

  // Initialize profile URL input when profilePicture loads
  useEffect(() => {
    if (profilePicture) {
      setProfileUrlInput(profilePicture);
    }
  }, [profilePicture]);

  const handleProfileUrlSave = async () => {
    await updateProfilePictureUrl(profileUrlInput);
  };

  const currencies = [
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  ];

  const dateFormats = [
    { value: 'MM/DD/YYYY', example: '01/22/2026' },
    { value: 'DD/MM/YYYY', example: '22/01/2026' },
    { value: 'YYYY-MM-DD', example: '2026-01-22' },
    { value: 'MMM DD, YYYY', example: 'Jan 22, 2026' },
  ];

  useEffect(() => {
    const savedDateFormat = localStorage.getItem('dateFormat');
    if (savedDateFormat) setDateFormat(savedDateFormat);
  }, []);

  const handleExportAll = () => {
    const filename = `all_sales_export_${new Date().toISOString().split('T')[0]}.csv`;
    exportSalesToCSV(sales, filename);
    toast.success('All data exported successfully');
  };

  const handleClearImportHistory = async () => {
    if (!confirm('Are you sure you want to clear all import history? This cannot be undone.')) {
      return;
    }

    try {
      toast.loading('Clearing import history...');
      const importsSnapshot = await getDocs(collection(db, 'imports'));
      const deletePromises = importsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      toast.dismiss();
      toast.success('Import history cleared successfully!');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to clear import history');
      console.error(error);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const CodeBlock = ({ code, language, id }: { code: string; language: string; id: string }) => (
    <div className="relative group">
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <span className="text-xs text-text-muted bg-white/10 px-2 py-0.5 rounded">{language}</span>
        <button
          onClick={() => copyToClipboard(code, id)}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
        >
          {copiedCode === id ? (
            <CheckCircle className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4 text-text-secondary" />
          )}
        </button>
      </div>
      <pre className="bg-black/40 rounded-xl p-4 overflow-x-auto text-sm text-text-secondary border border-white/10">
        <code>{code}</code>
      </pre>
    </div>
  );

  const renderGeneralTab = () => (
    <div className="space-y-6">
      <Card title="Admin Access">
        <div className="space-y-4">
          <p className="text-text-secondary">
            The following email addresses have admin access to this application:
          </p>
          <div className="flex flex-wrap gap-2">
            {ADMIN_ALLOWLIST.map((email) => (
              <span
                key={email}
                className="px-3 py-1 bg-primary-purple/20 text-primary-purple rounded-full text-sm"
              >
                {email}
              </span>
            ))}
          </div>
          <p className="text-sm text-text-muted">
            To add or remove admin users, contact your developer.
          </p>
        </div>
      </Card>

      <Card title="Currency Settings">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value as typeof currency);
                toast.success('Currency updated successfully');
              }}
              className="w-full md:w-64 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-primary-purple focus:outline-none hover:bg-white/10 transition-all"
              style={{ colorScheme: 'dark' }}
            >
              {currencies.map(curr => (
                <option
                  key={curr.code}
                  value={curr.code}
                  style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}
                >
                  {curr.symbol} {curr.name} ({curr.code})
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-text-secondary">
            <p className="font-medium mb-1">Number Format</p>
            <p>
              {currency === 'PHP' && '₱1,000.00 - Comma separator, 2 decimal places'}
              {currency === 'USD' && '$1,000.00 - Comma separator, 2 decimal places'}
              {currency === 'EUR' && '€1.000,00 - Dot separator, 2 decimal places'}
              {currency === 'GBP' && '£1,000.00 - Comma separator, 2 decimal places'}
              {currency === 'JPY' && '¥1,000 - No decimal places'}
              {currency === 'SGD' && 'S$1,000.00 - Comma separator, 2 decimal places'}
              {currency === 'MYR' && 'RM1,000.00 - Comma separator, 2 decimal places'}
            </p>
          </div>
        </div>
      </Card>

      <Card title="Date Format">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Date Display Format
            </label>
            <select
              value={dateFormat}
              onChange={(e) => {
                setDateFormat(e.target.value);
                localStorage.setItem('dateFormat', e.target.value);
                toast.success('Date format updated');
              }}
              className="w-full md:w-64 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-primary-purple focus:outline-none hover:bg-white/10 transition-all"
              style={{ colorScheme: 'dark' }}
            >
              {dateFormats.map(format => (
                <option
                  key={format.value}
                  value={format.value}
                  style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}
                >
                  {format.value} (e.g., {format.example})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card title="Data Management">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-text-primary mb-2">Export Data</h3>
            <p className="text-text-secondary mb-4">
              Download all your sales data as a CSV file.
            </p>
            <button
              onClick={handleExportAll}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-purple to-primary-pink hover:shadow-glow text-white font-medium transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Export All Data
            </button>
          </div>

          <div className="border-t border-white/10 pt-4">
            <h3 className="text-lg font-medium text-danger mb-2">Danger Zone</h3>
            <p className="text-text-secondary mb-4">
              These actions cannot be undone.
            </p>
            <button
              onClick={handleClearImportHistory}
              className="px-6 py-3 rounded-xl bg-danger/20 hover:bg-danger/30 border border-danger/50 text-danger font-medium transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Clear Import History
            </button>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderN8NTutorialTab = () => (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-purple/20 via-primary-pink/10 to-transparent border border-white/10 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-purple/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-purple to-primary-pink flex items-center justify-center">
              <Workflow className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">How to Automate Your Dashboard with n8n</h2>
              <p className="text-text-secondary">Connect Google Sheets to automatically sync your sales data</p>
            </div>
          </div>
        </div>
      </div>

      {/* Prerequisites */}
      <Card title="Prerequisites">
        <div className="space-y-3">
          <p className="text-text-secondary mb-4">Before you begin, make sure you have the following:</p>
          <div className="grid gap-3">
            {[
              { icon: Workflow, text: 'n8n installed and running (self-hosted or cloud)' },
              { icon: Database, text: 'Google Sheets with your sales data' },
              { icon: Key, text: 'Dashboard API credentials (see API Keys tab)' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded-lg bg-primary-purple/20 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-primary-purple" />
                </div>
                <span className="text-text-primary">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Step 1 */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-purple to-primary-pink flex items-center justify-center text-white font-bold">
              1
            </div>
            <h3 className="text-xl font-semibold text-white">Setup Google Sheets Trigger</h3>
          </div>

          <p className="text-text-secondary">
            Configure n8n to watch your Google Sheets for new sales entries.
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <ArrowRight className="w-5 h-5 text-primary-purple mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-text-primary font-medium">Add Google Sheets node</p>
                <p className="text-text-secondary text-sm">In n8n, add a new "Google Sheets" trigger node to your workflow</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ArrowRight className="w-5 h-5 text-primary-purple mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-text-primary font-medium">Select your spreadsheet</p>
                <p className="text-text-secondary text-sm">Connect your Google account and select the spreadsheet containing your sales data</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ArrowRight className="w-5 h-5 text-primary-purple mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-text-primary font-medium">Choose "On Row Added" trigger</p>
                <p className="text-text-secondary text-sm">This will fire whenever a new row is added to your sheet</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ArrowRight className="w-5 h-5 text-primary-purple mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-text-primary font-medium">Map the columns</p>
                <p className="text-text-secondary text-sm">Ensure your sheet has these columns:</p>
              </div>
            </div>
          </div>

          <div className="bg-black/30 rounded-xl p-4 border border-white/10">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['Customer Name', 'Email', 'Phone', 'Address', 'Amount', 'Date'].map((col) => (
                <div key={col} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-text-primary">{col}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-primary-purple/10 rounded-xl p-4 border border-primary-purple/20">
            <div className="flex items-start gap-2">
              <Book className="w-5 h-5 text-primary-purple mt-0.5" />
              <p className="text-sm text-text-secondary">
                <span className="text-primary-purple font-medium">Tip:</span> Set the polling interval to 1 minute for near real-time updates, or 5 minutes to reduce API calls.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Step 2 */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-purple to-primary-pink flex items-center justify-center text-white font-bold">
              2
            </div>
            <h3 className="text-xl font-semibold text-white">Transform Data</h3>
          </div>

          <p className="text-text-secondary">
            Use a "Set" node to format the data from Google Sheets to match the Dashboard API format.
          </p>

          <CodeBlock
            id="transform"
            language="javascript"
            code={`// Set node configuration
{
  "customerName": "{{ $json.CustomerName }}",
  "email": "{{ $json.Email }}",
  "phone": "{{ $json.Phone }}",
  "address": "{{ $json.Address }}",
  "amount": {{ parseFloat($json.Amount) || 0 }},
  "date": "{{ $json.Date }}",
  "status": "completed"
}`}
          />
        </div>
      </Card>

      {/* Step 3 */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-purple to-primary-pink flex items-center justify-center text-white font-bold">
              3
            </div>
            <h3 className="text-xl font-semibold text-white">HTTP Request to Dashboard API</h3>
          </div>

          <p className="text-text-secondary">
            Configure the HTTP Request node to send data to your Dashboard API.
          </p>

          <div className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-text-muted w-24">Method:</span>
                <span className="text-success font-mono">POST</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-text-muted w-24">URL:</span>
                <code className="text-primary-pink font-mono">http://localhost:3000/api/sales</code>
              </div>
            </div>

            <div>
              <p className="text-text-primary font-medium mb-2">Headers:</p>
              <CodeBlock
                id="headers"
                language="json"
                code={`{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_API_KEY"
}`}
              />
            </div>

            <div>
              <p className="text-text-primary font-medium mb-2">Request Body:</p>
              <CodeBlock
                id="body"
                language="json"
                code={`{
  "customerName": "{{ $json.customerName }}",
  "email": "{{ $json.email }}",
  "phone": "{{ $json.phone }}",
  "address": "{{ $json.address }}",
  "amount": {{ $json.amount }},
  "date": "{{ $json.date }}",
  "status": "{{ $json.status }}"
}`}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Step 4 */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-purple to-primary-pink flex items-center justify-center text-white font-bold">
              4
            </div>
            <h3 className="text-xl font-semibold text-white">Error Handling</h3>
          </div>

          <p className="text-text-secondary">
            Add error handling to catch and respond to any issues.
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-text-primary font-medium">Add "IF" node to check for errors</p>
                <p className="text-text-secondary text-sm">Check if the HTTP response status is 200 (success) or not</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-text-primary font-medium">Add notification nodes</p>
                <p className="text-text-secondary text-sm">Use Slack, Email, or Discord nodes to notify on success/failure</p>
              </div>
            </div>
          </div>

          <CodeBlock
            id="error-check"
            language="javascript"
            code={`// IF node condition
{{ $json.statusCode === 200 || $json.statusCode === 201 }}

// Success branch: Log or notify
// Failure branch: Send alert with error details`}
          />
        </div>
      </Card>

      {/* API Endpoints Reference */}
      <Card title="API Endpoints Reference">
        <div className="space-y-4">
          <p className="text-text-secondary">Available endpoints for your Dashboard API:</p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-text-muted font-medium">Method</th>
                  <th className="text-left py-3 px-4 text-text-muted font-medium">Endpoint</th>
                  <th className="text-left py-3 px-4 text-text-muted font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-3 px-4"><span className="text-success font-mono">POST</span></td>
                  <td className="py-3 px-4"><code className="text-primary-pink">/api/sales</code></td>
                  <td className="py-3 px-4 text-text-secondary">Add new sale</td>
                </tr>
                <tr>
                  <td className="py-3 px-4"><span className="text-success font-mono">POST</span></td>
                  <td className="py-3 px-4"><code className="text-primary-pink">/api/customers</code></td>
                  <td className="py-3 px-4 text-text-secondary">Add new customer</td>
                </tr>
                <tr>
                  <td className="py-3 px-4"><span className="text-info font-mono">GET</span></td>
                  <td className="py-3 px-4"><code className="text-primary-pink">/api/sales</code></td>
                  <td className="py-3 px-4 text-text-secondary">Get all sales</td>
                </tr>
                <tr>
                  <td className="py-3 px-4"><span className="text-warning font-mono">PUT</span></td>
                  <td className="py-3 px-4"><code className="text-primary-pink">/api/sales/:id</code></td>
                  <td className="py-3 px-4 text-text-secondary">Update sale</td>
                </tr>
                <tr>
                  <td className="py-3 px-4"><span className="text-danger font-mono">DELETE</span></td>
                  <td className="py-3 px-4"><code className="text-primary-pink">/api/sales/:id</code></td>
                  <td className="py-3 px-4 text-text-secondary">Delete sale</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Complete Workflow Example */}
      <Card title="Complete Workflow JSON">
        <div className="space-y-4">
          <p className="text-text-secondary">
            Import this workflow directly into n8n for a quick start:
          </p>

          <CodeBlock
            id="workflow"
            language="json"
            code={`{
  "name": "Google Sheets to Dashboard",
  "nodes": [
    {
      "name": "Google Sheets Trigger",
      "type": "n8n-nodes-base.googleSheetsTrigger",
      "parameters": {
        "pollTimes": { "item": [{ "mode": "everyMinute" }] },
        "event": "rowAdded"
      }
    },
    {
      "name": "Transform Data",
      "type": "n8n-nodes-base.set",
      "parameters": {
        "values": {
          "string": [
            { "name": "customerName", "value": "={{ $json.CustomerName }}" },
            { "name": "email", "value": "={{ $json.Email }}" }
          ],
          "number": [
            { "name": "amount", "value": "={{ parseFloat($json.Amount) }}" }
          ]
        }
      }
    },
    {
      "name": "Send to Dashboard",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "http://localhost:3000/api/sales",
        "authentication": "genericCredentialType",
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            { "name": "data", "value": "={{ JSON.stringify($json) }}" }
          ]
        }
      }
    }
  ]
}`}
          />

          <div className="flex items-center gap-2 text-sm text-text-muted">
            <AlertCircle className="w-4 h-4" />
            <span>Remember to replace placeholder values with your actual credentials</span>
          </div>
        </div>
      </Card>

      {/* External Resources */}
      <Card title="Helpful Resources">
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { title: 'n8n Documentation', url: 'https://docs.n8n.io', desc: 'Official n8n docs' },
            { title: 'Google Sheets Node', url: 'https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.googlesheetstrigger/', desc: 'Trigger configuration' },
            { title: 'HTTP Request Node', url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/', desc: 'API request setup' },
            { title: 'n8n Community', url: 'https://community.n8n.io', desc: 'Get help from the community' },
          ].map((resource, i) => (
            <a
              key={i}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary-purple/50 transition-all group"
            >
              <ExternalLink className="w-5 h-5 text-text-muted group-hover:text-primary-purple transition-colors" />
              <div>
                <p className="text-text-primary font-medium group-hover:text-primary-purple transition-colors">{resource.title}</p>
                <p className="text-sm text-text-muted">{resource.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderAPIKeysTab = () => (
    <div className="space-y-6">
      <Card title="API Keys">
        <div className="space-y-6">
          <p className="text-text-secondary">
            Manage your API keys for external integrations. Keep these keys secure and never share them publicly.
          </p>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-purple/20 flex items-center justify-center">
                    <Key className="w-5 h-5 text-primary-purple" />
                  </div>
                  <div>
                    <p className="text-text-primary font-medium">Dashboard API Key</p>
                    <p className="text-sm text-text-muted">Created Jan 15, 2026</p>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs bg-success/20 text-success rounded-full">Active</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-black/30 text-text-secondary text-sm font-mono border border-white/10">
                  sk_live_••••••••••••••••••••••••
                </code>
                <button
                  onClick={() => copyToClipboard('sk_live_example_key_12345', 'api-key')}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                >
                  {copiedCode === 'api-key' ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <Copy className="w-5 h-5 text-text-secondary" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-purple to-primary-pink text-white font-medium hover:shadow-glow transition-all flex items-center gap-2">
              <Key className="w-4 h-4" />
              Generate New Key
            </button>
            <button className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-text-primary hover:bg-white/20 transition-all flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Rotate Key
            </button>
          </div>

          <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
              <div>
                <p className="text-warning font-medium">Security Notice</p>
                <p className="text-sm text-text-secondary mt-1">
                  API keys provide full access to your dashboard data. Never expose them in client-side code or public repositories.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Webhook URLs">
        <div className="space-y-4">
          <p className="text-text-secondary">
            Use these webhook URLs to receive real-time updates in external services.
          </p>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-text-muted mb-2">Sales Webhook</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-black/30 text-primary-pink text-sm font-mono border border-white/10 overflow-x-auto">
                  https://your-domain.com/api/webhooks/sales
                </code>
                <button
                  onClick={() => copyToClipboard('https://your-domain.com/api/webhooks/sales', 'webhook-sales')}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                >
                  {copiedCode === 'webhook-sales' ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <Copy className="w-5 h-5 text-text-secondary" />
                  )}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-text-muted mb-2">Customer Webhook</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-black/30 text-primary-pink text-sm font-mono border border-white/10 overflow-x-auto">
                  https://your-domain.com/api/webhooks/customers
                </code>
                <button
                  onClick={() => copyToClipboard('https://your-domain.com/api/webhooks/customers', 'webhook-customers')}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                >
                  {copiedCode === 'webhook-customers' ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <Copy className="w-5 h-5 text-text-secondary" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderProfileTab = () => (
    <div className="space-y-6">
      <Card title="Profile Information">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Profile Picture Preview */}
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-purple to-primary-pink flex items-center justify-center text-white text-3xl font-bold shadow-glow overflow-hidden">
                {profileUrlInput && !profileImageError ? (
                  <img
                    src={profileUrlInput}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={() => setProfileImageError(true)}
                    onLoad={() => setProfileImageError(false)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    {profileUrlInput && profileImageError ? (
                      <>
                        <ImageOff className="w-8 h-8 text-white/70" />
                        <span className="text-xs mt-1">Invalid</span>
                      </>
                    ) : (
                      user?.email?.charAt(0).toUpperCase()
                    )}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full border-4 border-background" />
            </div>

            {/* Profile Info & URL Input */}
            <div className="flex-1 w-full">
              <h3 className="text-xl font-semibold text-white">{user?.email?.split('@')[0]}</h3>
              <p className="text-text-secondary mb-4">{user?.email}</p>

              {/* Profile Picture URL Input */}
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">
                  Profile Picture URL
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={profileUrlInput}
                      onChange={(e) => {
                        setProfileUrlInput(e.target.value);
                        setProfileImageError(false);
                      }}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-primary-purple focus:outline-none hover:bg-white/10 transition-all"
                    />
                  </div>
                  <button
                    onClick={handleProfileUrlSave}
                    disabled={isSaving || profileUrlInput === profilePicture}
                    className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary-purple to-primary-pink text-white font-medium hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <p className="text-xs text-text-muted mt-1.5">
                  Enter a direct link to an image (PNG, JPG, WebP). Leave empty to use default avatar.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">Email Address</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-text-secondary cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">Display Name</label>
                <input
                  type="text"
                  defaultValue={user?.email?.split('@')[0]}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-primary-purple focus:outline-none hover:bg-white/10 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Account Security">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-text-primary font-medium">Google Authentication</p>
                <p className="text-sm text-text-muted">Connected via Google Sign-In</p>
              </div>
            </div>
            <span className="px-3 py-1 text-xs bg-success/20 text-success rounded-full">Connected</span>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-text-primary font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-text-muted">Add an extra layer of security</p>
              </div>
            </div>
            <button className="px-4 py-1.5 text-sm rounded-lg bg-white/10 text-text-primary hover:bg-white/20 transition-all">
              Enable
            </button>
          </div>
        </div>
      </Card>

      <Card title="Session Information">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-text-muted mb-1">Last Sign In</p>
              <p className="text-text-primary font-medium">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-text-muted mb-1">Account Created</p>
              <p className="text-text-primary font-medium">January 2026</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="text-text-secondary">Manage your application settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              activeTab === tab.id
                ? 'bg-gradient-to-r from-primary-purple to-primary-pink text-white shadow-glow-sm'
                : 'text-text-secondary hover:text-white hover:bg-white/10'
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && renderGeneralTab()}
      {activeTab === 'n8n-tutorial' && renderN8NTutorialTab()}
      {activeTab === 'api-keys' && renderAPIKeysTab()}
      {activeTab === 'profile' && renderProfileTab()}
    </div>
  );
}
