import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ServiceModal, DeactivateButton } from './components/service-modal'
import { CheckCircle2, XCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ServicesRegistryPage() {
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

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b-4 border-foreground pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Service Registry</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs mt-1">
            Manage Platform Services and Modules
          </p>
        </div>
        <ServiceModal />
      </div>

      <div className="border-4 border-foreground bg-card overflow-x-auto shadow-[8px_8px_0px_var(--color-foreground)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-accent text-accent-foreground border-b-4 border-foreground">
              <th className="p-4 font-black uppercase tracking-widest text-xs">Service Name</th>
              <th className="p-4 font-black uppercase tracking-widest text-xs">Code / Slug</th>
              <th className="p-4 font-black uppercase tracking-widest text-xs">Color</th>
              <th className="p-4 font-black uppercase tracking-widest text-xs">Route</th>
              <th className="p-4 font-black uppercase tracking-widest text-xs text-center">Status</th>
              <th className="p-4 font-black uppercase tracking-widest text-xs text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-foreground">
            {services?.map((service) => (
              <tr key={service.id} className="group hover:bg-muted/50 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-sm uppercase">{service.name}</div>
                  <div className="text-[10px] text-muted-foreground font-bold tracking-widest mt-1">
                    Sort: {service.sort_order}
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-mono text-xs font-bold">{service.code}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">Slug: {service.slug}</div>
                </td>
                <td className="p-4">
                  {service.color ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-foreground" style={{ backgroundColor: service.color }} />
                      <span className="text-xs font-mono">{service.color}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-4">
                  <span className="font-mono text-xs bg-muted px-2 py-1 border-2 border-foreground">
                    {service.route || '-'}
                  </span>
                </td>
                <td className="p-4 text-center">
                  {service.is_active ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-emerald-600">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-red-600">
                      <XCircle className="w-3 h-3" /> Inactive
                    </span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <ServiceModal service={service} />
                    <DeactivateButton id={service.id} isActive={service.is_active} />
                  </div>
                </td>
              </tr>
            ))}
            
            {(!services || services.length === 0) && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground font-bold uppercase tracking-widest text-sm">
                  No services found. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
