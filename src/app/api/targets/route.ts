import { NextRequest, NextResponse } from 'next/server';
import { getTargets, updateTargets } from '@/services/dashboard';

// GET - Get current targets
export async function GET() {
  try {
    const targets = await getTargets();

    return NextResponse.json({
      success: true,
      data: targets,
    });
  } catch (error) {
    console.error('Targets GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch targets' },
      { status: 500 }
    );
  }
}

// PUT - Update targets
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { monthlyRevenue, targetCustomers, targetCalls, targetDeals, targetConversionRate } = body;

    const updates: Record<string, number> = {};

    if (monthlyRevenue !== undefined) updates.monthlyRevenue = Number(monthlyRevenue);
    if (targetCustomers !== undefined) updates.targetCustomers = Number(targetCustomers);
    if (targetCalls !== undefined) updates.targetCalls = Number(targetCalls);
    if (targetDeals !== undefined) updates.targetDeals = Number(targetDeals);
    if (targetConversionRate !== undefined) updates.targetConversionRate = Number(targetConversionRate);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid target fields provided' },
        { status: 400 }
      );
    }

    await updateTargets(updates);

    return NextResponse.json({
      success: true,
      message: 'Targets updated successfully',
    });
  } catch (error) {
    console.error('Targets PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update targets' },
      { status: 500 }
    );
  }
}
