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

    // Deine minütliche Cron-Logik hier
    console.log('Minute cron job executed at:', new Date().toISOString());
    
    // Beispiel: Live-Preise aktualisieren, Alerts prüfen, etc.
    // await updateLivePrices();
    // await checkPriceAlerts();

    return NextResponse.json({ 
      success: true, 
      message: 'Minute cron job completed',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Minute cron job failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
