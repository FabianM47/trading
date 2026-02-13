import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Vercel Cron Secret validieren
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Deine stündliche Cron-Logik hier
    console.log('Hourly cron job executed at:', new Date().toISOString());
    
    // Beispiel: Cache aktualisieren, Daten synchronisieren, etc.
    // await updateCache();
    // await syncMarketData();

    return NextResponse.json({ 
      success: true, 
      message: 'Hourly cron job completed',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Hourly cron job failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
