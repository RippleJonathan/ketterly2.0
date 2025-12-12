'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { 
  Shield, 
  Search, 
  Check, 
  X, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  DollarSign,
  FileText,
  Package,
  Wrench,
  BarChart,
  Settings,
  Camera,
} from 'lucide-react'
import { useUserPermissions, useUpdatePermissions } from '@/lib/hooks/use-permissions'
import { 
  UserWithRelations, 
  UserPermissions,
  PERMISSION_CATEGORIES, 
  PERMISSION_LABELS, 
  PermissionKey,
  ALL_PERMISSIONS
} from '@/lib/types/users'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface PermissionsManagerProps {
  user?: UserWithRelations
  userId?: string
  permissions?: Partial<UserPermissions>
  onChange?: (permissions: Partial<UserPermissions>) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  isRoleEditor?: boolean // When true, renders inline without dialog wrapper
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

// Permission descriptions
const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  can_view_leads: 'View lead information and details',
  can_create_leads: 'Create new leads in the system',
  can_edit_leads: 'Modify existing lead information',
  can_delete_leads: 'Delete leads from the system',
  can_view_all_leads: 'View all company leads, not just assigned ones',
  can_view_quotes: 'View quote details and history',
  can_create_quotes: 'Generate new quotes for customers',
  can_edit_quotes: 'Modify existing quotes',
  can_delete_quotes: 'Delete quotes from the system',
  can_approve_quotes: 'Approve quotes before sending to customers',
  can_send_quotes: 'Send quotes to customers via email',
  can_view_invoices: 'View invoice details and payment history',
  can_create_invoices: 'Create new invoices',
  can_edit_invoices: 'Modify existing invoices',
  can_delete_invoices: 'Delete invoices from the system',
  can_record_payments: 'Record customer payments',
  can_void_payments: 'Void or reverse payments',
  can_view_material_orders: 'View material order details',
  can_create_material_orders: 'Create new material orders',
  can_edit_material_orders: 'Modify material orders',
  can_delete_material_orders: 'Delete material orders',
  can_mark_orders_paid: 'Mark material orders as paid',
  can_view_work_orders: 'View work order details and assignments',
  can_create_work_orders: 'Create new work orders',
  can_edit_work_orders: 'Modify work order details',
  can_delete_work_orders: 'Delete work orders',
  can_assign_crew: 'Assign crew members to projects',
  can_view_customers: 'View customer information',
  can_create_customers: 'Add new customers to the system',
  can_edit_customers: 'Modify customer information',
  can_delete_customers: 'Delete customers from the system',
  can_view_financials: 'View financial reports and profitability',
  can_view_profit_margins: 'View profit margins on jobs',
  can_view_commission_reports: 'View commission reports',
  can_export_reports: 'Export reports and analytics data',
  can_view_users: 'View user list and details',
  can_create_users: 'Create new user accounts',
  can_edit_users: 'Modify user information',
  can_delete_users: 'Delete user accounts',
  can_manage_permissions: 'Manage user permissions (admin only)',
  can_edit_company_settings: 'Modify company settings',
  can_upload_photos: 'Upload project photos',
  can_update_project_status: 'Update project status and progress',
  can_view_project_timeline: 'View project timelines and schedules',
}

