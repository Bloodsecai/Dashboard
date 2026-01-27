import { NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { validateApiKey, unauthorizedResponse, errorResponse, successResponse } from '@/lib/api-auth';
import { Timestamp } from 'firebase-admin/firestore';

// GET /api/customers - Fetch all customers
export async function GET(request: NextRequest) {
  const auth = validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error!);
  }

  try {
    const db = getAdminDb();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = db.collection('customers').orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.limit(limit).offset(offset).get();

    let customers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      };
    }) as Array<{
      id: string;
      name?: string;
      email?: string;
      phone?: string;
      createdAt: string | null;
      updatedAt: string | null;
      [key: string]: unknown;
    }>;

    // Apply search filter on server side if provided
    if (search) {
      const searchLower = search.toLowerCase();
      customers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.phone?.toLowerCase().includes(searchLower)
      );
    }

    return successResponse({
      customers,
      count: customers.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return errorResponse('Failed to fetch customers');
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: NextRequest) {
  const auth = validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error!);
  }

  try {
    const db = getAdminDb();
    const body = await request.json();

    const { name, email, phone, address, status, customFields } = body;

    if (!name || typeof name !== 'string') {
      return errorResponse('Invalid or missing customer name', 400);
    }

    // Check if customer with same name already exists
    const existingQuery = await db.collection('customers')
      .where('name', '==', name)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      // Update existing customer instead
      const existingDoc = existingQuery.docs[0];
      const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };

      if (email) updates.email = email;
      if (phone) updates.phone = phone;
      if (address) updates.address = address;
      if (status) updates.status = status;
      if (customFields) {
        const existingCustomFields = existingDoc.data().customFields || {};
        updates.customFields = { ...existingCustomFields, ...customFields };
      }

      await existingDoc.ref.update(updates);

      return successResponse({
        id: existingDoc.id,
        message: 'Customer updated (already exists)',
        updated: true,
      });
    }

    // Create new customer document
    const customerData = {
      name,
      email: email || '',
      phone: phone || '',
      address: address || '',
      status: status || 'active',
      customFields: customFields || {},
      totalSpent: 0,
      orderCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await db.collection('customers').add(customerData);

    return successResponse({
      id: docRef.id,
      message: 'Customer created successfully',
    }, 201);
  } catch (error) {
    console.error('Error creating customer:', error);
    return errorResponse('Failed to create customer');
  }
}

// PUT /api/customers - Update a customer
export async function PUT(request: NextRequest) {
  const auth = validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error!);
  }

  try {
    const db = getAdminDb();
    const body = await request.json();
    const { id, customFields, ...updates } = body;

    if (!id) {
      return errorResponse('Missing customer id', 400);
    }

    // Validate status if provided
    if (updates.status && !['active', 'inactive'].includes(updates.status)) {
      return errorResponse('Invalid status. Must be active or inactive', 400);
    }

    const docRef = db.collection('customers').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return errorResponse('Customer not found', 404);
    }

    // Merge custom fields
    const existingData = doc.data();
    const mergedCustomFields = customFields
      ? { ...(existingData?.customFields || {}), ...customFields }
      : existingData?.customFields;

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await docRef.update({
      ...cleanUpdates,
      customFields: mergedCustomFields,
      updatedAt: Timestamp.now(),
    });

    return successResponse({
      id,
      message: 'Customer updated successfully',
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return errorResponse('Failed to update customer');
  }
}

// DELETE /api/customers - Delete a customer
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
      return errorResponse('Missing customer id', 400);
    }

    const docRef = db.collection('customers').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return errorResponse('Customer not found', 404);
    }

    await docRef.delete();

    return successResponse({
      id,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return errorResponse('Failed to delete customer');
  }
}
