import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ActivityTimeline } from '@/components/admin/leads/activity-timeline'
import { AddActivityForm } from '@/components/admin/leads/add-activity-form'
import { StageChecklist } from '@/components/admin/leads/stage-checklist'
import { EstimatesTab } from '@/components/admin/leads/estimates-tab'
import { FilesTab } from '@/components/admin/leads/files-tab'
import { PhotosTab } from '@/components/admin/leads/photos-tab'
import { MeasurementsTab } from '@/components/admin/leads/measurements-tab'
import { OrdersTab } from '@/components/admin/leads/orders-tab'
import { PaymentsTab } from '@/components/admin/leads/payments-tab'
import { FinancialsTab } from '@/components/admin/leads/financials-tab'
import { CommissionsTab } from '@/components/admin/leads/commissions-tab'
import Link from 'next/link'
import { ArrowLeft, Pencil, Phone, Mail, MapPin, FileText, Ruler, DollarSign, ClipboardList, StickyNote, CreditCard, Users, CheckSquare, Image, TrendingUp, Banknote } from 'lucide-react'
import {
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_PRIORITY_LABELS,
  SERVICE_TYPE_LABELS,
  getStatusBadgeClasses,
  getPriorityBadgeClasses,
} from '@/lib/constants/leads'
import { formatDistanceToNow, format } from 'date-fns'
import { DeleteLeadButton } from '@/components/admin/leads/delete-lead-button'
import { LeadDetailClient } from '@/components/admin/leads/lead-detail-client'
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

  // Get user's company
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // Use admin client to fetch lead
  const adminClient = createAdminClient()
  
  // Query with explicit return type
  const leadQuery = await adminClient
    .from('leads')
    .select(`
      *,
      assigned_to_user:users!leads_assigned_to_fkey(
        id,
        full_name,
        email
      )
    `)
    .eq('id', id)
    .eq('company_id', userData.company_id)
    .is('deleted_at', null)
    .maybeSingle()
  
  const { data: leadData, error } = leadQuery
  
  if (error || !leadData) {
    notFound()
  }

  const lead: any = leadData

  const tabs = [
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare },
    { id: 'measurements', label: 'Measurements', icon: Ruler },
    { id: 'estimates', label: 'Estimates', icon: DollarSign },
    { id: 'work-orders', label: 'Orders', icon: ClipboardList },
    { id: 'photos', label: 'Photos', icon: Image },
    { id: 'notes', label: 'Notes & Activity', icon: StickyNote },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'payments', label: 'Invoice/Payments', icon: CreditCard },
    { id: 'financials', label: 'Financials', icon: TrendingUp },
    { id: 'commissions', label: 'Commissions', icon: Banknote },
    { id: 'team', label: 'Team', icon: Users },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/leads">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{lead.full_name}</h1>
            <p className="text-gray-600 mt-1">
              Created {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/leads/${id}/edit`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <DeleteLeadButton leadId={id} leadName={lead.full_name} />
        </div>
      </div>

      {/* Live-updating client components */}
      <LeadDetailClient leadId={id} initialLead={lead} />

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-x-8 gap-y-2" aria-label="Tabs">
          {tabs.map((tabItem) => {
            const isActive = tab === tabItem.id
            const Icon = tabItem.icon
            return (
              <Link
                key={tabItem.id}
                href={`/admin/leads/${id}?tab=${tabItem.id}`}
                className={`
                  flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {tabItem.label}
              </Link>
            )
          })}
        </nav>
      </div>
      {/* Tab Content */}
      <div className="pb-6">
        {tab === 'details' && <DetailsTab lead={lead} />}
        {tab === 'checklist' && <ChecklistTab leadId={id} currentStage={lead.status} />}
        {tab === 'measurements' && (
          <MeasurementsTab 
            leadId={id}
            address={`${lead.address}, ${lead.city}, ${lead.state} ${lead.zip}`}
            latitude={lead.latitude}
            longitude={lead.longitude}
          />
        )}
        {tab === 'estimates' && (
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
        {tab === 'work-orders' && (
          <OrdersTab 
            leadId={id} 
            leadAddress={`${lead.address}, ${lead.city}, ${lead.state} ${lead.zip}`}
          />
        )}
        {tab === 'photos' && <PhotosTab leadId={id} leadName={lead.full_name} />}
        {tab === 'notes' && <ActivityTab leadId={id} />}
        {tab === 'documents' && <FilesTab leadId={id} leadName={lead.full_name} />}
        {tab === 'payments' && <PaymentsTab leadId={id} />}
        {tab === 'financials' && <FinancialsTab leadId={id} />}
        {tab === 'commissions' && <CommissionsTab lead={lead} />}
        {tab === 'team' && <PlaceholderTab title="Team" description="Assign team members and manage crew schedules" />}
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

      {/* Lead Details */}
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

function ActivityTab({ leadId }: { leadId: string }) {
  return (
    <div className="space-y-6">
      {/* Add Activity Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Activity</h2>
        <AddActivityForm leadId={leadId} />
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Activity Timeline</h2>
        <ActivityTimeline leadId={leadId} />
      </div>
    </div>
  )
}

function ChecklistTab({ leadId, currentStage }: { leadId: string; currentStage: string }) {
  return (
    <div className="space-y-6">
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
