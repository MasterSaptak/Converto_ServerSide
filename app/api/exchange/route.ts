import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ExchangeService } from '@/modules/exchange/service';
import { createExchangeRequestSchema } from '@/modules/exchange/validation';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const input = createExchangeRequestSchema.parse(body);
    
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const exchangeService = new ExchangeService(supabase);
    
    // Create the order via the service
    const order = await exchangeService.createExchangeRequest(user.id, input);

    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error: any) {
    console.error('API /api/exchange POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
