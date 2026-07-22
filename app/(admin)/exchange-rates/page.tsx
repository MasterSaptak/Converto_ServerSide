import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ArrowRightLeft, Save, RefreshCw, Plus, TrendingUp, TrendingDown, Globe, Shield, History, Wallet } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from '@/lib/audit'
import type { FeeType } from '@/modules/exchange/types'
import { RatesManager } from './components/rates-manager'

// -----------------------------------------------
// Server Action: Update a corridor
// -----------------------------------------------
async function updateCorridor(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const custom_rate = parseFloat(formData.get('custom_rate') as string)
  const fee_type = formData.get('fee_type') as FeeType
  const fee_flat = parseFloat(formData.get('fee_flat') as string) || 0
  const fee_percentage = parseFloat(formData.get('fee_percentage') as string) || 0
  const minimum_amount = parseFloat(formData.get('minimum_amount') as string) || 100
  const maximum_amount = parseFloat(formData.get('maximum_amount') as string) || 1000000
  const is_active = formData.get('is_active') === 'true'
  const notes = formData.get('notes') as string || ''
  const change_reason = formData.get('change_reason') as string || ''

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { data: oldPair } = await supabase.from('transfer_corridors').select('*').eq('id', id).single()

  await supabase
    .from('transfer_corridors')
    .update({
      custom_rate, fee_type, fee_flat, fee_percentage, minimum_amount, maximum_amount, is_active, notes,
      updated_at: new Date().toISOString(), updated_by: user?.id || null,
    })
    .eq('id', id)

  if (oldPair) {
    await supabase.from('exchange_rate_history').insert({
      pair_id: id,
      old_market_rate: oldPair.market_rate, new_market_rate: oldPair.market_rate,
      old_custom_rate: oldPair.custom_rate, new_custom_rate: custom_rate,
      old_fee_flat: oldPair.fee_flat, new_fee_flat: fee_flat,
      old_fee_percentage: oldPair.fee_percentage, new_fee_percentage: fee_percentage,
      changed_by: user?.id || null, change_reason: change_reason || null,
    })

    await logAuditAction({
      action: 'UPDATE_TRANSFER_CORRIDOR', entity_type: 'transfer_corridors', entity_id: id,
      old_data: { custom_rate: oldPair.custom_rate }, new_data: { custom_rate, change_reason }
    })
  }

  revalidatePath('/exchange-rates')
}

// -----------------------------------------------
// Server Action: Add new corridor
// -----------------------------------------------
async function addCorridor(formData: FormData) {
  'use server'
  const from_country = formData.get('from_country') as string
  const to_country = formData.get('to_country') as string
  const from_currency = (formData.get('from_currency') as string).toUpperCase()
  const to_currency = (formData.get('to_currency') as string).toUpperCase()
  const custom_rate = parseFloat(formData.get('custom_rate') as string) || 0
  const fee_type = formData.get('fee_type') as FeeType || 'flat'
  const fee_flat = parseFloat(formData.get('fee_flat') as string) || 0
  const fee_percentage = parseFloat(formData.get('fee_percentage') as string) || 0

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { data: newCorridor } = await supabase
    .from('transfer_corridors')
    .insert({
      from_country, to_country, from_currency, to_currency,
      market_rate: 0, custom_rate, fee_type, fee_flat, fee_percentage,
      minimum_amount: 100, maximum_amount: 1000000, is_active: true,
      updated_by: user?.id || null, notes: `New corridor added by admin`,
    })
    .select()
    .single()

  revalidatePath('/exchange-rates')
}

