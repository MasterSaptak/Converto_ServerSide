import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { FileText, Download } from 'lucide-react'

export async function OrderDocuments({ orderId }: { orderId: string }) {
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

  const { data: documents } = await supabase
    .from('documents')
    .select('*, document_type:document_types(*)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  return (
    <div className="brutal-card bg-white p-6">
      <h3 className="font-black uppercase tracking-widest text-sm mb-6 border-b-4 border-black pb-2 flex items-center gap-2">
        <FileText className="w-4 h-4" /> Documents
      </h3>
      
      <div className="space-y-4">
        {(!documents || documents.length === 0) ? (
          <p className="text-xs font-bold uppercase opacity-50 text-center py-4">No documents attached</p>
        ) : (
          documents.map((doc: any) => (
            <div key={doc.id} className="flex items-center justify-between p-3 border-2 border-black bg-slate-50">
              <div className="flex flex-col">
                <span className="font-bold text-sm">{doc.document_type?.name || 'Uploaded Document'}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  Status: <span className={doc.status === 'verified' ? 'text-green-600' : doc.status === 'rejected' ? 'text-red-600' : 'text-orange-600'}>{doc.status}</span>
                </span>
              </div>
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors bg-white">
                <Download className="w-4 h-4" />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
