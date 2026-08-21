import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const db = getDB();
    console.log('[Clear] Flushing insights and fixtures tables...');
    await db.execute('DELETE FROM insights');
    await db.execute('DELETE FROM fixtures');
    console.log('[Clear] Database successfully cleared.');

    return NextResponse.json({
      success: true,
      message: 'Database and match cache cleared successfully'
    });
  } catch (err: any) {
    console.error('[Clear] Failed to clear database:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to clear database'
    }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
