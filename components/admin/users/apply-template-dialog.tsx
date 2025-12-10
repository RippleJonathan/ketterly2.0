'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useRoleTemplates } from '@/lib/hooks/use-role-templates'
import { useApplyRoleTemplate } from '@/lib/hooks/use-role-templates'
import { UserWithRelations, PERMISSION_LABELS } from '@/lib/types/users'

interface ApplyTemplateDialogProps {
  user: UserWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApplyTemplateDialog({ user, open, onOpenChange }: ApplyTemplateDialogProps) {
  const { data: templatesResponse } = useRoleTemplates()
  const applyTemplate = useApplyRoleTemplate()
  
  const [templateId, setTemplateId] = useState<string>('')

  const templates = templatesResponse?.data || []
  const selectedTemplate = templates.find((t) => t.id === templateId)

  const handleApply = async () => {
    if (!templateId) return

    await applyTemplate.mutateAsync({
      userId: user.id,
      templateId,
    })
    setTemplateId('')
    onOpenChange(false)
  }

  // Get permissions that will be granted
  const grantedPermissions = selectedTemplate
    ? Object.entries(selectedTemplate.default_permissions)
        .filter(([_, value]) => value === true)
        .map(([key]) => key)
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Apply Role Template</DialogTitle>
          <DialogDescription>
            Apply a pre-configured permission template to {user.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select template:</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      <span>{template.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {template.base_role}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplate && (
            <div className="space-y-3">
              {selectedTemplate.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate.description}
                </p>
              )}

              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="text-sm font-semibold mb-3">
                  Permissions that will be granted ({grantedPermissions.length}):
                </h4>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1">
                    {grantedPermissions.map((perm) => (
                      <div key={perm} className="flex items-center gap-2 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        <span>{PERMISSION_LABELS[perm as keyof typeof PERMISSION_LABELS]}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="rounded-lg border p-3 bg-orange-50 border-orange-200">
                <p className="text-sm text-orange-800">
                  ⚠️ This will replace all of {user.full_name}'s current permissions
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!templateId || applyTemplate.isPending}
          >
            {applyTemplate.isPending ? 'Applying...' : 'Apply Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
