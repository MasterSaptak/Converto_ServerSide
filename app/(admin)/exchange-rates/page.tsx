import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ArrowRightLeft, Settings, Save, RefreshCw } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from '@/lib/audit'

async function updateExchangeRate(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const rate = parseFloat(formData.get('rate') as string)
  const margin = parseFloat(formData.get('margin') as string)
  
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      },
    }
  )

  // Fetch old data for audit
  const { data: oldRate } = await supabase
    .from('exchange_rates')
    .select('*')
    .eq('id', id)
    .single()

  await supabase
    .from('exchange_rates')
    .update({ 
      rate: rate, 
      margin_percentage: margin,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  // Log to audit
  if (oldRate) {
    await logAuditAction({
      action: 'UPDATE_EXCHANGE_RATE',
      entity_type: 'exchange_rates',
      entity_id: id,
      old_data: { rate: oldRate.rate, margin_percentage: oldRate.margin_percentage },
      new_data: { rate, margin_percentage: margin }
    })
  }

  revalidatePath('/exchange-rates')
}

export default async function ExchangeRatesPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      },
    }
  )

  const { data: rates } = await supabase
    .from('exchange_rates')
    .select('*')
    .order('from_currency', { ascending: true })

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase">Exchange Rates</h2>
          <p className="text-black/60 font-bold uppercase tracking-widest text-xs mt-1">Manage Currencies & Margins</p>
        </div>
        <button className="brutal-button bg-white p-3 flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          <span className="text-xs font-black uppercase">Sync API</span>
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(!rates || rates.length === 0) ? (
          <div className="col-span-full p-8 border-2 border-dashed border-black/20 text-center font-bold opacity-50 uppercase tracking-widest">
            No exchange rates configured. Please run migration schema_v6.
          </div>
        ) : (
          rates.map((ratePair: any) => (
            <div key={ratePair.id} className="brutal-card bg-white p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2">
                  <div className="font-black text-2xl font-mono">{ratePair.from_currency}</div>
                  <ArrowRightLeft className="w-4 h-4 opacity-40" />
                  <div className="font-black text-2xl font-mono">{ratePair.to_currency}</div>
                </div>
                <div className={`text-[10px] font-black uppercase px-2 py-0.5 border-2 border-black ${ratePair.is_active ? 'bg-[#00FF66] text-black' : 'bg-slate-200 opacity-50'}`}>
                  {ratePair.is_active ? 'Active' : 'Disabled'}
                </div>
              </div>

              <form action={updateExchangeRate} className="space-y-4">
                <input type="hidden" name="id" value={ratePair.id} />
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Base Rate</label>
                  <input 
                    type="number" 
                    name="rate" 
                    step="0.000001" 
                    defaultValue={ratePair.rate} 
                    className="w-full bg-slate-50 p-3 border-2 border-black font-mono font-bold outline-none focus:ring-2 ring-primary"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Margin (%)</label>
                  <div className="flex items-center">
                    <input 
                      type="number" 
                      name="margin" 
                      step="0.01" 
                      defaultValue={ratePair.margin_percentage} 
                      className="w-full bg-slate-50 p-3 border-y-2 border-l-2 border-black font-mono font-bold outline-none focus:ring-2 ring-primary"
                    />
                    <div className="bg-black text-white p-3 border-y-2 border-r-2 border-black font-black">%</div>
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-black/10 mt-4 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Customer Rate</span>
                    <span className="font-black font-mono text-lg text-primary">
                      {(ratePair.rate * (1 - (ratePair.margin_percentage / 100))).toFixed(6)}
                    </span>
                  </div>
                  <button type="submit" className="p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors group">
                    <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
