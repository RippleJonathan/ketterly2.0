'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2, X } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/lib/hooks/use-current-user'

interface CompanySignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  companyId: string
}

export function CompanySignatureDialog({
  open,
  onOpenChange,
  documentId,
  companyId,
}: CompanySignatureDialogProps) {
  const [name, setName] = useState('')
  const [isSigning, setIsSigning] = useState(false)
  const signatureRef = useRef<SignatureCanvas>(null)
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()

  const handleSign = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast.error('Please provide your signature')
      return
    }

    if (!name.trim()) {
      toast.error('Please enter your name')
      return
    }

    if (!user?.data?.id) {
      toast.error('User not found')
      return
    }

    setIsSigning(true)

    try {
      const signatureData = signatureRef.current.toDataURL()

      // Update document with company signature
      const { error } = await supabase
        .from('generated_documents')
        .update({
          company_signature_data: signatureData,
          company_signed_by_name: name,
          company_signed_at: new Date().toISOString(),
          company_signed_by: user.data.id,
          status: 'signed', // Mark as fully signed
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId)
        .eq('company_id', companyId)

      if (error) throw error

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['generated-documents'] })
      queryClient.invalidateQueries({ queryKey: ['generated-document', documentId] })

      toast.success('Document signed successfully!')
      onOpenChange(false)
      
      // Reset form
      setName('')
      signatureRef.current?.clear()
    } catch (error: any) {
      console.error('Signature error:', error)
      toast.error(error.message || 'Failed to save signature')
    } finally {
      setIsSigning(false)
    }
  }

  const clearSignature = () => {
    signatureRef.current?.clear()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Company Representative Signature</DialogTitle>
          <DialogDescription>
            Sign this document as a company representative
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Your Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Signature *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSignature}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
            <div className="border-2 border-gray-300 rounded-lg">
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  className: 'w-full h-40 cursor-crosshair',
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Draw your signature above using your mouse or touchscreen
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSigning}
            >
              Cancel
            </Button>
            <Button onClick={handleSign} disabled={isSigning}>
              {isSigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing...
                </>
              ) : (
                'Sign Document'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
