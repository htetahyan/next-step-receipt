import { NextResponse } from 'next/server';
import { processAutoCloseVisas } from '@/scripts/auto-close-expired-visas';

export async function POST(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('x-cron-secret');
    
    if (cronSecret && authHeader !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const closedCount = await processAutoCloseVisas();
    
    return NextResponse.json({ 
      success: true, 
      closedCount 
    });
  } catch (error: any) {
    console.error('Error auto-closing visas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
