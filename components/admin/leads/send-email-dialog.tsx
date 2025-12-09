'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Plus, Mail } from 'lucide-react'
import { MaterialOrder } from '@/lib/types/material-orders'

interface SendEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: MaterialOrder
  onSend: (data: {
    recipientEmails: string[]
    recipientName: string
    includeMaterialList: boolean
  }) => Promise<void>
}

export function SendEmailDialog({ open, onOpenChange, order, onSend }: SendEmailDialogProps) {
  const [primaryEmail, setPrimaryEmail] = useState(order.supplier?.email || '')
  const [recipientName, setRecipientName] = useState(order.supplier?.contact_name || order.supplier?.name || '')
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [includeMaterialList, setIncludeMaterialList] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const handleAddEmail = () => {
    if (newEmail.trim() && newEmail.includes('@')) {
      setAdditionalEmails([...additionalEmails, newEmail.trim()])
      setNewEmail('')
    }
  }

  const handleRemoveEmail = (index: number) => {
    setAdditionalEmails(additionalEmails.filter((_, i) => i !== index))
  }

  const handleSend = async () => {
    if (!primaryEmail.trim()) return

    setIsSending(true)
    try {
      const allEmails = [primaryEmail.trim(), ...additionalEmails]
      await onSend({
        recipientEmails: allEmails,
        recipientName: recipientName.trim(),
        includeMaterialList,
      })
      onOpenChange(false)
      // Reset form
      setAdditionalEmails([])
      setNewEmail('')
      setIncludeMaterialList(false)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Purchase Order Email</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Primary Recipient */}
          <div className="space-y-2">
            <Label htmlFor="primary-email">Primary Recipient Email *</Label>
            <Input
              id="primary-email"
              type="email"
              placeholder="supplier@example.com"
              value={primaryEmail}
              onChange={(e) => setPrimaryEmail(e.target.value)}
            />
          </div>

          {/* Recipient Name */}
          <div className="space-y-2">
            <Label htmlFor="recipient-name">Recipient Name</Label>
            <Input
              id="recipient-name"
              placeholder="John Smith"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </div>

          {/* Additional Recipients */}
          <div className="space-y-2">
            <Label>Additional Recipients (CC)</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="additional@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddEmail}
                disabled={!newEmail.trim() || !newEmail.includes('@')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {additionalEmails.length > 0 && (
              <div className="mt-2 space-y-1">
                {additionalEmails.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm"
                  >
                    <span>{email}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveEmail(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Material List Option */}
          <div className="flex items-center space-x-2 pt-2 border-t">
            <Checkbox
              id="include-materials"
              checked={includeMaterialList}
              onCheckedChange={(checked) => setIncludeMaterialList(checked as boolean)}
            />
            <Label
              htmlFor="include-materials"
              className="text-sm font-normal cursor-pointer"
            >
              Include material list in email body (without prices)
            </Label>
          </div>

          {/* Order Summary */}
          <div className="bg-blue-50 p-3 rounded text-sm space-y-1">
            <div><strong>PO Number:</strong> {order.order_number}</div>
            <div><strong>Items:</strong> {order.items?.length || 0}</div>
            {order.supplier && <div><strong>Supplier:</strong> {order.supplier.name}</div>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!primaryEmail.trim() || isSending}>
            <Mail className="h-4 w-4 mr-2" />
            {isSending ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
