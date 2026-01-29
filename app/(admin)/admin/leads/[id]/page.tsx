import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ActivityTimeline } from '@/components/admin/leads/activity-timeline'
import { AddActivityForm } from '@/components/admin/leads/add-activity-form'
import { NotesTab } from '@/components/admin/leads/notes-tab'
import { StageChecklist } from '@/components/admin/leads/stage-checklist'
import { PipelineProgress } from '@/components/admin/leads/pipeline-progress'
import { EstimatesTab } from '@/components/admin/leads/estimates-tab'
import { EventsTab } from '@/components/admin/leads/events-tab'
import { FilesTab } from '@/components/admin/leads/files-tab'
import { PhotosTab } from '@/components/admin/leads/photos-tab'
import { MeasurementsTab } from '@/components/admin/leads/measurements-tab'
import { OrdersTab } from '@/components/admin/leads/orders-tab'
import { PaymentsTab } from '@/components/admin/leads/payments-tab'
import { FinancialsTab } from '@/components/admin/leads/financials-tab'
import { CommissionsTab } from '@/components/admin/leads/commissions-tab'
import { EditableDetailsTab } from '@/components/admin/leads/editable-details-tab'
import Link from 'next/link'
import { ArrowLeft, Pencil, Phone, Mail, MapPin, FileText, Ruler, DollarSign, ClipboardList, StickyNote, CreditCard, CheckSquare, Image, TrendingUp, Banknote, Calendar, MessageSquare } from 'lucide-react'
import {
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_PRIORITY_LABELS,
  SERVICE_TYPE_LABELS,
  getStatusBadgeClasses,
  getPriorityBadgeClasses,
} from '@/lib/constants/leads'
import { format } from 'date-fns'
import { DeleteLeadButton } from '@/components/admin/leads/delete-lead-button'
import { LeadDetailClient } from '@/components/admin/leads/lead-detail-client'
import { LeadSummaryCard } from '@/components/admin/leads/lead-summary-card'
import type { Lead } from '@/lib/types'

