# E-Signature & Document Management System

**Goal**: Build an in-house, legally-binding e-signature system with complete document management

**Duration**: ~1-2 weeks  
**Status**: 🟡 Planning Phase

---

## Legal Requirements (ESIGN Act Compliance)

For digital signatures to be legally binding in the US, we must:

1. ✅ **Intent to Sign**: User must clearly intend to sign (button click)
2. ✅ **Consent to Electronic**: User agrees to use electronic signatures
3. ✅ **Association**: Signature must be linked to the document
4. ✅ **Record Retention**: Store signed documents and audit trail
5. ✅ **Timestamp**: Record exact time of signature
6. ✅ **Identity Verification**: Capture signer information (name, email, IP)

Our system will meet all requirements.

---

## Architecture Overview

### Database Schema

```sql
-- Documents table (all files associated with leads)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  lead_id UUID REFERENCES leads(id) NOT NULL,
  
  -- Document info
  document_type TEXT NOT NULL CHECK (document_type IN (
    'quote',           -- Generated quote PDF
    'contract',        -- Contract requiring signature
    'invoice',         -- Invoice PDF
    'photo',           -- Job site photo
    'receipt',         -- Payment receipt
    'permit',          -- Building permit
    'insurance',       -- Insurance certificate
    'warranty',        -- Warranty document
    'change_order',    -- Change order form
    'completion',      -- Certificate of completion
    'other'            -- Misc uploads
  )),
  
  title TEXT NOT NULL,
  description TEXT,
  
  -- File storage
  file_url TEXT NOT NULL,        -- Supabase Storage URL
  file_name TEXT NOT NULL,       -- Original filename
  file_size INTEGER,             -- Bytes
  mime_type TEXT,                -- application/pdf, image/jpeg, etc.
  
  -- Version control
  version INTEGER DEFAULT 1,
  supersedes_id UUID REFERENCES documents(id), -- Previous version
  
  -- Signature tracking
  requires_signature BOOLEAN DEFAULT false,
  signature_status TEXT CHECK (signature_status IN ('pending', 'signed', 'declined', 'expired')),
  
  -- Related records
  quote_id UUID REFERENCES quotes(id),
  invoice_id UUID REFERENCES invoices(id),
  
  -- Metadata
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Visibility
  visible_to_customer BOOLEAN DEFAULT false,
  shared_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Signature fields (where signatures/initials are required on a document)
CREATE TABLE document_signature_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  
  -- Field info
  field_type TEXT NOT NULL CHECK (field_type IN ('signature', 'initial', 'date', 'text')),
  field_label TEXT NOT NULL,           -- "Customer Signature", "Initial here"
  
  -- Position on document (for PDF overlay - future enhancement)
  page_number INTEGER,
  x_position INTEGER,                  -- Pixels from left
  y_position INTEGER,                  -- Pixels from top
  width INTEGER,
  height INTEGER,
  
  -- Who needs to sign
  signer_role TEXT NOT NULL CHECK (signer_role IN ('customer', 'company', 'crew_lead')),
  
  -- Is this field required?
  required BOOLEAN DEFAULT true,
  
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actual signatures (when someone signs)
CREATE TABLE document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  signature_field_id UUID REFERENCES document_signature_fields(id),
  
  -- Signer information
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_role TEXT NOT NULL,           -- customer, company, crew_lead
  
  -- Signature data
  signature_type TEXT NOT NULL CHECK (signature_type IN ('signature', 'initial', 'text')),
  signature_data TEXT NOT NULL,        -- Base64 encoded image or text value
  
  -- Legal verification
  ip_address INET NOT NULL,
  user_agent TEXT NOT NULL,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Consent
  agreed_to_terms BOOLEAN DEFAULT true,
  consent_text TEXT NOT NULL,          -- Full text they agreed to
  
  -- Authentication (for added security)
  verification_method TEXT,            -- 'email_link', 'sms_code', 'none'
  verification_token TEXT,
  verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document share links (for customer access)
CREATE TABLE document_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  
  -- Secure token
  share_token TEXT UNIQUE NOT NULL,    -- Random secure token
  
  -- Access control
  expires_at TIMESTAMPTZ,
  max_views INTEGER,                   -- Null = unlimited
  view_count INTEGER DEFAULT 0,
  
  -- Password protection (optional)
  password_hash TEXT,
  
  -- Permissions
  allow_download BOOLEAN DEFAULT true,
  allow_signature BOOLEAN DEFAULT true,
  
  -- Tracking
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ,
  
  revoked_at TIMESTAMPTZ
);

-- Document view tracking
CREATE TABLE document_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  share_link_id UUID REFERENCES document_share_links(id),
  
  -- Viewer info
  ip_address INET,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies

```sql
-- Documents: Users see only their company's documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's documents"
  ON documents FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can upload documents to their company's leads"
  ON documents FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Share links are public (but token-protected)
