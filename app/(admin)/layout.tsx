import { Sidebar } from '@/components/admin/sidebar'
import { Header } from '@/components/admin/header'
import { AdminProvider } from '@/components/admin/admin-provider'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminProvider>
      <div className="flex h-screen bg-background font-sans selection:bg-accent selection:text-foreground">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-8 bg-card">
            {children}
          </main>
        </div>
      </div>
    </AdminProvider>
  )
}
