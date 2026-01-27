'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SupplierDocuments } from '@/components/admin/suppliers/supplier-documents'

interface SupplierDocumentsDialogProps {
  isOpen: boolean
  onClose: () => void
  supplierId: string
  supplierName: string
}

export function SupplierDocumentsDialog({
  isOpen,
  onClose,
  supplierId,
  supplierName,
}: SupplierDocumentsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Supplier Documents</DialogTitle>
          <DialogDescription>
            Manage documents for {supplierName}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <SupplierDocuments supplierId={supplierId} supplierName={supplierName} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
