import { SidebarServer } from '@/components/admin/sidebar-server'
import { Header } from '@/components/admin/header'
import { AdminProvider } from '@/components/admin/admin-provider'
import { RealtimeNotifications } from '@/components/admin/realtime-notifications'
import { Toaster } from 'react-hot-toast'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminProvider>
      <div className="flex h-screen bg-background font-sans selection:bg-accent selection:text-foreground">
        <SidebarServer />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto p-3 md:p-5 bg-card">
            {children}
          </main>
        </div>
      </div>
      <RealtimeNotifications />
      <Toaster />
    </AdminProvider>
  )
}