ALTER TABLE document_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view share links"
  ON document_share_links FOR SELECT
  USING (true);

-- No RLS on signatures (handled by share token validation)
```

---

## Implementation Steps

### Step 1: Files Tab on Lead Detail Page

**UI Structure:**

```
Lead Detail Page
├── Overview Tab
├── Activity Tab
├── Estimates Tab (existing)
└── Files Tab (NEW)
    ├── File Upload Button
    ├── Document Type Selector
    ├── File List Table
    │   ├── Document Type Icon
    │   ├── Title
    │   ├── Uploaded Date
    │   ├── Uploaded By
    │   ├── Size
    │   ├── Signature Status Badge
    │   └── Actions (View, Download, Share, Delete)
    └── Filter by Type
```

**Files Tab Component:**

```typescript
// components/admin/leads/files-tab.tsx
export function FilesTab({ leadId }: { leadId: string }) {
  const { data: documents, isLoading } = useDocuments(leadId)
  const uploadDocument = useUploadDocument()
  
  return (
    <div className="space-y-4">
      {/* Upload section */}
      <Card>
        <CardContent className="pt-6">
          <DocumentUpload 
            leadId={leadId}
            onUploadComplete={() => queryClient.invalidateQueries(['documents', leadId])}
          />
        </CardContent>
      </Card>
      
      {/* Document list */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentsTable documents={documents} />
        </CardContent>
      </Card>
    </div>
  )
}
```

**Document Upload Component:**

```typescript
// components/admin/leads/document-upload.tsx
export function DocumentUpload({ leadId, onUploadComplete }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<DocumentType>('other')
  const [title, setTitle] = useState('')
  const [visibleToCustomer, setVisibleToCustomer] = useState(false)
  
  const handleUpload = async () => {
    // 1. Upload file to Supabase Storage
    const filePath = `${companyId}/${leadId}/${uuidv4()}_${file.name}`
    const { data: uploadData } = await supabase.storage
      .from('documents')
      .upload(filePath, file)
    
    // 2. Create document record
    await createDocument({
      lead_id: leadId,
      document_type: documentType,
      title: title || file.name,
      file_url: uploadData.path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      visible_to_customer: visibleToCustomer,
    })
    
    onUploadComplete()
  }
  
  return (
    <div className="space-y-4">
      <div>
        <Label>Document Type</Label>
        <Select value={documentType} onValueChange={setDocumentType}>
          <SelectItem value="quote">Quote</SelectItem>
          <SelectItem value="contract">Contract</SelectItem>
          <SelectItem value="invoice">Invoice</SelectItem>
          <SelectItem value="photo">Photo</SelectItem>
          <SelectItem value="permit">Permit</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </Select>
      </div>
      
      <div>
        <Label>Document Title</Label>
        <Input 
          value={title} 
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Signed Contract"
        />
      </div>
      
      <div>
        <Label>Upload File</Label>
        <Input 
          type="file" 
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <Checkbox 
          checked={visibleToCustomer} 
          onCheckedChange={setVisibleToCustomer}
        />
        <Label>Visible to customer</Label>
      </div>
      
      <Button onClick={handleUpload} disabled={!file}>
        Upload Document
      </Button>
    </div>
  )
}
```

---

### Step 2: Auto-Generate Contract Documents

When a quote is accepted, auto-generate a contract document:

**Contract Template:**

```typescript
// lib/templates/contract-template.tsx
export function generateContractPDF(quote: Quote, lead: Lead, company: Company) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <Text style={styles.title}>SERVICE AGREEMENT</Text>
        
        {/* Parties */}
        <View style={styles.section}>
          <Text style={styles.heading}>PARTIES</Text>
          <Text>This agreement is entered into on {today} between:</Text>
          <Text style={styles.bold}>CONTRACTOR: {company.name}</Text>
          <Text>{company.address}</Text>
          <Text>{company.contact_phone}</Text>
          
          <Text style={styles.bold}>CUSTOMER: {lead.full_name}</Text>
          <Text>{lead.address}</Text>
          <Text>{lead.phone}</Text>
        </View>
        
        {/* Scope of Work */}
        <View style={styles.section}>
          <Text style={styles.heading}>SCOPE OF WORK</Text>
          <Text>{quote.notes}</Text>
          
          {/* Line items from quote */}
          {quote.line_items.map(item => (
            <Text key={item.id}>• {item.description}</Text>
          ))}
        </View>
        
        {/* Contract Amount */}
        <View style={styles.section}>
          <Text style={styles.heading}>CONTRACT AMOUNT</Text>
          <Text>Total Contract Price: {formatCurrency(quote.total_amount)}</Text>
        </View>
        
        {/* Payment Terms */}
        <View style={styles.section}>
          <Text style={styles.heading}>PAYMENT TERMS</Text>
          <Text>{quote.payment_terms}</Text>
        </View>
        
        {/* Contract Terms from Settings */}
        <View style={styles.section}>
          <Text style={styles.heading}>TERMS AND CONDITIONS</Text>
          <Text>{company.contract_terms}</Text>
        </View>
        
        {/* Signature Placeholders */}
        <View style={styles.signatures}>
          <View style={styles.signatureBox}>
            <Text style={styles.label}>CUSTOMER SIGNATURE</Text>
            <View style={styles.signatureLine} />
            <Text>Print Name: _______________________</Text>
            <Text>Date: _______________________</Text>
          </View>
          
          <View style={styles.signatureBox}>
            <Text style={styles.label}>Initial here: _____</Text>
            <Text style={styles.small}>I have read and agree to terms</Text>
          </View>
          
          <View style={styles.signatureBox}>
            <Text style={styles.label}>COMPANY AUTHORIZED SIGNATURE</Text>
            <View style={styles.signatureLine} />
            <Text>Print Name: _______________________</Text>
            <Text>Date: _______________________</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
```

**Auto-generate on Quote Accept:**

```typescript
// When quote is accepted (in quote accept handler)
async function onQuoteAccepted(quoteId: string) {
  const quote = await getQuote(quoteId)
  const lead = await getLead(quote.lead_id)
  const company = await getCompany(quote.company_id)
  
  // Generate contract PDF
  const contractPDF = await generateContractPDF(quote, lead, company)
  const blob = await pdf(contractPDF).toBlob()
  
  // Upload to storage
  const filePath = `${company.id}/${lead.id}/contract_${quote.quote_number}.pdf`
  const { data: uploadData } = await supabase.storage
    .from('documents')
    .upload(filePath, blob)
  
  // Create document record with signature fields
  const { data: document } = await createDocument({
    lead_id: lead.id,
    company_id: company.id,
    document_type: 'contract',
    title: `Contract - ${quote.quote_number}`,
    file_url: uploadData.path,
    requires_signature: true,
    signature_status: 'pending',
    quote_id: quote.id,
    visible_to_customer: true,
  })
  
  // Define signature fields
  await createSignatureFields(document.id, [
    {
      field_type: 'signature',
      field_label: 'Customer Signature',
      signer_role: 'customer',
      required: true,
      sort_order: 1,
    },
    {
      field_type: 'initial',
      field_label: 'Customer Initial - Agreement to Terms',
      signer_role: 'customer',
      required: true,
      sort_order: 2,
    },
    {
      field_type: 'date',
      field_label: 'Date Signed',
      signer_role: 'customer',
      required: true,
      sort_order: 3,
    },
    {
      field_type: 'signature',
      field_label: 'Company Authorized Signature',
      signer_role: 'company',
      required: true,
      sort_order: 4,
    },
  ])
  
  // Create share link for customer
  const shareLink = await createDocumentShareLink({
    document_id: document.id,
    expires_at: addDays(new Date(), 30), // 30 day expiry
    allow_signature: true,
  })
  
  // Send email to customer
  await sendContractEmail(lead.email, shareLink.share_token)
}
```

---

### Step 3: Public Signature Page

**Route:** `/sign/[shareToken]`

**Flow:**
1. Customer receives email with link
2. Opens `/sign/abc123def456`
3. Sees document preview
4. Required signature/initial spots highlighted
5. Clicks "Sign" → Signature pad modal opens
6. Draws signature → Confirms
7. All required fields filled → "Submit" button enabled
8. Submits → Document marked as signed
9. Confirmation screen with download button

**Signature Page Component:**

```typescript
// app/(public)/sign/[shareToken]/page.tsx
export default async function SignDocumentPage({ 
  params 
}: { 
  params: { shareToken: string } 
}) {
  const shareLink = await getShareLink(params.shareToken)
  
  if (!shareLink || shareLink.revoked_at || isExpired(shareLink.expires_at)) {
    return <ExpiredLinkPage />
  }
  
  const document = await getDocument(shareLink.document_id)
  const signatureFields = await getSignatureFields(document.id)
  
  return (
    <SignatureInterface 
      document={document}
      signatureFields={signatureFields}
      shareToken={params.shareToken}
    />
  )
}
```

**Signature Interface Component:**

```typescript
// components/public/signature-interface.tsx
'use client'

export function SignatureInterface({ document, signatureFields, shareToken }: Props) {
  const [signatures, setSignatures] = useState<Record<string, string>>({})
  const [isComplete, setIsComplete] = useState(false)
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [currentFieldId, setCurrentFieldId] = useState<string | null>(null)
  
  const customerFields = signatureFields.filter(f => f.signer_role === 'customer')
  
  const handleSign = (fieldId: string) => {
    setCurrentFieldId(fieldId)
    setShowSignaturePad(true)
  }
  
  const handleSignatureComplete = (signatureData: string) => {
    setSignatures({ ...signatures, [currentFieldId!]: signatureData })
    setShowSignaturePad(false)
    checkIfComplete()
  }
  
  const checkIfComplete = () => {
    const requiredFields = customerFields.filter(f => f.required)
    const allSigned = requiredFields.every(f => signatures[f.id])
    setIsComplete(allSigned)
  }
  
  const handleSubmit = async () => {
    // Get IP and user agent
    const ipAddress = await fetch('/api/ip').then(r => r.json())
    const userAgent = navigator.userAgent
    
    // Submit all signatures
    for (const field of customerFields) {
      if (signatures[field.id]) {
        await createSignature({
          document_id: document.id,
          signature_field_id: field.id,
          signer_name: signerName,
          signer_email: signerEmail,
          signer_role: 'customer',
          signature_type: field.field_type,
          signature_data: signatures[field.id],
          ip_address: ipAddress,
          user_agent: userAgent,
          consent_text: CONSENT_TEXT,
        })
      }
    }
    
    // Mark document as signed
    await updateDocument(document.id, {
      signature_status: 'signed',
    })
    
    // Show confirmation
    router.push(`/sign/${shareToken}/complete`)
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Document Preview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{document.title}</CardTitle>
          <CardDescription>Please review and sign this document</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-gray-50">
            <embed 
              src={document.file_url} 
              type="application/pdf" 
              width="100%" 
              height="600px"
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Signature Fields */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Required Signatures & Initials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {customerFields.map(field => (
            <div key={field.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">
                    {field.field_label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <p className="text-sm text-gray-600">
                    {field.field_type === 'signature' && 'Full signature required'}
                    {field.field_type === 'initial' && 'Initials required'}
                    {field.field_type === 'date' && 'Date will be auto-filled'}
                  </p>
                </div>
                
                <div>
                  {signatures[field.id] ? (
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-600" />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSign(field.id)}
                      >
                        Edit
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={() => handleSign(field.id)}>
                      {field.field_type === 'signature' ? 'Sign' : 'Initial'}
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Preview signature */}
              {signatures[field.id] && (
                <div className="mt-4 border-t pt-4">
                  <img 
                    src={signatures[field.id]} 
                    alt="Signature preview"
                    className="h-16 border-b-2 border-gray-800"
                  />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      
      {/* Consent */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-2">
            <Checkbox id="consent" required />
            <Label htmlFor="consent" className="text-sm leading-relaxed">
              I agree to use electronic signatures and records. I understand that by clicking 
              "Submit Signatures", I am legally signing this document with the same effect as 
              a handwritten signature.
            </Label>
          </div>
        </CardContent>
      </Card>
      
      {/* Submit */}
      <div className="flex justify-end">
        <Button 
          size="lg" 
          disabled={!isComplete}
          onClick={handleSubmit}
        >
          Submit Signatures
        </Button>
      </div>
      
      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <SignaturePadModal 
          fieldType={customerFields.find(f => f.id === currentFieldId)?.field_type || 'signature'}
          onComplete={handleSignatureComplete}
          onCancel={() => setShowSignaturePad(false)}
        />
      )}
    </div>
  )
}
```

---

### Step 4: Signature Pad Component

```typescript
// components/public/signature-pad-modal.tsx
'use client'

import SignatureCanvas from 'react-signature-canvas'

export function SignaturePadModal({ fieldType, onComplete, onCancel }: Props) {
  const sigPad = useRef<SignatureCanvas>(null)
  
  const handleClear = () => {
    sigPad.current?.clear()
  }
  
  const handleSave = () => {
    if (sigPad.current?.isEmpty()) {
      toast.error('Please provide a signature')
      return
    }
    
    const signatureData = sigPad.current?.toDataURL('image/png')
    onComplete(signatureData)
  }
  
  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {fieldType === 'signature' ? 'Draw Your Signature' : 'Draw Your Initials'}
          </DialogTitle>
          <DialogDescription>
            Please draw using your mouse or finger
          </DialogDescription>
        </DialogHeader>
        
        <div className="border-2 border-gray-300 rounded-lg bg-white">
          <SignatureCanvas
            ref={sigPad}
            canvasProps={{
              width: 700,
              height: fieldType === 'signature' ? 200 : 100,
              className: 'w-full'
            }}
            backgroundColor="white"
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <Button onClick={handleSave}>
            Save {fieldType === 'signature' ? 'Signature' : 'Initials'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

### Step 5: Admin View of Signed Documents

**Document Detail Page:** `/admin/documents/[id]`

Shows:
- Document preview
- Signature status badges
- All signatures with timestamps
- IP addresses and verification info
- Download final signed version
- Audit trail

**Signed Document Export:**

When all signatures complete, generate final PDF with signatures overlaid:

```typescript
async function generateSignedDocumentPDF(documentId: string) {
  const document = await getDocument(documentId)
  const signatures = await getSignatures(documentId)
  
  // Load original PDF
  const originalPDF = await fetch(document.file_url).then(r => r.arrayBuffer())
  const pdfDoc = await PDFDocument.load(originalPDF)
  
  // Overlay signatures at their positions
  for (const signature of signatures) {
    const signatureImage = await pdfDoc.embedPng(signature.signature_data)
    const page = pdfDoc.getPage(signature.field.page_number - 1)
    
    page.drawImage(signatureImage, {
      x: signature.field.x_position,
      y: signature.field.y_position,
      width: signature.field.width,
      height: signature.field.height,
    })
  }
  
  // Add signature verification footer
  const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1]
  lastPage.drawText(
    `Document signed electronically on ${signatures[0].signed_at}`,
    { size: 8, x: 50, y: 20 }
  )
  
  // Save new PDF
  const signedPDFBytes = await pdfDoc.save()
  
  // Upload to storage
  const signedPath = document.file_url.replace('.pdf', '_signed.pdf')
  await supabase.storage
    .from('documents')
    .upload(signedPath, signedPDFBytes)
  
  return signedPath
}
```

---

## Next Steps

1. Create database migration for documents tables
2. Set up Supabase Storage bucket for documents
3. Build Files tab on lead detail page
4. Create document upload component
5. Build contract template generator
6. Create public signature page
7. Build signature pad component
8. Test e-signature workflow end-to-end
9. Add email notifications
10. Build admin document viewer

Ready to start implementation? We'll begin with the database and Files tab!
