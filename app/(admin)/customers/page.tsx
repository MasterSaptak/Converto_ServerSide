import { Search, Plus, Mail, Phone, MapPin, MoreHorizontal, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const MOCK_CUSTOMERS = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', status: 'Active', requests: 12, spent: '$1,200', joined: 'Oct 2025' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', status: 'Inactive', requests: 2, spent: '$450', joined: 'Nov 2025' },
  { id: '3', name: 'Charlie Davis', email: 'charlie@example.com', status: 'Active', requests: 24, spent: '$5,600', joined: 'Aug 2025' },
  { id: '4', name: 'Diana Prince', email: 'diana@example.com', status: 'Active', requests: 45, spent: '$12,000', joined: 'Jan 2025' },
  { id: '5', name: 'Ethan Hunt', email: 'ethan@example.com', status: 'Active', requests: 8, spent: '$2,100', joined: 'Mar 2026' },
]

export default function CustomersPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase">Customer CRM</h2>
          <p className="text-black/60 font-bold uppercase tracking-widest text-xs mt-1">Manage Client Relationships and Account Activity</p>
        </div>
        <button className="brutal-button flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         {/* Search & Stats Sidebar */}
         <div className="md:col-span-1 space-y-6">
            <div className="brutal-card bg-white p-6 space-y-4">
               <h3 className="font-black uppercase text-sm">Quick Search</h3>
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                  <input type="text" placeholder="Name, Email, ID..." className="brutal-input w-full pl-10" />
               </div>
               <div className="pt-4 space-y-2 border-t-2 border-black/5">
                  <div className="flex items-center justify-between font-bold">
                     <span className="text-xs text-black/60">Total Customers</span>
                     <span className="text-lg">1,452</span>
                  </div>
                  <div className="flex items-center justify-between font-bold">
                     <span className="text-xs text-black/60">Active This Month</span>
                     <span className="text-lg text-green-600">842</span>
                  </div>
               </div>
            </div>

            <div className="brutal-card bg-accent p-6 space-y-4">
               <h3 className="font-black uppercase text-sm">Customer Alerts</h3>
               <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="bg-white border-2 border-black p-3 space-y-1 text-xs font-bold">
                       <p className="text-red-600">KYC Verification Required</p>
                       <p className="text-black/60 font-medium">Customer: Alice Johnson</p>
                       <button className="text-[10px] underline hover:text-red-600">Take Action</button>
                    </div>
                  ))}
               </div>
            </div>
         </div>

         {/* Customer List */}
         <div className="md:col-span-2 space-y-6">
            <div className="grid grid-cols-1 gap-4">
               {MOCK_CUSTOMERS.map(customer => (
                 <div key={customer.id} className="brutal-card bg-white p-6 flex items-center justify-between group cursor-pointer hover:bg-slate-50">
                    <div className="flex items-center gap-6">
                       <Avatar className="w-16 h-16 rounded-none border-4 border-black">
                         <AvatarImage src="" />
                         <AvatarFallback className="rounded-none font-black text-xl bg-accent">{customer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                       </Avatar>
                       <div>
                          <div className="flex items-center gap-2">
                             <h4 className="text-xl font-black uppercase">{customer.name}</h4>
                             {customer.status === 'Active' && <UserCheck className="w-4 h-4 text-green-600" />}
                          </div>
                          <p className="text-sm font-bold text-black/50">{customer.email}</p>
                          <div className="flex items-center gap-4 mt-2">
                             <span className="text-[10px] font-black uppercase bg-black text-white px-2 py-0.5">{customer.requests} Requests</span>
                             <span className="text-[10px] font-black uppercase bg-accent text-black px-2 py-0.5">{customer.spent} Spent</span>
                          </div>
                       </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <p className="text-[10px] font-black uppercase text-black/40">Joined {customer.joined}</p>
                       <button className="p-3 border-2 border-black hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]">
                          View Profile
                       </button>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  )
}