export function PermissionsManager({ user, open, onOpenChange }: PermissionsManagerProps) {
  // Guard clause for user
  if (!user) {
    return null
  }

  const { data: permissionsResponse, isLoading } = useUserPermissions(user.id)
  const updatePermissions = useUpdatePermissions()
  
  const permissions = permissionsResponse?.data
  
  const [localPermissions, setLocalPermissions] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize local permissions from API response or with defaults
  useEffect(() => {
    if (permissions) {
      // User has existing permissions - load them
      const permMap: Record<string, boolean> = {}
      Object.entries(permissions).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'user_id' && key !== 'created_at' && key !== 'updated_at') {
          permMap[key] = value as boolean
        }
      })
      setLocalPermissions(permMap)
    } else if (permissionsResponse && !isLoading) {
      // User has no permissions yet - initialize with all false
      const permMap: Record<string, boolean> = {}
      ALL_PERMISSIONS.forEach((perm) => {
        permMap[perm] = false
      })
      setLocalPermissions(permMap)
    }
  }, [permissions, permissionsResponse, isLoading])

  // Track changes
  useEffect(() => {
    if (!permissions) return
    const hasChanged = Object.entries(localPermissions).some(([key, value]) => {
      return permissions[key as keyof typeof permissions] !== value
    })
    setHasChanges(hasChanged)
  }, [localPermissions, permissions])

  const handleToggle = (permission: PermissionKey) => {
    // Prevent removing own manage_permissions if they're editing themselves
    if (permission === 'can_manage_permissions' && localPermissions[permission]) {
      toast.warning('Cannot remove your own permission management access')
      return
    }

    setLocalPermissions((prev) => ({
      ...prev,
      [permission]: !prev[permission],
    }))
  }

  const handleSelectAll = (category: string) => {
    const categoryPermissions = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES] as readonly string[]
    const updates: Record<string, boolean> = {}
    categoryPermissions.forEach((perm) => {
      updates[perm] = true
    })
    setLocalPermissions((prev) => ({ ...prev, ...updates }))
  }

  const handleDeselectAll = (category: string) => {
    const categoryPermissions = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES] as readonly string[]
    const updates: Record<string, boolean> = {}
    categoryPermissions.forEach((perm) => {
      // Don't deselect manage_permissions if it's current user
      if (perm === 'can_manage_permissions' && localPermissions[perm]) {
        return
      }
      updates[perm] = false
    })
    setLocalPermissions((prev) => ({ ...prev, ...updates }))
  }

  const handleSelectAllPermissions = () => {
    const updates: Record<string, boolean> = {}
    ALL_PERMISSIONS.forEach((perm) => {
      updates[perm] = true
    })
    setLocalPermissions(updates)
    toast.success('All permissions enabled')
  }

  const handleDeselectAllPermissions = () => {
    const updates: Record<string, boolean> = {}
    ALL_PERMISSIONS.forEach((perm) => {
      // Keep manage_permissions if current user
      if (perm === 'can_manage_permissions' && localPermissions[perm]) {
        updates[perm] = true
      } else {
        updates[perm] = false
      }
    })
    setLocalPermissions(updates)
    toast.success('All permissions disabled')
  }

  const handleReset = () => {
    if (!permissions) return
    const permMap: Record<string, boolean> = {}
    Object.entries(permissions).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'user_id' && key !== 'created_at' && key !== 'updated_at') {
        permMap[key] = value as boolean
      }
    })
    setLocalPermissions(permMap)
    setHasChanges(false)
    toast.info('Changes reset')
  }

  const handleSave = async () => {
    try {
      await updatePermissions.mutateAsync({
        userId: user.id,
        permissions: localPermissions as any,
      })
      setHasChanges(false)
      onOpenChange?.(false)
    } catch (error) {
      // Error already handled by hook
    }
  }

  // Filter permissions by search query
  const filteredCategories = Object.entries(PERMISSION_CATEGORIES).reduce((acc, [category, perms]) => {
    const filtered = perms.filter(perm => {
      const label = PERMISSION_LABELS[perm as PermissionKey].toLowerCase()
      const description = PERMISSION_DESCRIPTIONS[perm]?.toLowerCase() || ''
      const query = searchQuery.toLowerCase()
      return label.includes(query) || description.includes(query)
    })
    if (filtered.length > 0) {
      acc[category] = filtered
    }
    return acc
  }, {} as Record<string, readonly string[]>)

  // Calculate permission stats
  const totalPermissions = ALL_PERMISSIONS.length
  const enabledPermissions = Object.values(localPermissions).filter(Boolean).length
  const permissionPercentage = Math.round((enabledPermissions / totalPermissions) * 100)

  if (isLoading) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[95vh] flex flex-col">
          <DialogHeader className="flex-shrink-0 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Permissions - {user.full_name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Grant or revoke specific permissions for this user
              </DialogDescription>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-muted-foreground">Current Role</div>
              <Badge variant="outline" className="text-sm mt-1">
                {user.role}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg flex-shrink-0">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Permissions Enabled</span>
              <span className="text-xs font-bold">{enabledPermissions} / {totalPermissions}</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${permissionPercentage}%` }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAllPermissions}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Enable All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAllPermissions}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Disable All
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3 flex-shrink-0 mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Permissions List */}
        <div className="flex-1 overflow-y-auto pr-4">
          <Accordion type="multiple" defaultValue={Object.keys(PERMISSION_CATEGORIES)} className="space-y-1">
            {Object.entries(filteredCategories).map(([category, perms]) => {
              const categoryPerms = perms as readonly string[]
              const enabledCount = categoryPerms.filter(p => localPermissions[p]).length
              const totalCount = categoryPerms.length

              return (
                <AccordionItem key={category} value={category} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between flex-1 pr-4">
                          <div className="flex items-center gap-2">
                            {CATEGORY_ICONS[category]}
                            <span className="font-semibold">{category}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={enabledCount === totalCount ? "default" : enabledCount > 0 ? "secondary" : "outline"}>
                              {enabledCount} / {totalCount}
                            </Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4 pb-2">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSelectAll(category)}
                              className="text-xs"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Select All
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeselectAll(category)}
                              className="text-xs"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Deselect All
                            </Button>
                          </div>
                          <div className="space-y-1">
                            {categoryPerms.map((perm) => {
                              const permKey = perm as PermissionKey
                              const isChecked = localPermissions[perm] || false
                              const isCritical = perm === 'can_manage_permissions' || perm === 'can_delete_users'

                              return (
                                <div 
                                  key={perm} 
                                  className={cn(
                                    "flex items-center space-x-3 px-3 py-2 rounded hover:bg-muted/50 transition-colors",
                                    isChecked && "bg-primary/5"
                                  )}
                                >
                                  <Checkbox
                                    id={perm}
                                    checked={isChecked}
                                    onCheckedChange={() => handleToggle(permKey)}
                                  />
                                  <Label
                                    htmlFor={perm}
                                    className="flex-1 text-sm font-medium cursor-pointer flex items-center justify-between"
                                  >
                                    <span className="flex items-center gap-2">
                                      {PERMISSION_LABELS[permKey]}
                                      {isCritical && (
                                        <AlertTriangle className="h-3 w-3 text-orange-500" />
                                      )}
                                    </span>
                                    <span className="text-xs text-muted-foreground font-normal">
                                      {PERMISSION_DESCRIPTIONS[perm]}
                                    </span>
                                  </Label>
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
            </div>

        <DialogFooter className="gap-2 flex-shrink-0 pt-3 border-t mt-3">
          <div className="flex-1 flex items-center gap-2">
            {hasChanges && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Unsaved changes</span>
              </div>
            )}
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            onClick={handleReset}
            disabled={!hasChanges}
          >
            Reset
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange?.(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updatePermissions.isPending || !hasChanges}
          >
            {updatePermissions.isPending ? 'Saving...' : 'Save Permissions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