export default async function ExchangeRatesPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: corridors } = await supabase
    .from('transfer_corridors')
    .select(`
      *,
      corridor_send_methods ( transfer_methods (id, name) ),
      corridor_receive_methods ( transfer_methods (id, name) )
    `)
    .order('from_country', { ascending: true })
    .order('to_country', { ascending: true })
    
  const { data: transferMethods } = await supabase
    .from('transfer_methods')
    .select('*')
    .order('name', { ascending: true })

  const { data: initialCurrencyRates } = await supabase
    .from('currency_rates')
    .select('*')

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      
      {/* New Live Rates Manager */}
      <RatesManager initialRates={initialCurrencyRates || []} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase">Transfer Corridors</h2>
          <p className="text-black/60 font-bold uppercase tracking-widest text-xs mt-1">
            Manage Routes, Methods & Rates
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border-2 border-black p-4 bg-white">
          <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Corridors</div>
          <div className="text-3xl font-black font-mono mt-1">{corridors?.length || 0}</div>
        </div>
        <div className="border-2 border-black p-4 bg-[#00FF66]">
          <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Active</div>
          <div className="text-3xl font-black font-mono mt-1">{corridors?.filter((p: any) => p.is_active).length || 0}</div>
        </div>
        <div className="border-2 border-black p-4 bg-[#FF90E8]">
          <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Payment Methods</div>
          <div className="text-3xl font-black font-mono mt-1">{transferMethods?.length || 0}</div>
        </div>
      </div>

      <details className="border-2 border-black bg-white group">
        <summary className="p-4 cursor-pointer flex items-center gap-3 font-black uppercase tracking-widest text-sm hover:bg-slate-50 transition-colors">
          <Plus className="w-5 h-5" />
          Add New Transfer Corridor
        </summary>
        <form action={addCorridor} className="p-6 border-t-2 border-black space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 border-b-2 border-black/10 pb-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">From Country</label>
              <input name="from_country" placeholder="India" required className="w-full bg-slate-50 p-3 border-2 border-black font-bold outline-none focus:ring-2 ring-primary uppercase" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">From Currency</label>
              <input name="from_currency" placeholder="INR" required className="w-full bg-slate-50 p-3 border-2 border-black font-mono font-bold outline-none focus:ring-2 ring-primary uppercase" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">To Country</label>
              <input name="to_country" placeholder="Bangladesh" required className="w-full bg-slate-50 p-3 border-2 border-black font-bold outline-none focus:ring-2 ring-primary uppercase" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">To Currency</label>
              <input name="to_currency" placeholder="BDT" required className="w-full bg-slate-50 p-3 border-2 border-black font-mono font-bold outline-none focus:ring-2 ring-primary uppercase" />
            </div>
          </div>


          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Custom Rate</label>
              <input name="custom_rate" type="number" step="0.0001" required placeholder="1.2000" className="w-full bg-slate-50 p-3 border-2 border-black font-mono font-bold outline-none focus:ring-2 ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Fee Type</label>
              <select name="fee_type" className="w-full bg-slate-50 p-3 border-2 border-black font-bold outline-none">
                <option value="flat">Flat Fee</option>
                <option value="percentage">Percentage</option>
                <option value="hybrid">Flat + Percentage</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Flat Fee</label>
              <input name="fee_flat" type="number" step="0.01" defaultValue="0" className="w-full bg-slate-50 p-3 border-2 border-black font-mono font-bold outline-none focus:ring-2 ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Fee %</label>
              <input name="fee_percentage" type="number" step="0.01" defaultValue="0" className="w-full bg-slate-50 p-3 border-2 border-black font-mono font-bold outline-none focus:ring-2 ring-primary" />
            </div>
          </div>
          <button type="submit" className="brutal-button bg-black text-white px-8 py-3 flex items-center gap-2">
            <Plus className="w-5 h-5" /> Create Corridor
          </button>
        </form>
      </details>

      {(!corridors || corridors.length === 0) ? (
        <div className="col-span-full p-8 border-2 border-dashed border-black/20 text-center font-bold opacity-50 uppercase tracking-widest">
          No transfer corridors configured.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {corridors.map((corridor: any) => {
            const sendMethods = corridor.corridor_send_methods?.map((m: any) => m.transfer_methods) || []
            const receiveMethods = corridor.corridor_receive_methods?.map((m: any) => m.transfer_methods) || []
            
            const rateGap = corridor.market_rate > 0
              ? ((corridor.market_rate - corridor.custom_rate) / corridor.market_rate * 100).toFixed(1)
              : '—'

            return (
              <div key={corridor.id} className={`border-2 border-black bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)] ${!corridor.is_active ? 'opacity-60 grayscale' : ''}`}>
                <div className="flex justify-between items-center p-4 border-b-2 border-black bg-slate-50">
                  <div className="flex items-center gap-3">
                    <ArrowRightLeft className="w-5 h-5" />
                    <div>
                      <h3 className="font-black uppercase tracking-tight text-lg leading-tight">
                        {corridor.from_country} → {corridor.to_country}
                      </h3>
                      <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                        {corridor.from_currency} to {corridor.to_currency}
                      </div>
                    </div>
                  </div>
                  <div className={`text-[10px] font-black uppercase px-2 py-0.5 border-2 border-black ${corridor.is_active ? 'bg-[#00FF66] text-black' : 'bg-slate-200'}`}>
                    {corridor.is_active ? 'Active' : 'Disabled'}
                  </div>
                </div>

                {/* Rate Comparison */}
                <div className="p-4 border-b-2 border-black grid grid-cols-2 gap-3 bg-white">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Market Rate
                    </div>
                    <div className="font-mono font-black text-lg opacity-60">{Number(corridor.market_rate).toFixed(4)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Converto Rate
                    </div>
                    <div className="font-mono font-black text-lg text-emerald-600">{Number(corridor.custom_rate).toFixed(4)}</div>
                  </div>
                </div>

                {/* Edit Form */}
                <form action={updateCorridor} className="p-4 space-y-4">
                  <input type="hidden" name="id" value={corridor.id} />



                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Converto Rate</label>
                    <input type="number" name="custom_rate" step="0.0001" defaultValue={corridor.custom_rate}
                      className="w-full bg-slate-50 p-2.5 border-2 border-black font-mono font-bold outline-none focus:ring-2 ring-primary text-sm" />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Fee Type</label>
                      <select name="fee_type" defaultValue={corridor.fee_type}
                        className="w-full bg-slate-50 p-2.5 border-2 border-black font-bold outline-none text-xs">
                        <option value="flat">Flat</option>
                        <option value="percentage">%</option>
                        <option value="hybrid">Flat+%</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Flat Fee</label>
                      <input type="number" name="fee_flat" step="0.01" defaultValue={corridor.fee_flat}
                        className="w-full bg-slate-50 p-2.5 border-2 border-black font-mono font-bold outline-none focus:ring-2 ring-primary text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Fee %</label>
                      <input type="number" name="fee_percentage" step="0.01" defaultValue={corridor.fee_percentage}
                        className="w-full bg-slate-50 p-2.5 border-2 border-black font-mono font-bold outline-none focus:ring-2 ring-primary text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Min Amount</label>
                      <input type="number" name="minimum_amount" step="1" defaultValue={corridor.minimum_amount}
                        className="w-full bg-slate-50 p-2.5 border-2 border-black font-mono font-bold outline-none focus:ring-2 ring-primary text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Max Amount</label>
                      <input type="number" name="maximum_amount" step="1" defaultValue={corridor.maximum_amount}
                        className="w-full bg-slate-50 p-2.5 border-2 border-black font-mono font-bold outline-none focus:ring-2 ring-primary text-sm" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Change Reason (Audit)</label>
                    <input type="text" name="change_reason"
                      className="w-full bg-slate-50 p-2.5 border-2 border-black font-bold outline-none focus:ring-2 ring-primary text-sm" placeholder="e.g., Adjusted rate for better margin" />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t-2 border-black/10">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Active</label>
                      <select name="is_active" defaultValue={corridor.is_active ? 'true' : 'false'}
                        className="bg-slate-50 p-1 border-2 border-black font-bold outline-none text-xs">
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <button type="submit" className="px-4 py-2 border-2 border-black bg-black text-white hover:bg-white hover:text-black transition-colors font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                      <Save className="w-4 h-4" /> Save Setup
                    </button>
                  </div>
                </form>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
