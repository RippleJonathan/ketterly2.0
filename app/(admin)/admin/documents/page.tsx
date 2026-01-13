import { Metadata } from 'next'

export const dynamic = 'force-dynamic'

import { DocumentLibraryClient } from '@/components/admin/documents/document-library-client'

export const metadata: Metadata = {
  title: 'Documents | Ketterly',
  description: 'Manage company documents and access global resources',
}

export default function DocumentsPage() {
  return <DocumentLibraryClient />
}
