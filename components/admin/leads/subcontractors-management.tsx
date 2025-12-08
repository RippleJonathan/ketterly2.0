// Subcontractors Management Component
// Parallel to suppliers.tsx for managing subcontractor companies

'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Star, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Subcontractor, SubcontractorInsert, TRADE_SPECIALTIES } from '@/lib/types/work-orders'

export function SubcontractorsManagement({ companyId }: { companyId: string }) {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([])
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  // Fetch subcontractors
  const fetchSubcontractors = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('subcontractors')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('company_name')

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load subcontractors',
        variant: 'destructive',
      })
    } else {
      setSubcontractors(data || [])
    }
    setLoading(false)
  }

  // Initialize
  useState(() => {
    fetchSubcontractors()
  })

  // Create/Update subcontractor
  const handleSave = async (data: SubcontractorInsert) => {
    if (editingSubcontractor) {
      // Update
      const { error } = await supabase
        .from('subcontractors')
        .update(data)
        .eq('id', editingSubcontractor.id)

      if (error) {
        toast.error('Failed to update subcontractor')
      } else {
        toast.success('Subcontractor updated')
        fetchSubcontractors()
        setShowDialog(false)
        setEditingSubcontractor(null)
      }
    } else {
      // Create
      const { error } = await supabase
        .from('subcontractors')
        .insert({ ...data, company_id: companyId })

      if (error) {
        toast.error('Failed to create subcontractor')
      } else {
        toast.success('Subcontractor created')
        fetchSubcontractors()
        setShowDialog(false)
      }
    }
  }

  // Delete subcontractor
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subcontractor?')) return

    const { error } = await supabase
      .from('subcontractors')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete subcontractor')
    } else {
      toast.success('Subcontractor deleted')
      fetchSubcontractors()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Subcontractors</h2>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingSubcontractor(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subcontractor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSubcontractor ? 'Edit Subcontractor' : 'Add Subcontractor'}
              </DialogTitle>
            </DialogHeader>
            <SubcontractorForm
              subcontractor={editingSubcontractor}
              onSave={handleSave}
              onCancel={() => {
                setShowDialog(false)
                setEditingSubcontractor(null)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : subcontractors.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No subcontractors yet</h3>
          <p className="text-muted-foreground mb-4">
            Add your first subcontractor to start creating work orders
          </p>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Subcontractor
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subcontractors.map((subcontractor) => (
            <SubcontractorCard
              key={subcontractor.id}
              subcontractor={subcontractor}
              onEdit={() => {
                setEditingSubcontractor(subcontractor)
                setShowDialog(true)
              }}
              onDelete={() => handleDelete(subcontractor.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SubcontractorCard({
  subcontractor,
  onEdit,
  onDelete,
}: {
  subcontractor: Subcontractor
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold">{subcontractor.company_name}</h3>
          {subcontractor.contact_name && (
            <p className="text-sm text-muted-foreground">{subcontractor.contact_name}</p>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {subcontractor.rating && (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-medium">{subcontractor.rating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">
            ({subcontractor.total_jobs_completed} jobs)
          </span>
        </div>
      )}

      {subcontractor.trade_specialties && subcontractor.trade_specialties.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {subcontractor.trade_specialties.map((specialty) => (
            <Badge key={specialty} variant="secondary" className="text-xs">
              {specialty}
            </Badge>
          ))}
        </div>
      )}

      <div className="space-y-1 text-sm">
        {subcontractor.email && (
          <p className="text-muted-foreground">{subcontractor.email}</p>
        )}
        {subcontractor.phone && (
          <p className="text-muted-foreground">{subcontractor.phone}</p>
        )}
        {subcontractor.payment_terms && (
          <p className="text-xs text-muted-foreground">
            Payment: {subcontractor.payment_terms}
          </p>
        )}
      </div>

      {!subcontractor.is_active && (
        <Badge variant="destructive">Inactive</Badge>
      )}
    </div>
  )
}

function SubcontractorForm({
  subcontractor,
  onSave,
  onCancel,
}: {
  subcontractor: Subcontractor | null
  onSave: (data: SubcontractorInsert) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<SubcontractorInsert>({
    company_id: '', // Will be set by parent
    company_name: subcontractor?.company_name || '',
    contact_name: subcontractor?.contact_name || '',
    email: subcontractor?.email || '',
    phone: subcontractor?.phone || '',
    address: subcontractor?.address || '',
    city: subcontractor?.city || '',
    state: subcontractor?.state || '',
    zip: subcontractor?.zip || '',
    trade_specialties: subcontractor?.trade_specialties || [],
    license_number: subcontractor?.license_number || '',
    insurance_expiry: subcontractor?.insurance_expiry || '',
    w9_on_file: subcontractor?.w9_on_file || false,
    payment_terms: subcontractor?.payment_terms || 'Net 30',
    preferred_payment_method: subcontractor?.preferred_payment_method || '',
    rating: subcontractor?.rating || null,
    notes: subcontractor?.notes || '',
    is_active: subcontractor?.is_active ?? true,
  })

  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(
    subcontractor?.trade_specialties || []
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ ...formData, trade_specialties: selectedSpecialties })
  }

  const toggleSpecialty = (specialty: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(specialty)
        ? prev.filter((s) => s !== specialty)
        : [...prev, specialty]
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Company Info */}
      <div className="space-y-2">
        <Label htmlFor="company_name">Company Name *</Label>
        <Input
          id="company_name"
          value={formData.company_name}
          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact_name">Contact Name</Label>
          <Input
            id="contact_name"
            value={formData.contact_name}
            onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2 col-span-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            maxLength={2}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="zip">ZIP Code</Label>
        <Input
          id="zip"
          value={formData.zip}
          onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
        />
      </div>

      {/* Trade Specialties */}
      <div className="space-y-2">
        <Label>Trade Specialties</Label>
        <div className="grid grid-cols-3 gap-2">
          {TRADE_SPECIALTIES.map((specialty) => (
            <Badge
              key={specialty}
              variant={selectedSpecialties.includes(specialty) ? 'default' : 'outline'}
              className="cursor-pointer justify-center"
              onClick={() => toggleSpecialty(specialty)}
            >
              {specialty}
            </Badge>
          ))}
        </div>
      </div>

      {/* Business Details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="license_number">License Number</Label>
          <Input
            id="license_number"
            value={formData.license_number}
            onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="insurance_expiry">Insurance Expiry</Label>
          <Input
            id="insurance_expiry"
            type="date"
            value={formData.insurance_expiry}
            onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
          />
        </div>
      </div>

      {/* Payment Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="payment_terms">Payment Terms</Label>
          <Select
            value={formData.payment_terms || 'Net 30'}
            onValueChange={(value) => setFormData({ ...formData, payment_terms: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COD">COD</SelectItem>
              <SelectItem value="Net 15">Net 15</SelectItem>
              <SelectItem value="Net 30">Net 30</SelectItem>
              <SelectItem value="Net 60">Net 60</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="preferred_payment_method">Preferred Payment</Label>
          <Select
            value={formData.preferred_payment_method || undefined}
            onValueChange={(value) => setFormData({ ...formData, preferred_payment_method: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="check">Check</SelectItem>
              <SelectItem value="ach">ACH</SelectItem>
              <SelectItem value="credit_card">Credit Card</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {subcontractor ? 'Update' : 'Create'} Subcontractor
        </Button>
      </div>
    </form>
  )
}
