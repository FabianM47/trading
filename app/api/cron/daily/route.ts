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

    // Deine tägliche Cron-Logik hier
    console.log('Daily cron job executed at:', new Date().toISOString());
    
    // Beispiel: Datenbank-Cleanup, Reports generieren, etc.
    // await cleanupOldData();
    // await generateDailyReports();

    return NextResponse.json({ 
      success: true, 
      message: 'Daily cron job completed',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Daily cron job failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
