# Document Scanning - Quick Start Guide

## For End Users (Mobile Scanning)

### How to Scan a Document

1. **Open Files Tab**
   - Navigate to any lead
   - Click the "Files" tab

2. **Start Scanning**
   - Click "Scan Document" button (blue button with camera icon)
   - Allow camera permissions when prompted

3. **Position Document**
   - Hold phone/tablet above document
   - Keep document flat and well-lit
   - Wait for green edge outline to appear

4. **Adjust if Needed**
   - Drag the green corner dots to adjust edges
   - Make sure all corners are on document edges

5. **Capture Page**
   - Click "Capture Page" button
   - Wait for processing (1-2 seconds)

6. **Add More Pages (Optional)**
   - Click "Add Page" to scan another page
   - Repeat steps 3-5 for each page
   - OR click "Done" if finished

7. **Save Document**
   - Enter a title for the document
   - Click "Save as PDF"
   - Wait for upload to complete
   - Document appears in files list!

### Tips for Best Results

✅ **Good Lighting** - Use bright, even lighting
✅ **Flat Surface** - Place document on flat surface
✅ **Steady Hand** - Hold camera still for best detection
✅ **Contrast** - Use darker background for white documents
✅ **Fill Frame** - Document should take up 60-80% of screen

❌ **Avoid:**
- Direct shadows across document
- White document on white background
- Wrinkled or curved documents
- Moving camera while capturing

## For Developers

### Quick Integration

**1. Import the Dialog**
```typescript
import { ScanDocumentDialog } from '@/components/admin/leads/scan-document-dialog'
```

**2. Add State**
```typescript
const [isScanOpen, setIsScanOpen] = useState(false)
```

**3. Render Dialog**
```typescript
<ScanDocumentDialog
  open={isScanOpen}
  onOpenChange={setIsScanOpen}
  leadId={leadId}
  leadName={leadName}
  onSuccess={() => {
    // Refresh documents list
    queryClient.invalidateQueries(['documents', leadId])
  }}
/>
```

**4. Add Trigger Button**
```typescript
<Button onClick={() => setIsScanOpen(true)}>
  <ScanLine className="h-4 w-4 mr-2" />
  Scan Document
</Button>
```

### Testing Locally

**1. Start Dev Server**
```bash
npm run dev
```

**2. Test on Mobile Device**
- Connect phone to same WiFi network
- Find your computer's local IP address
  - Windows: `ipconfig` → IPv4 Address
  - Mac: `ifconfig` → inet address
- Open browser on phone: `http://YOUR_IP:3000`

**3. Grant Permissions**
- Allow camera access when prompted
- If denied, go to browser settings to enable

### Environment Requirements

**Required:**
- ✅ Next.js 15+
- ✅ TypeScript
- ✅ Supabase project with `lead_documents` bucket
- ✅ Valid authentication
- ✅ HTTPS (for production/iOS)

**Optional:**
- 📱 Mobile device with camera
- 🔒 Camera permissions granted
- 📶 Stable internet connection

### Common Issues & Fixes

**Issue: "Camera access denied"**
- Fix: Check browser permissions in settings
- On iOS: Settings → Safari → Camera

**Issue: Edge detection not working**
- Fix: Improve lighting, use manual adjustment
- Drag corner handles to set edges manually

**Issue: PDF upload fails**
- Fix: Check Supabase Storage RLS policies
- Verify `lead_documents` bucket exists

**Issue: Slow performance**
- Fix: Reduce image compression in `document-scanner.ts`
- Lower output resolution (1200x1600 → 800x1200)

### API Endpoint

**Endpoint:** `POST /api/documents/scan`

**Authentication:** Required (Supabase Auth)

**Request Body:**
```json
{
  "leadId": "uuid",
  "title": "Document Title",
  "pages": [
    {
      "id": "page_123",
      "imageData": "data:image/jpeg;base64,...",
      "corners": { ... },
      "timestamp": 1234567890
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "document": { ... },
  "message": "Document scanned and saved successfully"
}
```

### File Locations

```
components/admin/leads/scan-document-dialog.tsx   # Main UI
lib/utils/document-scanner.ts                     # Image processing
app/api/documents/scan/route.ts                   # API endpoint
docs/DOCUMENT_SCANNING_FEATURE.md                 # Full documentation
```

---

## Ready to Use! 🚀

The feature is now fully integrated into your Files tab. Just click "Scan Document" to get started!

For detailed documentation, see [DOCUMENT_SCANNING_FEATURE.md](./DOCUMENT_SCANNING_FEATURE.md)
