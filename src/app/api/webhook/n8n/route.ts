import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

interface SalePayload {
  amount: number;
  product: string;
  category?: string;
  customer?: string;
  customerName?: string;
  status?: 'paid' | 'pending' | 'refunded';
  location?: string;
  notes?: string;
  date?: string;
}

interface ActivityPayload {
  type: 'email' | 'call' | 'meeting' | 'follow-up' | 'other';
  description?: string;
  salesId?: string;
  customerId?: string;
}

interface CustomerPayload {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'inactive';
}

interface WebhookPayload {
  type: 'sale' | 'activity' | 'customer' | 'batch';
  data?: SalePayload | ActivityPayload | CustomerPayload;
  sales?: SalePayload[];
  activities?: ActivityPayload[];
  customers?: CustomerPayload[];
}

// Webhook secret for validation (optional but recommended)
const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Validate webhook secret if configured
    if (WEBHOOK_SECRET) {
      const authHeader = request.headers.get('x-webhook-secret') || request.headers.get('authorization');
      const providedSecret = authHeader?.replace('Bearer ', '');

      if (providedSecret !== WEBHOOK_SECRET) {
        return NextResponse.json(
          { success: false, error: 'Invalid webhook secret' },
          { status: 401 }
        );
      }
    }

    const body: WebhookPayload = await request.json();
    const db = getAdminDb();
    const results: { type: string; id?: string; count?: number; error?: string }[] = [];

    // Handle batch data
    if (body.type === 'batch') {
      // Process batch sales
      if (body.sales && body.sales.length > 0) {
        const batch = db.batch();
        const salesRef = db.collection('sales');

        for (const sale of body.sales) {
          const docRef = salesRef.doc();
          batch.set(docRef, {
            amount: Number(sale.amount) || 0,
            product: sale.product || 'Unknown',
            category: sale.category || null,
            customer: sale.customer || sale.customerName || null,
            customerName: sale.customerName || sale.customer || null,
            status: sale.status || 'pending',
            location: sale.location?.toUpperCase() || null,
            notes: sale.notes || null,
            source: 'n8n',
            date: sale.date ? Timestamp.fromDate(new Date(sale.date)) : Timestamp.now(),
            createdAt: Timestamp.now(),
          });
        }

        await batch.commit();
        results.push({ type: 'sales', count: body.sales.length });
      }

      // Process batch activities
      if (body.activities && body.activities.length > 0) {
        const batch = db.batch();
        const activitiesRef = db.collection('activities');

        for (const activity of body.activities) {
          const docRef = activitiesRef.doc();
          batch.set(docRef, {
            type: activity.type?.toLowerCase() || 'other',
            description: activity.description || null,
            salesId: activity.salesId || null,
            customerId: activity.customerId || null,
            createdAt: Timestamp.now(),
          });
        }

        await batch.commit();
        results.push({ type: 'activities', count: body.activities.length });
      }

      // Process batch customers
      if (body.customers && body.customers.length > 0) {
        const batch = db.batch();
        const customersRef = db.collection('customers');

        for (const customer of body.customers) {
          const docRef = customersRef.doc();
          batch.set(docRef, {
            name: customer.name || 'Unknown',
            email: customer.email || '',
            phone: customer.phone || '',
            address: customer.address || '',
            status: customer.status || 'active',
            customFields: {},
            totalSpent: 0,
            orderCount: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        }

        await batch.commit();
        results.push({ type: 'customers', count: body.customers.length });
      }

      return NextResponse.json({
        success: true,
        message: 'Batch data processed successfully',
        results,
      });
    }

    // Handle single records
    if (body.type === 'sale' && body.data) {
      const sale = body.data as SalePayload;
      const docRef = await db.collection('sales').add({
        amount: Number(sale.amount) || 0,
        product: sale.product || 'Unknown',
        category: sale.category || null,
        customer: sale.customer || sale.customerName || null,
        customerName: sale.customerName || sale.customer || null,
        status: sale.status || 'pending',
        location: sale.location?.toUpperCase() || null,
        notes: sale.notes || null,
        source: 'n8n',
        date: sale.date ? Timestamp.fromDate(new Date(sale.date)) : Timestamp.now(),
        createdAt: Timestamp.now(),
      });

      return NextResponse.json({
        success: true,
        message: 'Sale created successfully',
        id: docRef.id,
      });
    }

    if (body.type === 'activity' && body.data) {
      const activity = body.data as ActivityPayload;
      const docRef = await db.collection('activities').add({
        type: activity.type?.toLowerCase() || 'other',
        description: activity.description || null,
        salesId: activity.salesId || null,
        customerId: activity.customerId || null,
        createdAt: Timestamp.now(),
      });

      return NextResponse.json({
        success: true,
        message: 'Activity created successfully',
        id: docRef.id,
      });
    }

    if (body.type === 'customer' && body.data) {
      const customer = body.data as CustomerPayload;
      const docRef = await db.collection('customers').add({
        name: customer.name || 'Unknown',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        status: customer.status || 'active',
        customFields: {},
        totalSpent: 0,
        orderCount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      return NextResponse.json({
        success: true,
        message: 'Customer created successfully',
        id: docRef.id,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid payload type or missing data' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process webhook data' },
      { status: 500 }
    );
  }
}

// Support GET for webhook verification
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'n8n webhook endpoint is active',
    endpoints: {
      sale: 'POST with { type: "sale", data: { amount, product, customer, status, location } }',
      activity: 'POST with { type: "activity", data: { type, description, salesId } }',
      customer: 'POST with { type: "customer", data: { name, email, phone } }',
      batch: 'POST with { type: "batch", sales: [...], activities: [...], customers: [...] }',
    },
  });
}
