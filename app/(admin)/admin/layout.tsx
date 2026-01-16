'use client'

import { Suspense } from 'react'
import { Sidebar } from '@/components/admin/sidebar'
import { Header } from '@/components/admin/header'
import { PermissionErrorHandler } from '@/components/admin/permission-error-handler'
import { useState } from 'react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  return (
    <div className="flex h-screen bg-gray-50">
      <Suspense fallback={null}>
        <PermissionErrorHandler />
      </Suspense>
      
      {/* Sidebar */}
      <Sidebar 
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
