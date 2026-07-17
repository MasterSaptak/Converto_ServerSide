import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ArrowLeft, User, Wallet, FileText, ArrowUpRight, History } from 'lucide-react'
import { notFound } from 'next/navigation'

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  // Fetch Customer Profile
  const { data: customer } = await supabase
    .from('profiles')
    .select('*, wallets(*, wallet_accounts(*))')
    .eq('id', id)
    .single()

  if (!customer) {
    notFound()
  }

  // Fetch Orders
  const { data: orders } = await supabase
    .from('service_requests')
    .select('*, service:services(*)')
    .eq('profile_id', id)
    .order('created_at', { ascending: false })

  // Fetch Documents
  const { data: documents } = await supabase
    .from('documents')
    .select('*, document_type:document_types(*)')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Link href="/customers" className="brutal-button p-3 bg-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-4xl font-black tracking-tight uppercase">Customer Profile</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="font-mono text-black/60 font-bold uppercase tracking-widest text-[10px]">ID: {customer.id}</span>
            <span className="border-2 px-2 py-0.5 font-black uppercase text-[10px] tracking-widest bg-accent">
              Verified
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_2fr] gap-8">
        
        {/* Left Column - Overview & Wallets */}
        <div className="space-y-8">
          <div className="brutal-card bg-white p-6 md:p-8">
             <div className="flex items-center gap-2 mb-6 border-b-4 border-black pb-2">
                <User className="w-5 h-5" />
                <h3 className="font-black uppercase tracking-widest text-sm">
                  Overview
                </h3>
             </div>
            
             <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Full Name</span>
                  <p className="font-black text-xl">{customer.full_name || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Email</span>
                  <p className="font-bold">{customer.email || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Phone</span>
                  <p className="font-bold">{customer.phone || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Country</span>
                  <p className="font-bold">{customer.country || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Joined</span>
                  <p className="font-bold text-xs">{new Date(customer.created_at).toLocaleDateString()}</p>
                </div>
             </div>
          </div>

          <div className="brutal-card bg-accent p-6 md:p-8">
             <div className="flex items-center gap-2 mb-6 border-b-4 border-black pb-2">
                <Wallet className="w-5 h-5" />
                <h3 className="font-black uppercase tracking-widest text-sm">
                  Wallets & Balances
                </h3>
             </div>

             <div className="space-y-4">
                {(!customer.wallets || customer.wallets.length === 0) ? (
                  <p className="text-xs font-bold uppercase opacity-50 text-center py-4">No wallet found</p>
                ) : (
                  customer.wallets.map((wallet: any) => (
                    <div key={wallet.id} className="space-y-4">
                      {(!wallet.wallet_accounts || wallet.wallet_accounts.length === 0) ? (
                        <p className="text-xs font-bold uppercase opacity-50">No accounts open</p>
                      ) : (
                        wallet.wallet_accounts.map((account: any) => (
                          <div key={account.id} className="flex justify-between items-center border-2 border-black p-3 bg-white">
                            <span className="font-black font-mono text-xl">{account.currency}</span>
                            <span className="font-bold text-lg">{account.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                          </div>
                        ))
                      )}
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>

        {/* Right Column - Orders & Documents */}
        <div className="space-y-8">
          
          <div className="brutal-card bg-white p-6 md:p-8">
             <div className="flex items-center justify-between mb-6 border-b-4 border-black pb-2">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  <h3 className="font-black uppercase tracking-widest text-sm">
                    Order History
                  </h3>
                </div>
             </div>
             
             <div className="space-y-3">
               {(!orders || orders.length === 0) ? (
                 <p className="text-xs font-bold uppercase opacity-50 text-center py-8 border-2 border-dashed border-black/20">No orders found</p>
               ) : (
                 orders.map((order: any) => (
                   <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-2 border-black bg-slate-50 gap-4 group hover:bg-black hover:text-white transition-colors">
                     <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black uppercase text-xs">{order.service?.name}</span>
                          <span className="text-[10px] font-bold uppercase bg-white text-black px-1 border border-black">{order.status}</span>
                        </div>
                        <span className="font-mono text-[10px] opacity-60">ID: {order.id} | {new Date(order.created_at).toLocaleDateString()}</span>
                     </div>
                     <div className="flex items-center gap-4">
                       <span className="font-black font-mono">
                         {order.total ? order.total.toLocaleString(undefined, {minimumFractionDigits: 2}) : (order.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} {order.currency}
                       </span>
                       <Link href={`/orders/${order.id}`} className="p-2 border-2 border-black bg-white text-black group-hover:bg-white group-hover:text-black">
                         <ArrowUpRight className="w-4 h-4" />
                       </Link>
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>

          <div className="brutal-card bg-white p-6 md:p-8">
             <div className="flex items-center gap-2 mb-6 border-b-4 border-black pb-2">
                <FileText className="w-5 h-5" />
                <h3 className="font-black uppercase tracking-widest text-sm">
                  Document Vault
                </h3>
             </div>
             
             <div className="grid sm:grid-cols-2 gap-4">
               {(!documents || documents.length === 0) ? (
                 <p className="text-xs font-bold uppercase opacity-50 text-center py-8 col-span-2 border-2 border-dashed border-black/20">No documents found</p>
               ) : (
                 documents.map((doc: any) => (
                   <a href={doc.file_url} target="_blank" rel="noopener noreferrer" key={doc.id} className="p-4 border-2 border-black bg-slate-50 flex items-center justify-between hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:-translate-x-1 cursor-pointer">
                     <div className="flex flex-col">
                        <span className="font-bold text-sm truncate max-w-[150px]">{doc.document_type?.name || doc.name || 'Document'}</span>
                        <span className="text-[10px] font-bold uppercase opacity-60 mt-1">{new Date(doc.created_at).toLocaleDateString()}</span>
                     </div>
                     <ArrowUpRight className="w-4 h-4 opacity-50" />
                   </a>
                 ))
               )}
             </div>
          </div>

        </div>

      </div>
    </div>
  )
}
