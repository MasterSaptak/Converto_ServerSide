import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ExchangeService } from '@/modules/exchange/service';
import { createExchangeRequestSchema } from '@/modules/exchange/validation';
import { z } from 'zod';

// -----------------------------------------------
// GET /api/exchange
// Fetch active corridors, or calculate a quote
// -----------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const exchangeService = new ExchangeService(supabase);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'corridors';

    switch (action) {
      case 'corridors': {
        const corridors = await exchangeService.getActiveCorridors();
        return NextResponse.json({ data: corridors });
      }

      case 'quote': {
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const amount = parseFloat(searchParams.get('amount') || '0');
        const send_method = searchParams.get('send_method') || '';
        const receive_method = searchParams.get('receive_method') || '';

        if (!from || !to || amount <= 0) {
          return NextResponse.json(
            { error: 'Missing from, to, or valid amount' },
            { status: 400 }
          );
        }

        const quote = await exchangeService.calculateQuote(from, to, amount, send_method, receive_method);
        return NextResponse.json({ data: quote });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('API /api/exchange GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// -----------------------------------------------
// POST /api/exchange
// Create an exchange order with full snapshot
// -----------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const input = createExchangeRequestSchema.parse(body);

    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const exchangeService = new ExchangeService(supabase);

    // Create the order via the service (snapshot is built inside)
    const order = await exchangeService.createExchangeRequest(user.id, input);

    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error: any) {
    console.error('API /api/exchange POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