interface LeadDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function LeadDetailPage({ params, searchParams }: LeadDetailPageProps) {
  const { id } = await params
  const { tab = 'details' } = await searchParams
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/login')
  }

  // Get user's company and permissions
  const { data: userData, error: userDataError } = await supabase
    .from('users')
    .select(`
      company_id, 
      id,
      user_permissions (*)
    `)
    .eq('id', user.id)
    .single()

  if (!userData) {
    console.error('Failed to load user data:', userDataError)
    redirect('/login')
  }

  // Extract permissions - Supabase returns object for one-to-one relationship
  const userPermissions = (userData.user_permissions as any) || null
  
  // Debug: Log permissions (remove after testing)
  console.log('User permissions loaded:', {
    userId: userData.id,
    hasPermissions: !!userPermissions,
    financialsPermission: userPermissions?.can_view_lead_financials,
    allPermissions: userPermissions
  })

  // Use admin client to fetch lead
  const adminClient = createAdminClient()
  
  // Query with explicit return type - use explicit FK names to avoid ambiguous relationships
  const leadQuery = await adminClient
    .from('leads')
    .select(`
      *,
      location:locations!leads_location_id_fkey(id, name, address, city, state, zip),
      sales_rep_user:users!leads_sales_rep_id_fkey(id, full_name, email),
      marketing_rep_user:users!leads_marketing_rep_id_fkey(id, full_name, email),
      sales_manager_user:users!leads_sales_manager_id_fkey(id, full_name, email),
      production_manager_user:users!leads_production_manager_id_fkey(id, full_name, email),
      created_user:users!leads_created_by_fkey(id, full_name, email)
    `)
    .eq('id', id)
    .eq('company_id', userData.company_id)
    .is('deleted_at', null)
    .maybeSingle()
  
  const { data: leadData, error } = leadQuery
  
  // Debug logging
  console.log('Lead query result:', {
    leadId: id,
    companyId: userData.company_id,
    foundLead: !!leadData,
    error: error?.message,
    errorDetails: error
  })
  
  if (error || !leadData) {
    console.error('Lead not found - returning 404:', { leadId: id, error })
    notFound()
  }

  const lead: any = leadData

  // Define all tabs with their permission requirements
  const allTabs = [
    { id: 'details', label: 'Details', icon: FileText, permission: 'can_view_lead_details' },
    { id: 'events', label: 'Events', icon: Calendar, permission: null }, // No specific permission - open to all
    { id: 'checklist', label: 'Status', icon: CheckSquare, permission: 'can_view_lead_checklist' },
    { id: 'measurements', label: 'Measurements', icon: Ruler, permission: 'can_view_lead_measurements' },
    { id: 'estimates', label: 'Estimates', icon: DollarSign, permission: 'can_view_lead_estimates' },
    { id: 'work-orders', label: 'Orders', icon: ClipboardList, permission: 'can_view_lead_orders' },
    { id: 'photos', label: 'Photos', icon: Image, permission: 'can_view_lead_photos' },
    { id: 'notes', label: 'Notes', icon: StickyNote, permission: 'can_view_lead_notes' },
    { id: 'documents', label: 'Documents', icon: FileText, permission: 'can_view_lead_documents' },
    { id: 'payments', label: 'Invoice/Payments', icon: CreditCard, permission: 'can_view_lead_payments' },
    { id: 'financials', label: 'Financials', icon: TrendingUp, permission: 'can_view_lead_financials' },
    { id: 'commissions', label: 'Commissions', icon: Banknote, permission: 'can_view_lead_commissions' },
  ]

  // Filter tabs based on user permissions
  const tabs = allTabs.filter((tabItem) => {
    // If no permission required, show to everyone
    if (!tabItem.permission) return true
    // If no permissions found, show all tabs (will be fixed by running fix-missing-permissions.js)
    if (!userPermissions) return true
    // Check if user has permission for this tab
    return userPermissions[tabItem.permission] === true
  })

  return (
    <div className="space-y-6 p-6">
      {/* Mobile Action Buttons */}
      <div className="flex gap-2 md:hidden">
        <a
          href={`tel:${lead.phone}`}
          className="flex-1 flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          title="Call"
        >
          <Phone className="h-6 w-6" />
        </a>
        <a
          href={`sms:${lead.phone}`}
          className="flex-1 flex items-center justify-center px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          title="Text"
        >
          <MessageSquare className="h-6 w-6" />
        </a>
        <a
          href={`mailto:${lead.email}`}
          className="flex-1 flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          title="Email"
        >
          <Mail className="h-6 w-6" />
        </a>
        {lead.address && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lead.address}, ${lead.city}, ${lead.state} ${lead.zip}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            title="Navigate"
          >
            <MapPin className="h-6 w-6" />
          </a>
        )}
      </div>

      {/* Lead Summary Card */}
      <LeadSummaryCard lead={lead} leadId={id} />

      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <nav className="flex flex-wrap" aria-label="Tabs">
          {tabs.map((tabItem) => {
            const isActive = tab === tabItem.id
            const Icon = tabItem.icon
            return (
              <Link
                key={tabItem.id}
                href={`/admin/leads/${id}?tab=${tabItem.id}`}
                className={`
                  relative flex items-center justify-center gap-2 whitespace-nowrap px-6 py-4 font-medium text-sm
                  transition-all duration-200
                  ${
                    isActive
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tabItem.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>
      {/* Tab Content */}
      <div className="pb-6">
        {tab === 'details' && (!userPermissions || userPermissions.can_view_lead_details) && <EditableDetailsTab lead={lead} />}
        {tab === 'events' && (
          <EventsTab 
            leadId={id} 
            leadName={lead.full_name}
            leadAddress={lead.address}
            leadCity={lead.city}
            leadState={lead.state}
            leadZip={lead.zip}
            leadLocationId={lead.location_id}
          />
        )}
        {tab === 'checklist' && (!userPermissions || userPermissions.can_view_lead_checklist) && <ChecklistTab leadId={id} currentStage={lead.status} />}
        {tab === 'measurements' && (!userPermissions || userPermissions.can_view_lead_measurements) && (
          <MeasurementsTab 
            leadId={id}
            address={`${lead.address}, ${lead.city}, ${lead.state} ${lead.zip}`}
            latitude={lead.latitude}
            longitude={lead.longitude}
          />
        )}
        {tab === 'estimates' && (!userPermissions || userPermissions.can_view_lead_estimates) && (
          <EstimatesTab 
            leadId={id} 
            leadName={lead.full_name}
            leadAddress={lead.address}
            leadCity={lead.city}
            leadState={lead.state}
            leadZip={lead.zip}
            latitude={lead.latitude}
            longitude={lead.longitude}
          />
        )}
        {tab === 'work-orders' && (!userPermissions || userPermissions.can_view_lead_orders) && (
          <OrdersTab 
            leadId={id} 
            leadAddress={`${lead.address}, ${lead.city}, ${lead.state} ${lead.zip}`}
          />
        )}
        {tab === 'photos' && (!userPermissions || userPermissions.can_view_lead_photos) && <PhotosTab leadId={id} leadName={lead.full_name} />}
        {tab === 'notes' && (!userPermissions || userPermissions.can_view_lead_notes) && <NotesTab leadId={id} />}
        {tab === 'documents' && (!userPermissions || userPermissions.can_view_lead_documents) && <FilesTab leadId={id} leadName={lead.full_name} />}
        {tab === 'payments' && (!userPermissions || userPermissions.can_view_lead_payments) && <PaymentsTab leadId={id} />}
        {tab === 'financials' && (!userPermissions || userPermissions.can_view_lead_financials) && <FinancialsTab leadId={id} />}
        {tab === 'commissions' && (!userPermissions || userPermissions.can_view_lead_commissions) && <CommissionsTab lead={lead} />}
      </div>
    </div>
  )
}

function DetailsTab({ lead }: { lead: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Contact Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
                {lead.email}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                {lead.phone}
              </a>
            </div>
          </div>
          {lead.address && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="text-gray-900">
                  {lead.address}
                  {lead.city && `, ${lead.city}`}
                  {lead.state && `, ${lead.state}`}
                  {lead.zip && ` ${lead.zip}`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lead Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Lead Information</h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">Source</p>
            <p className="text-gray-900 font-medium">
              {LEAD_SOURCE_LABELS[lead.source as keyof typeof LEAD_SOURCE_LABELS]}
            </p>
          </div>
          {lead.preferred_contact_method && (
            <div>
              <p className="text-sm text-gray-500">Preferred Contact</p>
              <p className="text-gray-900 font-medium capitalize">
                {lead.preferred_contact_method}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Created</p>
            <p className="text-gray-900">
              {format(new Date(lead.created_at), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Last Updated</p>
            <p className="text-gray-900">
              {format(new Date(lead.updated_at), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Team</h2>
        <div className="space-y-3">
          {(lead as any).sales_rep_user && (
            <div>
              <p className="text-sm text-gray-500">Sales Rep</p>
              <p className="text-gray-900 font-medium">
                {(lead as any).sales_rep_user.full_name}
              </p>
            </div>
          )}
          {(lead as any).marketing_rep_user && (
            <div>
              <p className="text-sm text-gray-500">Marketing Rep</p>
              <p className="text-gray-900 font-medium">
                {(lead as any).marketing_rep_user.full_name}
              </p>
            </div>
          )}
          {(lead as any).sales_manager_user && (
            <div>
              <p className="text-sm text-gray-500">Sales Manager</p>
              <p className="text-gray-900 font-medium">
                {(lead as any).sales_manager_user.full_name}
              </p>
            </div>
          )}
          {(lead as any).production_manager_user && (
            <div>
              <p className="text-sm text-gray-500">Production Manager</p>
              <p className="text-gray-900 font-medium">
                {(lead as any).production_manager_user.full_name}
              </p>
            </div>
          )}
          {!(lead as any).sales_rep_user && !(lead as any).marketing_rep_user && 
           !(lead as any).sales_manager_user && !(lead as any).production_manager_user && (
            <p className="text-gray-500 text-sm">No team members assigned</p>
          )}
        </div>
      </div>

      {/* Lead Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Lead Details</h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">Service Type</p>
            <p className="text-gray-900 font-medium">
              {SERVICE_TYPE_LABELS[lead.service_type as keyof typeof SERVICE_TYPE_LABELS] || lead.service_type}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Lead Source</p>
            <p className="text-gray-900 font-medium">
              {LEAD_SOURCE_LABELS[lead.source as keyof typeof LEAD_SOURCE_LABELS]}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Location</p>
            <p className="text-gray-900 font-medium">
              {(lead as any).location?.name || 'No Location'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="text-gray-900 font-medium">
              {LEAD_STATUS_LABELS[lead.status as keyof typeof LEAD_STATUS_LABELS] || lead.status}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Priority</p>
            <p className="text-gray-900 font-medium">
              {LEAD_PRIORITY_LABELS[lead.priority as keyof typeof LEAD_PRIORITY_LABELS] || lead.priority}
            </p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {lead.notes && (
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Notes</h2>
          <p className="text-gray-900 whitespace-pre-wrap">{lead.notes}</p>
        </div>
      )}
    </div>
  )
}

function ChecklistTab({ leadId, currentStage }: { leadId: string; currentStage: string }) {
  return (
    <div className="space-y-6">
      {/* Pipeline Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Pipeline Status</h2>
        <PipelineProgress leadId={leadId} currentStatus={currentStage} />
      </div>

      {/* Stage Checklist */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Stage Checklist</h2>
          <p className="text-gray-600">
            Track progress through each stage of the lead lifecycle. Check off items as you complete them.
          </p>
        </div>
        <StageChecklist leadId={leadId} currentStage={currentStage} />
      </div>
    </div>
  )
}

function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500 mb-4">{description}</p>
      <p className="text-sm text-gray-400">
        This feature will be implemented in future steps
      </p>
    </div>
  )
}
