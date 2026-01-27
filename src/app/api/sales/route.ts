import { NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { validateApiKey, unauthorizedResponse, errorResponse, successResponse } from '@/lib/api-auth';
import { Timestamp } from 'firebase-admin/firestore';

// GET /api/sales - Fetch all sales or filter by query params
export async function GET(request: NextRequest) {
  const auth = validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error!);
  }

  try {
    const db = getAdminDb();
    const { searchParams } = new URL(request.url);

    const customerId = searchParams.get('customer');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = db.collection('sales').orderBy('date', 'desc');

    if (customerId) {
      query = query.where('customer', '==', customerId);
    }
    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.limit(limit).offset(offset).get();

    const sales = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate?.()?.toISOString() || null,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    return successResponse({
      sales,
      count: sales.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return errorResponse('Failed to fetch sales');
  }
}

// POST /api/sales - Create a new sale
export async function POST(request: NextRequest) {
  const auth = validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error!);
  }

  try {
    const db = getAdminDb();
    const body = await request.json();

    // Validate required fields
    const { amount, product, customer, status, date, notes, source } = body;

    if (typeof amount !== 'number' || amount < 0) {
      return errorResponse('Invalid or missing amount', 400);
    }
    if (!product || typeof product !== 'string') {
      return errorResponse('Invalid or missing product', 400);
    }
    if (status && !['paid', 'pending', 'refunded'].includes(status)) {
      return errorResponse('Invalid status. Must be paid, pending, or refunded', 400);
    }

    // Create sale document
    const saleData = {
      amount,
      product,
      customer: customer || null,
      notes: notes || null,
      status: status || 'pending',
      source: source || 'google_sheets',
      date: date ? Timestamp.fromDate(new Date(date)) : Timestamp.now(),
      createdAt: Timestamp.now(),
    };

    // Generate fingerprint for duplicate detection
    const fingerprint = `${saleData.date.toMillis()}-${product}-${amount}-${customer || 'unknown'}`;

    // Check for duplicates
    const existingQuery = await db.collection('sales')
      .where('importFingerprint', '==', fingerprint)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      return errorResponse('Duplicate sale detected', 409);
    }

    const docRef = await db.collection('sales').add({
      ...saleData,
      importFingerprint: fingerprint,
    });

    return successResponse({
      id: docRef.id,
      message: 'Sale created successfully',
    }, 201);
  } catch (error) {
    console.error('Error creating sale:', error);
    return errorResponse('Failed to create sale');
  }
}

// PUT /api/sales - Update a sale (requires id in body)
export async function PUT(request: NextRequest) {
  const auth = validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error!);
  }

  try {
    const db = getAdminDb();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return errorResponse('Missing sale id', 400);
    }

    // Validate status if provided
    if (updates.status && !['paid', 'pending', 'refunded'].includes(updates.status)) {
      return errorResponse('Invalid status', 400);
    }

    // Convert date string to Timestamp if provided
    if (updates.date) {
      updates.date = Timestamp.fromDate(new Date(updates.date));
    }

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    const docRef = db.collection('sales').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return errorResponse('Sale not found', 404);
    }

    await docRef.update(cleanUpdates);

    return successResponse({
      id,
      message: 'Sale updated successfully',
    });
  } catch (error) {
    console.error('Error updating sale:', error);
    return errorResponse('Failed to update sale');
  }
}

// DELETE /api/sales - Delete a sale (requires id in query or body)
export async function DELETE(request: NextRequest) {
  const auth = validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error!);
  }

  try {
    const db = getAdminDb();
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    // Also check body for id
    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch {
        // No body provided
      }
    }

    if (!id) {
      return errorResponse('Missing sale id', 400);
    }

    const docRef = db.collection('sales').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return errorResponse('Sale not found', 404);
    }

    await docRef.delete();

    return successResponse({
      id,
      message: 'Sale deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return errorResponse('Failed to delete sale');
  }
}
