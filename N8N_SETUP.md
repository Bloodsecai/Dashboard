# n8n Integration Setup Guide

This guide explains how to set up the n8n automation to sync Google Sheets data with your Sales Dashboard.

## Data Flow
```
Google Sheets (new row) → n8n → API → Firebase → Dashboard (real-time update)
```

## Prerequisites

1. n8n instance (self-hosted or n8n.cloud)
2. Google Sheets with your sales data
3. Your Sales Dashboard deployed and running

---

## Step 1: Environment Variables

Add these environment variables to your Next.js deployment:

```env
# API Authentication (generate a secure random string)
API_SECRET_KEY=your-secure-api-key-here

# Firebase Admin SDK (for server-side API routes)
# Option A: Service Account JSON (recommended for production)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# Option B: If using Application Default Credentials (for local dev)
# No additional config needed if running on GCP or using gcloud CLI
```

### Generating a Secure API Key

```bash
# Generate a random 32-character API key
openssl rand -hex 32
```

---

## Step 2: Firebase Setup

### Create a Service Account

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file securely
6. Add the JSON content to `FIREBASE_SERVICE_ACCOUNT_KEY` env variable

### Firestore Collections

The API uses these collections:
- `sales` - All sales transactions
- `customers` - Customer records with custom fields

---

## Step 3: n8n Setup

### Import the Workflow

1. Open your n8n instance
2. Go to **Workflows** → **Import from File**
3. Select `n8n-workflow.json` from this directory
4. The workflow will be imported with all nodes configured

### Configure Credentials

#### 1. Google Sheets OAuth2

1. In n8n, go to **Credentials** → **Add Credential**
2. Select **Google Sheets OAuth2 API**
3. Follow the OAuth setup flow
4. Grant access to your Google Sheets

#### 2. HTTP Header Auth (API Key)

1. In n8n, go to **Credentials** → **Add Credential**
2. Select **Header Auth**
3. Set:
   - **Name**: `x-api-key`
   - **Value**: Your `API_SECRET_KEY` value

### Configure Environment Variables in n8n

1. In n8n settings, add environment variable:
   - `DASHBOARD_API_URL`: Your dashboard URL (e.g., `https://your-dashboard.vercel.app`)

### Update Workflow Nodes

1. **Google Sheets Trigger**:
   - Set your Spreadsheet ID
   - Set the Sheet name
   - Select your Google credentials

2. **HTTP Request nodes**:
   - Select your HTTP Header Auth credential
   - Verify the URL uses `{{ $env.DASHBOARD_API_URL }}`

---

## Step 4: Google Sheets Format

Your Google Sheets should have these columns (adjust the Transform Data node if different):

| Column | Description | Required |
|--------|-------------|----------|
| Amount | Sale amount (number) | Yes |
| Product | Product name | Yes |
| Customer | Customer name | No |
| Status | paid/pending/refunded | No (defaults to pending) |
| Date | Sale date (any format) | No (defaults to now) |
| Notes | Additional notes | No |

### Example Sheet Structure

| Amount | Product | Customer | Status | Date | Notes |
|--------|---------|----------|--------|------|-------|
| 1500 | Widget Pro | John Doe | paid | 2024-01-15 | First order |
| 2500 | Service Basic | Jane Smith | pending | 2024-01-16 | |

---

## Step 5: Testing

### Test the API Directly

```bash
# Test creating a sale
curl -X POST https://your-dashboard.vercel.app/api/sales \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "amount": 1000,
    "product": "Test Product",
    "customer": "Test Customer",
    "status": "paid",
    "date": "2024-01-15T00:00:00Z"
  }'

# Test getting sales
curl -X GET https://your-dashboard.vercel.app/api/sales \
  -H "x-api-key: your-api-key"

# Test creating a customer
curl -X POST https://your-dashboard.vercel.app/api/customers \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "name": "Test Customer",
    "email": "test@example.com",
    "phone": "+1234567890",
    "address": "123 Main St"
  }'
```

### Test n8n Workflow

1. Add a test row to your Google Sheet
2. In n8n, click **Execute Workflow** (or wait for the trigger)
3. Check the execution log for any errors
4. Verify the sale appears in your dashboard

---

## API Reference

### Sales API

#### GET /api/sales
Fetch all sales with optional filtering.

Query Parameters:
- `customer`: Filter by customer name
- `status`: Filter by status (paid/pending/refunded)
- `limit`: Max results (default: 100)
- `offset`: Pagination offset

#### POST /api/sales
Create a new sale.

Body:
```json
{
  "amount": 1000,
  "product": "Product Name",
  "customer": "Customer Name",
  "status": "paid",
  "date": "2024-01-15T00:00:00Z",
  "notes": "Optional notes"
}
```

#### PUT /api/sales
Update an existing sale.

Body:
```json
{
  "id": "sale-id",
  "amount": 1200,
  "status": "refunded"
}
```

#### DELETE /api/sales
Delete a sale.

Query: `?id=sale-id` or Body: `{ "id": "sale-id" }`

### Customers API

#### GET /api/customers
Fetch all customers.

Query Parameters:
- `status`: Filter by status (active/inactive)
- `search`: Search by name/email/phone
- `limit`: Max results (default: 100)
- `offset`: Pagination offset

#### POST /api/customers
Create a new customer (or update if name exists).

Body:
```json
{
  "name": "Customer Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "status": "active",
  "customFields": {
    "Company": "ACME Inc",
    "Industry": "Tech"
  }
}
```

#### PUT /api/customers
Update an existing customer.

Body:
```json
{
  "id": "customer-id",
  "email": "newemail@example.com",
  "customFields": {
    "VIP": "true"
  }
}
```

#### DELETE /api/customers
Delete a customer.

Query: `?id=customer-id` or Body: `{ "id": "customer-id" }`

---

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check your API key is correct in both env vars and n8n credentials

2. **409 Conflict (Duplicate)**: The sale already exists (based on date+product+amount+customer fingerprint)

3. **500 Server Error**: Check Firebase credentials and Firestore rules

4. **n8n trigger not firing**: Ensure Google Sheets OAuth is properly configured and has access to the sheet

### Firestore Security Rules

Ensure your Firestore rules allow the Admin SDK to read/write:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read
    match /sales/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /customers/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

Note: The Admin SDK bypasses security rules, but client-side access still needs these rules.

---

## Real-time Updates

The dashboard uses Firebase's `onSnapshot` for real-time updates. When a sale is created via the API:

1. n8n sends data to `/api/sales`
2. API writes to Firestore using Admin SDK
3. Firestore triggers `onSnapshot` listeners
4. Dashboard updates automatically (no refresh needed!)

This creates a seamless experience where sales from Google Sheets appear instantly on the dashboard.
