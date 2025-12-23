# Adding Global Documents

Global documents are platform-wide resources visible to all companies. Here's how to add them:

## Method 1: Manual (Supabase Dashboard)

### Step 1: Upload File to Storage
1. Go to Supabase Dashboard → Storage → `global-documents`
2. Organize into folders by category (optional but recommended):
   - `contracts/`
   - `compliance/`
   - `training/`
   - `insurance/`
   - `licenses/`
   - etc.
3. Upload your file(s)

### Step 2: Sync to Database
Run the sync script from your project root:

```bash
node sync-global-documents.js
```

This will:
- Find all files in the `global-documents` bucket
- Auto-detect category from folder name
- Create database records for new files
- Skip files that already have database records

**Note**: The script uses folder names to auto-assign categories. For example:
- File in `contracts/my-doc.pdf` → category = `contracts`
- File in root → category = `other`

## Method 2: SQL Insert (Advanced)

If you want more control, insert records manually:

```sql
INSERT INTO public.global_documents (
  title,
  description,
  category,
  file_url,
  file_name,
  file_size,
  file_type,
  visibility,
  tags,
  uploaded_by
) VALUES (
  'Standard Roofing Contract',
  'Template contract for residential roofing projects',
  'contracts',
  'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/global-documents/contracts/standard-contract.pdf',
  'contracts/standard-contract.pdf',
  245760, -- bytes
  'pdf',
  'all', -- or 'premium_only' or 'admin_only'
  ARRAY['contract', 'template', '2024']::TEXT[],
  'Platform Admin'
);
```

## Categories

Valid categories:
- `contracts`
- `compliance`
- `training`
- `product_catalogs`
- `best_practices`
- `policies`
- `insurance`
- `licenses`
- `branding`
- `marketing`
- `safety`
- `templates`
- `other`

## Visibility Levels

- `all` - Everyone can see (default)
- `premium_only` - Only companies on Pro/Enterprise plans
- `admin_only` - Only company admins can see

## Tips

- **Organize with folders**: Use category names as folder names in storage for auto-categorization
- **Add tags**: Make documents searchable with relevant tags
- **Version control**: Use the `version` field and `supersedes_id` to track document updates
- **Descriptions**: Add helpful descriptions so users know what the document is for

---

**Last Updated**: December 23, 2024
