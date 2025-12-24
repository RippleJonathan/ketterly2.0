import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { GeneratedDocumentPreview } from '@/components/admin/document-builder/generated-document-preview'

interface GeneratedDocumentPageProps {
  params: Promise<{ id: string }>
}

export default async function GeneratedDocumentPage({ params }: GeneratedDocumentPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user's company
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/login')

  // Fetch generated document with all relations
  const { data: document, error } = await supabase
    .from('generated_documents')
    .select(`
      *,
      template:document_templates(*),
      lead:leads(*),
      quote:quotes(*),
      project:projects(*),
      creator:users!generated_documents_created_by_fkey(full_name, email)
    `)
    .eq('id', id)
    .eq('company_id', userData.company_id)
    .single()

  console.log('Generated document fetch:', { id, document, error })

  if (error || !document) {
    console.error('Document not found or error:', error)
    notFound()
  }

  // Fetch company data
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', userData.company_id)
    .single()

  return (
    <GeneratedDocumentPreview
      document={document}
      company={company}
    />
  )
}
