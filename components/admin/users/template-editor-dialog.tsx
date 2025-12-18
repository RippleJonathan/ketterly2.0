'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Users,
  DollarSign,
  FileText,
  Package,
  Wrench,
  BarChart,
  Settings,
  Camera,
} from 'lucide-react'
import {
  PERMISSION_CATEGORIES,
  PERMISSION_LABELS,
  PermissionKey,
  ALL_PERMISSIONS,
} from '@/lib/types/users'
import { useCreateRoleTemplate, useUpdateRoleTemplate } from '@/lib/hooks/use-role-templates'
import { toast } from 'sonner'

interface TemplateEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateId?: string
  initialData?: {
    template_name: string
    description: string | null
    is_system_default: boolean
    permissions: Record<string, boolean>
  }
  mode: 'create' | 'edit'
}

// Category icons mapping
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Leads & Projects': <Users className="h-4 w-4" />,
  'Quotes': <FileText className="h-4 w-4" />,
  'Invoices & Payments': <DollarSign className="h-4 w-4" />,
  'Material Orders': <Package className="h-4 w-4" />,
  'Work Orders & Crew': <Wrench className="h-4 w-4" />,
  'Customers': <Users className="h-4 w-4" />,
  'Financials & Reports': <BarChart className="h-4 w-4" />,
  'Users & Settings': <Settings className="h-4 w-4" />,
  'Production': <Camera className="h-4 w-4" />,
}

export function TemplateEditorDialog({
  open,
  onOpenChange,
  templateId,
  initialData,
  mode,
}: TemplateEditorDialogProps) {
  const createTemplate = useCreateRoleTemplate()
  const updateTemplate = useUpdateRoleTemplate()

  const [templateName, setTemplateName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})

  // Initialize form when dialog opens or data changes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialData) {
        setTemplateName(initialData.template_name)
        setDescription(initialData.description || '')
        setPermissions(initialData.permissions)
      } else {
        // Create mode - initialize with all permissions false
        setTemplateName('')
        setDescription('')
        const emptyPerms: Record<string, boolean> = {}
        ALL_PERMISSIONS.forEach((perm) => {
          emptyPerms[perm] = false
        })
        setPermissions(emptyPerms)
      }
    }
  }, [open, mode, initialData])

  const handleTogglePermission = (permission: PermissionKey) => {
    setPermissions((prev) => ({
      ...prev,
      [permission]: !prev[permission],
    }))
  }

  const handleSelectAllCategory = (category: string) => {
    const categoryPermissions = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES] as readonly string[]
    const updates: Record<string, boolean> = {}
    categoryPermissions.forEach((perm) => {
      updates[perm] = true
    })
    setPermissions((prev) => ({ ...prev, ...updates }))
  }

  const handleDeselectAllCategory = (category: string) => {
    const categoryPermissions = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES] as readonly string[]
    const updates: Record<string, boolean> = {}
    categoryPermissions.forEach((perm) => {
      updates[perm] = false
    })
    setPermissions((prev) => ({ ...prev, ...updates }))
  }

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Template name is required')
      return
    }

    try {
      if (mode === 'create') {
        await createTemplate.mutateAsync({
          template_name: templateName.trim(),
          description: description.trim() || null,
          ...permissions,
        } as any)
      } else if (mode === 'edit' && templateId) {
        await updateTemplate.mutateAsync({
          templateId,
          updates: {
            description: description.trim() || null,
            ...permissions,
          } as any,
        })
      }
      onOpenChange(false)
    } catch (error) {
      // Error handled by mutation hooks
    }
  }

  // Calculate permission stats
  const enabledPermissions = Object.values(permissions).filter(Boolean).length
  const totalPermissions = ALL_PERMISSIONS.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {mode === 'create' ? 'Create Role Template' : 'Edit Role Template'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new custom role template with specific permissions'
              : 'Modify permissions for this role template'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          {/* Template Info */}
          <div className="flex-shrink-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Project Manager, Field Supervisor"
                disabled={initialData?.is_system_default}
              />
              {initialData?.is_system_default && (
                <p className="text-xs text-muted-foreground">
                  System default template names cannot be changed
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this role's responsibilities"
                rows={2}
              />
            </div>

            {/* Stats Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {enabledPermissions} / {totalPermissions} permissions enabled
              </Badge>
            </div>
          </div>

          {/* Permissions Grid */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              <Accordion type="multiple" defaultValue={Object.keys(PERMISSION_CATEGORIES)} className="space-y-2">
                {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => {
                  const categoryPerms = perms as readonly string[]
                  const enabledCount = categoryPerms.filter((p) => permissions[p]).length
                  const totalCount = categoryPerms.length

                  return (
                    <AccordionItem key={category} value={category} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between flex-1 pr-4">
                          <div className="flex items-center gap-2">
                            {CATEGORY_ICONS[category]}
                            <span className="font-semibold text-sm">{category}</span>
                          </div>
                          <Badge
                            variant={
                              enabledCount === totalCount
                                ? 'default'
                                : enabledCount > 0
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {enabledCount} / {totalCount}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-3 pb-2">
                          {/* Quick Actions */}
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSelectAllCategory(category)}
                              className="text-xs"
                            >
                              Select All
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeselectAllCategory(category)}
                              className="text-xs"
                            >
                              Deselect All
                            </Button>
                          </div>

                          {/* Permission Toggles */}
                          <div className="space-y-2">
                            {categoryPerms.map((perm) => {
                              const permKey = perm as PermissionKey
                              const isChecked = permissions[perm] || false

                              return (
                                <div
                                  key={perm}
                                  className="flex items-center justify-between space-x-3 rounded-md border p-3"
                                >
                                  <div className="flex-1">
                                    <Label
                                      htmlFor={`perm-${perm}`}
                                      className="text-sm font-medium cursor-pointer"
                                    >
                                      {PERMISSION_LABELS[permKey]}
                                    </Label>
                                  </div>
                                  <Switch
                                    id={`perm-${perm}`}
                                    checked={isChecked}
                                    onCheckedChange={() => handleTogglePermission(permKey)}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              createTemplate.isPending || updateTemplate.isPending || !templateName.trim()
            }
          >
            {createTemplate.isPending || updateTemplate.isPending
              ? 'Saving...'
              : mode === 'create'
              ? 'Create Template'
              : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
