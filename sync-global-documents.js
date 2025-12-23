/**
 * Sync Global Documents from Storage to Database
 * 
 * This script lists files in the global-documents storage bucket
 * and creates database records for any that don't exist yet.
 * 
 * Usage: node sync-global-documents.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key to bypass RLS
)

async function syncGlobalDocuments() {
  try {
    console.log('🔍 Fetching files from global-documents bucket...\n')

    // List all files in global-documents bucket
    const { data: files, error: listError } = await supabase.storage
      .from('global-documents')
      .list('', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      })

    if (listError) throw listError

    console.log(`Found ${files.length} files in storage\n`)

    // Get existing database records
    const { data: existingDocs } = await supabase
      .from('global_documents')
      .select('file_name')

    const existingFileNames = new Set(
      existingDocs?.map((doc) => doc.file_name) || []
    )

    // Process each file
    let syncedCount = 0
    let skippedCount = 0

    for (const file of files) {
      // Skip if it's a folder or already exists
      if (!file.name || existingFileNames.has(file.name)) {
        skippedCount++
        continue
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('global-documents')
        .getPublicUrl(file.name)

      // Extract category from folder structure (if organized)
      // e.g., "contracts/my-doc.pdf" -> category = "contracts"
      const pathParts = file.name.split('/')
      let category = 'other'
      if (pathParts.length > 1) {
        const folderName = pathParts[0]
        const validCategories = [
          'contracts',
          'compliance',
          'training',
          'product_catalogs',
          'best_practices',
          'policies',
          'insurance',
          'licenses',
          'branding',
          'marketing',
          'safety',
          'templates',
        ]
        if (validCategories.includes(folderName)) {
          category = folderName
        }
      }

      // Create title from filename (remove extension and path)
      const fileName = pathParts[pathParts.length - 1]
      const title = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')

      // Get file extension
      const fileType = fileName.split('.').pop()?.toLowerCase() || 'unknown'

      console.log(`✅ Syncing: ${fileName}`)
      console.log(`   Category: ${category}`)
      console.log(`   Size: ${(file.metadata.size / 1024).toFixed(1)} KB\n`)

      // Insert into database
      const { error: insertError } = await supabase
        .from('global_documents')
        .insert({
          title,
          category,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.metadata.size,
          file_type: fileType,
          is_active: true,
          visibility: 'all',
          uploaded_by: 'Platform Admin',
        })

      if (insertError) {
        console.error(`❌ Failed to sync ${fileName}:`, insertError.message)
      } else {
        syncedCount++
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log(`✅ Synced: ${syncedCount} new documents`)
    console.log(`⏭️  Skipped: ${skippedCount} (already in database)`)
    console.log('='.repeat(50))
  } catch (error) {
    console.error('❌ Error syncing documents:', error.message)
    process.exit(1)
  }
}

syncGlobalDocuments()
