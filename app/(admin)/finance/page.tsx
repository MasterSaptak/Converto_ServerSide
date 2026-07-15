import { 
  BarChart3, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  TrendingUp, 
  DollarSign, 
  Euro, 
  Banknote,
  Search
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

const MOCK_WALLETS = [
  { id: 'W-001', customer: 'Alice Johnson', currency: 'USD', balance: '$12,450.00', status: 'Active' },
  { id: 'W-002', customer: 'Bob Smith', currency: 'NGN', balance: '₦4,500,000.00', status: 'Active' },
  { id: 'W-003', customer: 'Charlie Davis', currency: 'EUR', balance: '€2,100.00', status: 'Active' },
]

const MOCK_EXCHANGE_RATES = [
  { pair: 'USD/NGN', buy: '1,500.00', sell: '1,550.00', change: '+2.5%', color: 'text-green-600' },
  { pair: 'EUR/NGN', buy: '1,620.00', sell: '1,670.00', change: '-1.2%', color: 'text-red-600' },
  { pair: 'GBP/NGN', buy: '1,880.00', sell: '1,930.00', change: '+0.8%', color: 'text-green-600' },
]

export default function FinancePage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase">Finance & Treasury</h2>
          <p className="text-black/60 font-bold uppercase tracking-widest text-xs mt-1">Manage Wallets, Exchange Rates, and Transactions</p>
        </div>
        <div className="flex gap-4">
           <button className="brutal-button bg-white">
             Export CSV
           </button>
           <button className="brutal-button">
             New Rate Update
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Market Rates Card */}
        <div className="lg:col-span-1 space-y-6">
           <div className="brutal-card bg-black text-white p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-black uppercase text-sm border-b-2 border-white/20 pb-2 flex-1">Global Rates</h3>
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div className="space-y-4">
                {MOCK_EXCHANGE_RATES.map((rate) => (
                  <div key={rate.pair} className="flex flex-col gap-1 border-b-2 border-white/5 pb-2 last:border-0">
                    <div className="flex items-center justify-between">
                       <span className="font-black text-lg">{rate.pair}</span>
                       <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 border-2 border-white/20", rate.change.startsWith('+') ? "bg-green-600" : "bg-red-600")}>
                          {rate.change}
                       </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-white/50">
                       <span>SELL: {rate.sell}</span>
                       <span>BUY: {rate.buy}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full py-3 bg-accent text-black font-black uppercase text-xs border-2 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all">
                Update All Rates
              </button>
           </div>

           <div className="brutal-card bg-white p-6 space-y-4">
              <h3 className="font-black uppercase text-sm border-b-2 border-black pb-2">Top Cryptos</h3>
              <div className="space-y-4">
                 {[
                   { name: 'BTC/USD', price: '$64,250.00', change: '+2.4%' },
                   { name: 'ETH/USD', price: '$3,450.00', change: '+1.8%' },
                   { name: 'USDT/NGN', price: '₦1,540.00', change: '+0.5%' },
                 ].map(crypto => (
                   <div key={crypto.name} className="flex items-center justify-between font-bold">
                      <span className="text-xs uppercase tracking-tight">{crypto.name}</span>
                      <span className="text-sm font-black">{crypto.price}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Wallets & Transactions */}
        <div className="lg:col-span-3">
           <div className="brutal-card bg-white overflow-hidden min-h-[600px] flex flex-col">
              <Tabs defaultValue="wallets" className="flex-1 flex flex-col">
                 <TabsList className="bg-slate-50 border-b-4 border-black rounded-none p-0 h-16 w-full">
                    <TabsTrigger value="wallets" className="flex-1 h-full rounded-none font-black uppercase text-xs data-[state=active]:bg-accent data-[state=active]:border-r-4 data-[state=active]:border-black">
                       User Wallets
                    </TabsTrigger>
                    <TabsTrigger value="transactions" className="flex-1 h-full rounded-none font-black uppercase text-xs data-[state=active]:bg-accent data-[state=active]:border-l-4 data-[state=active]:border-black">
                       Global Ledger
                    </TabsTrigger>
                 </TabsList>
                 
                 <TabsContent value="wallets" className="flex-1 p-0 m-0 overflow-auto">
                    <div className="p-4 border-b-2 border-black flex items-center justify-between bg-white">
                       <div className="relative max-w-md w-full">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                          <input type="text" placeholder="Search wallets by ID or Customer..." className="brutal-input w-full pl-10 h-10" />
                       </div>
                       <div className="flex gap-2">
                          <button className="p-2 border-2 border-black hover:bg-slate-50">
                             <RefreshCw className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                    <table className="w-full text-left">
                       <thead>
                          <tr className="border-b-4 border-black bg-slate-50">
                             <th className="p-4 font-black uppercase text-xs">Wallet ID</th>
                             <th className="p-4 font-black uppercase text-xs">Customer</th>
                             <th className="p-4 font-black uppercase text-xs">Currency</th>
                             <th className="p-4 font-black uppercase text-xs">Balance</th>
                             <th className="p-4 font-black uppercase text-xs text-right">Actions</th>
                          </tr>
                       </thead>
                       <tbody>
                          {MOCK_WALLETS.map((wallet) => (
                             <tr key={wallet.id} className="border-b-2 border-black last:border-0 hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-black">{wallet.id}</td>
                                <td className="p-4 font-bold">{wallet.customer}</td>
                                <td className="p-4 uppercase">
                                   <Badge variant="outline" className="border-2 border-black rounded-none font-black">{wallet.currency}</Badge>
                                </td>
                                <td className="p-4 font-black text-lg">{wallet.balance}</td>
                                <td className="p-4 text-right">
                                   <div className="flex items-center justify-end gap-2">
                                      <button className="px-3 py-1 border-2 border-black font-black text-[10px] uppercase hover:bg-black hover:text-white transition-all">Credit</button>
                                      <button className="px-3 py-1 border-2 border-black font-black text-[10px] uppercase hover:bg-black hover:text-white transition-all">Debit</button>
                                   </div>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </TabsContent>

                 <TabsContent value="transactions" className="flex-1 p-0 m-0">
                    <div className="p-12 text-center space-y-4">
                       <Banknote className="w-16 h-16 text-black/20 mx-auto" />
                       <div className="space-y-1">
                          <h4 className="font-black uppercase text-xl">Loading Ledger Data...</h4>
                          <p className="text-sm font-bold text-black/50">Fetching global transaction history from the database.</p>
                       </div>
                    </div>
                 </TabsContent>
              </Tabs>
           </div>
        </div>
      </div>
    </div>
  )
}
