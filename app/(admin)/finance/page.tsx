import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { 
  RefreshCw, 
  TrendingUp, 
  Banknote,
  Search,
  Lock,
  Clock,
  ArrowRightLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { requireStaffRole } from '@/lib/rbac'

export default async function FinancePage() {
  await requireStaffRole(['Super Admin', 'Treasury'])
  
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

  // Execute queries concurrently
  const [
    { data: exchangeRates },
    { data: walletAccounts },
    { data: recentTransactions }
  ] = await Promise.all([
    supabase
      .from('exchange_rates')
      .select('*')
      .eq('is_active', true)
      .order('base_currency', { ascending: true }),
    supabase
      .from('wallet_accounts')
      .select('*, wallet:wallets(profile:profiles(id, full_name, email))')
      .order('currency_code', { ascending: true }),
    supabase
      .from('wallet_transactions')
      .select('*, account:wallet_accounts(currency_code, wallet:wallets(profile:profiles(full_name)))')
      .order('created_at', { ascending: false })
      .limit(100)
  ])

  // Calculate Platform Holdings (Totals per Currency)
  const holdings: Record<string, { available: number; locked: number; pending: number; total: number }> = {}
  if (walletAccounts) {
    for (const acc of walletAccounts) {
      if (!holdings[acc.currency_code]) {
        holdings[acc.currency_code] = { available: 0, locked: 0, pending: 0, total: 0 }
      }
      holdings[acc.currency_code].available += acc.available_balance || 0
      holdings[acc.currency_code].locked += acc.locked_balance || 0
      holdings[acc.currency_code].pending += acc.reserved_balance || 0
      holdings[acc.currency_code].total += (acc.available_balance || 0) + (acc.locked_balance || 0) + (acc.reserved_balance || 0)
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase">Finance & Treasury</h2>
          <p className="text-black/60 font-bold uppercase tracking-widest text-xs mt-1">Manage Wallets, Exchange Rates, and Transactions</p>
        </div>
        <div className="flex gap-4">
           <button className="brutal-button bg-white">
             Export CSV
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Rates & Platform Holdings */}
        <div className="lg:col-span-1 space-y-6">
           <div className="brutal-card bg-black text-white p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-black uppercase text-sm border-b-2 border-white/20 pb-2 flex-1">Global Rates</h3>
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div className="space-y-4">
                {(!exchangeRates || exchangeRates.length === 0) ? (
                  <div className="text-xs font-bold uppercase tracking-widest text-white/50 text-center py-4">No active rates</div>
                ) : exchangeRates.map((rate) => {
                  const customerRate = rate.rate * (1 - (rate.margin_percentage / 100))
                  
                  return (
                    <div key={rate.id} className="flex flex-col gap-1 border-b-2 border-white/5 pb-2 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-lg">{rate.from_currency}/{rate.to_currency}</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 border-2 border-white/20 bg-accent text-black">
                            {(rate.margin_percentage || 0)}% SPRD
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-white/50">
                        <span>BUY: {rate.rate.toFixed(4)}</span>
                        <span>SELL: {customerRate.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between text-[8px] uppercase tracking-widest text-white/30 mt-1">
                        <span>SRC: {rate.provider || 'MANUAL'}</span>
                        <span>UPDATED: {new Date(rate.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
           </div>

           <div className="brutal-card bg-white p-6 space-y-4">
              <h3 className="font-black uppercase text-sm border-b-2 border-black pb-2">Platform Holdings</h3>
              <div className="space-y-6">
                 {Object.entries(holdings).length === 0 ? (
                   <div className="text-xs font-bold uppercase opacity-50 text-center py-4">No funds in platform</div>
                 ) : Object.entries(holdings).map(([currency, data]) => (
                   <div key={currency} className="space-y-2 border-b-2 border-black/5 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between font-black border-b-2 border-black/10 pb-1">
                         <span className="text-sm uppercase">{currency}</span>
                         <span className="text-sm">{data.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center justify-between font-bold text-xs">
                         <span className="text-black/50 uppercase">Available</span>
                         <span className="text-green-700">{data.available.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center justify-between font-bold text-xs">
                         <span className="text-black/50 uppercase">Locked</span>
                         <span className="text-red-700">{data.locked.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Wallets & Transactions */}
        <div className="lg:col-span-3">
           <div className="brutal-card bg-white overflow-hidden min-h-[600px] flex flex-col">
              <Tabs defaultValue="wallets" className="flex-1 flex flex-col">
                 <TabsList className="bg-slate-50 border-b-4 border-black rounded-none p-0 h-16 w-full shrink-0">
                    <TabsTrigger value="wallets" className="flex-1 h-full rounded-none font-black uppercase text-xs data-[state=active]:bg-accent data-[state=active]:border-r-4 data-[state=active]:border-black">
                       User Wallets
                    </TabsTrigger>
                    <TabsTrigger value="transactions" className="flex-1 h-full rounded-none font-black uppercase text-xs data-[state=active]:bg-accent data-[state=active]:border-l-4 data-[state=active]:border-black">
                       Global Ledger
                    </TabsTrigger>
                 </TabsList>
                 
                 <TabsContent value="wallets" className="flex-1 p-0 m-0 overflow-auto">
                    <div className="p-4 border-b-2 border-black flex items-center justify-between bg-white sticky top-0 z-10">
                       <div className="relative max-w-md w-full">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                          <input type="text" placeholder="Search wallets by Customer..." className="brutal-input w-full pl-10 h-10" />
                       </div>
                    </div>
                    <table className="w-full text-left">
                       <thead className="sticky top-[74px] bg-slate-50 z-10 border-b-4 border-black shadow-sm">
                          <tr>
                             <th className="p-4 font-black uppercase text-xs">Customer</th>
                             <th className="p-4 font-black uppercase text-xs">Currency</th>
                             <th className="p-4 font-black uppercase text-xs">Available</th>
                             <th className="p-4 font-black uppercase text-xs">Locked</th>
                             <th className="p-4 font-black uppercase text-xs">Total</th>
                          </tr>
                       </thead>
                       <tbody>
                          {(!walletAccounts || walletAccounts.length === 0) ? (
                            <tr><td colSpan={5} className="p-8 text-center font-bold uppercase opacity-50">No wallet accounts yet.</td></tr>
                          ) : walletAccounts.map((account: any) => {
                             const customerName = account.wallet?.profile?.full_name || 'Unknown'
                             const total = (account.available_balance || 0) + (account.locked_balance || 0)
                             
                             return (
                               <tr key={account.id} className="border-b-2 border-black/10 hover:bg-slate-50 transition-colors">
                                  <td className="p-4">
                                     <div className="font-bold">{customerName}</div>
                                     <div className="text-[10px] text-black/40 font-black uppercase">{account.wallet?.profile?.email}</div>
                                  </td>
                                  <td className="p-4">
                                     <Badge variant="outline" className="border-2 border-black rounded-none font-black bg-white">{account.currency_code}</Badge>
                                  </td>
                                  <td className="p-4 font-black text-green-700">{account.available_balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                  <td className="p-4 font-black text-red-700">
                                    <div className="flex items-center gap-1">
                                      {account.locked_balance > 0 && <Lock className="w-3 h-3" />}
                                      {account.locked_balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                  </td>
                                  <td className="p-4 font-black text-lg">{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                               </tr>
                             )
                          })}
                       </tbody>
                    </table>
                 </TabsContent>

                 <TabsContent value="transactions" className="flex-1 p-0 m-0 overflow-auto">
                    <table className="w-full text-left">
                       <thead className="sticky top-0 bg-slate-50 z-10 border-b-4 border-black shadow-sm">
                          <tr>
                             <th className="p-4 font-black uppercase text-xs">Date</th>
                             <th className="p-4 font-black uppercase text-xs">Ref/Customer</th>
                             <th className="p-4 font-black uppercase text-xs">Type</th>
                             <th className="p-4 font-black uppercase text-xs">Status</th>
                             <th className="p-4 font-black uppercase text-xs text-right">Amount</th>
                          </tr>
                       </thead>
                       <tbody>
                          {(!recentTransactions || recentTransactions.length === 0) ? (
                            <tr>
                               <td colSpan={5} className="p-12 text-center">
                                  <Banknote className="w-12 h-12 text-black/20 mx-auto mb-4" />
                                  <h4 className="font-black uppercase text-lg">No Transactions Yet</h4>
                                  <p className="text-sm font-bold text-black/50">Global ledger is currently empty.</p>
                               </td>
                            </tr>
                          ) : recentTransactions.map((tx: any) => {
                            const isCredit = tx.type === 'credit'
                            const currency = tx.account?.currency_code || ''
                            const customerName = tx.account?.wallet?.profile?.full_name || 'Unknown Customer'
                            
                            return (
                               <tr key={tx.id} className="border-b-2 border-black/10 hover:bg-slate-50 transition-colors">
                                  <td className="p-4">
                                     <div className="text-sm font-bold">{new Date(tx.created_at).toLocaleDateString()}</div>
                                     <div className="text-[10px] font-black uppercase text-black/40">{new Date(tx.created_at).toLocaleTimeString()}</div>
                                  </td>
                                  <td className="p-4">
                                     <div className="font-bold text-sm truncate max-w-[200px]">{customerName}</div>
                                     <div className="text-[10px] font-black uppercase text-black/40">{tx.description || tx.reference_type || 'Manual'}</div>
                                  </td>
                                  <td className="p-4">
                                    <span className={cn(
                                      "text-[10px] font-black uppercase px-2 py-0.5 border border-black",
                                      isCredit ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
                                      tx.type === 'lock' || tx.type === 'unlock' ? "bg-orange-100 text-orange-800" : ""
                                    )}>
                                      {tx.type}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center gap-1 text-xs font-bold uppercase">
                                      {tx.status === 'completed' ? <div className="w-2 h-2 rounded-full bg-green-500" /> : <Clock className="w-3 h-3 text-yellow-500" />}
                                      {tx.status}
                                    </div>
                                  </td>
                                  <td className={cn("p-4 font-black text-right", isCredit ? "text-green-700" : "text-black")}>
                                     {isCredit ? '+' : (tx.type !== 'lock' && tx.type !== 'unlock') ? '-' : ''}
                                     {tx.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
                                  </td>
                               </tr>
                            )
                          })}
                       </tbody>
                    </table>
                 </TabsContent>
              </Tabs>
           </div>
        </div>
      </div>
    </div>
  )
}
