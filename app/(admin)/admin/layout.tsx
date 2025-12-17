import { Sidebar } from '@/components/admin/sidebar'
import { Header } from '@/components/admin/header'
import { QuickAddLeadButton } from '@/components/admin/quick-add-lead-button'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Quick Add Lead Button - Floating action button */}
      <QuickAddLeadButton variant="fab" />
    </div>
  )
}
