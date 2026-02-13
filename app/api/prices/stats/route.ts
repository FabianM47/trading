/**
 * Price Snapshot Statistics API Route
 * 
 * GET /api/prices/stats
 * 
 * Returns statistics about price snapshots
 * Used for: Monitoring, debugging, admin dashboard
 */

import { getSnapshotStats } from '@/lib/prices/snapshotJob';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const stats = await getSnapshotStats();

    return NextResponse.json({
      success: true,
      stats: {
        totalSnapshots: stats.totalSnapshots,
        uniqueInstruments: stats.uniqueInstruments,
        oldestSnapshot: stats.oldestSnapshot,
        newestSnapshot: stats.newestSnapshot,
        avgSnapshotsPerInstrument: Math.round(stats.avgSnapshotsPerInstrument * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Error fetching snapshot stats:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
