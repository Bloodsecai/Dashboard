import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

// GET - List activities
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const db = getAdminDb();
    let query = db.collection('activities').orderBy('createdAt', 'desc');

    if (type) {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.limit(limit).offset(offset).get();

    const activities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({
      success: true,
      data: activities,
      count: activities.length,
    });
  } catch (error) {
    console.error('Activities GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

// POST - Create activity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, description, salesId, customerId } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Activity type is required' },
        { status: 400 }
      );
    }

    const validTypes = ['email', 'call', 'meeting', 'follow-up', 'other'];
    if (!validTypes.includes(type.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: `Invalid activity type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const activityData = {
      type: type.toLowerCase(),
      description: description || null,
      salesId: salesId || null,
      customerId: customerId || null,
      createdAt: Timestamp.now(),
    };

    const docRef = await db.collection('activities').add(activityData);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: 'Activity created successfully',
    });
  } catch (error) {
    console.error('Activities POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}

// DELETE - Delete activity
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    await db.collection('activities').doc(id).delete();

    return NextResponse.json({
      success: true,
      id,
      message: 'Activity deleted successfully',
    });
  } catch (error) {
    console.error('Activities DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete activity' },
      { status: 500 }
    );
  }
}
