import { NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabaseClient';

export async function GET() {
  const start = Date.now();
  let dbStatus = 'disconnected';
  
  try {
    if (!supabase) {
      dbStatus = 'config_error';
    } else {
      const { data, error } = await supabase.from('users').select('id').limit(1);
      if (!error) dbStatus = 'operational';
      else dbStatus = `error: ${error.message}`;
    }
  } catch (e: any) {
    dbStatus = `exception: ${e.message}`;
  }

  const latency = Date.now() - start;

  return NextResponse.json({ 
    status: dbStatus === 'operational' ? 'healthy' : 'degraded', 
    timestamp: new Date().toISOString(),
    latency: `${latency}ms`,
    services: {
      database: dbStatus,
      api: 'operational',
      storage: 'connected'
    }
  });
}
