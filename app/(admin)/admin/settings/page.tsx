import { Metadata } from 'next'
import { CompanySettingsForm } from '@/components/admin/settings/company-settings-form'

export const metadata: Metadata = {
  title: 'Company Settings | Ketterly',
  description: 'Manage your company settings and preferences',
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your company information and contract terms
        </p>
      </div>

      <CompanySettingsForm />
    </div>
  )
}
