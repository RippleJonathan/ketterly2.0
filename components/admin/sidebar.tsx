'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Users, 
  Users2,
  UserCog,
  Calendar,
  Settings,
  Menu,
  X,
  Shield,
  CreditCard,
  FileText,
  DollarSign,
  BarChart3,
  User,
  FolderOpen,
  MapPin
} from 'lucide-react'
import { useState } from 'react'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { DynamicSidebarHeader } from './dynamic-sidebar-header'
import { useCheckPermission } from '@/lib/hooks/use-permissions'
import { useManagedLocations } from '@/lib/hooks/use-location-admin'

interface NavItem {
  name: string
  href: string
  icon: any
  permission?: string // Required permission key
  roles?: string[] // Legacy: allowed roles (deprecated - use permission instead)
  comingSoon?: boolean
}

// Sales workflow navigation
const salesNavigation: NavItem[] = [
  { 
    name: 'Dashboard', 
    href: '/admin/dashboard', 
    icon: LayoutDashboard,
    // Everyone can see dashboard
  },
  { 
    name: 'Leads', 
    href: '/admin/leads', 
    icon: Users,
    permission: 'can_view_leads'
  },
  { 
    name: 'Calendar', 
    href: '/admin/calendar', 
    icon: Calendar,
    permission: 'can_view_calendar'
  },
]

// Office workflow navigation
const officeNavigation: NavItem[] = [
  { 
    name: 'Documents', 
    href: '/admin/documents', 
    icon: FolderOpen,
    // Everyone can view documents (company isolation via RLS)
  },
  { 
    name: 'Reports', 
    href: '/admin/reports', 
    icon: BarChart3,
    // No permission check for now - everyone can see reports
    comingSoon: true
  },
]

// Settings navigation
const settingsNavigation: NavItem[] = [
  { 
    name: 'Profile', 
    href: '/admin/profile', 
    icon: User,
    // Everyone can access their own profile
  },
  { 
    name: 'Users', 
    href: '/admin/users', 
    icon: Users2,
    permission: 'can_view_users' // Checks user permissions (admin, office, etc.)
  },
  { 
    name: 'Settings', 
    href: '/admin/settings', 
    icon: Settings,
    roles: ['admin', 'super_admin'] // Company-wide settings only for top admins
  },
  { 
    name: 'Commission Plans', 
    href: '/admin/settings/commission-plans', 
    icon: CreditCard,
    roles: ['admin', 'super_admin'] // Company-wide only
  },
  {
    name: 'Locations',
    href: '/admin/settings/locations',
    icon: MapPin,
    roles: ['admin', 'super_admin', 'office'] // Office users can manage their location pricing
  },
  { 
    name: 'Role Permissions', 
    href: '/admin/settings/role-permissions', 
    icon: Shield,
    roles: ['admin', 'super_admin'] // Company-wide only
  },
]

// Navigation Item Component with Permission Checking
function NavItemWithPermission({ item, isActive, onClick }: { 
  item: NavItem
  isActive: boolean
  onClick: () => void
}) {
  const { data: userData } = useCurrentUser()
  const user = userData?.data
  const { isLocationAdmin } = useManagedLocations()
  const Icon = item.icon

  // Check permission if required
  const { data: hasPermission } = useCheckPermission(
    user?.id || '',
    item.permission || ''
  )

  // Check role if specified
  const hasRole = !item.roles || (user?.role && item.roles.includes(user.role))

  // Debug logging for Users page
  if (item.href === '/admin/users' && user) {
    console.log('🔍 Users Page Check:', {
      itemName: item.name,
      userRole: user.role,
      permission: item.permission,
      hasPermission,
      hasRole,
      userId: user.id
    })
  }

  // Show if:
  // 1. No permission/role required, OR
  // 2. User has required permission (e.g., can_view_users), OR
  // 3. User has required role
  const canSee = (!item.permission && !item.roles) || hasPermission === true || hasRole

  if (!canSee) return null

  // Render "Coming Soon" items as disabled
  if (item.comingSoon) {
    return (
      <li>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed">
          <Icon className="w-5 h-5" />
          <span>{item.name}</span>
          <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
            Soon
          </span>
        </div>
      </li>
    )
  }

  return (
    <li>
      <Link
        href={item.href}
        onClick={onClick}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
          transition-colors
          ${
            isActive
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }
        `}
      >
        <Icon className="w-5 h-5" />
        <span>{item.name}</span>
      </Link>
    </li>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { data: company } = useCurrentCompany()

  const closeMenu = () => setMobileMenuOpen(false)

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg border border-gray-200"
      >
        {mobileMenuOpen ? (
          <X className="w-6 h-6 text-gray-700" />
        ) : (
          <Menu className="w-6 h-6 text-gray-700" />
        )}
      </button>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-40
          transform transition-transform duration-200 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static
          w-64 flex flex-col
        `}
      >
        {/* Company Header / Dynamic Page Header */}
        <DynamicSidebarHeader />

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          {/* Sales Section */}
          <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Sales
          </p>
          <ul className="space-y-1 mb-6">
            {salesNavigation.map((item) => (
              <NavItemWithPermission
                key={item.name}
                item={item}
                isActive={pathname === item.href}
                onClick={closeMenu}
              />
            ))}
          </ul>

          {/* Office Section */}
          <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Office
          </p>
          <ul className="space-y-1 mb-6">
            {officeNavigation.map((item) => (
              <NavItemWithPermission
                key={item.name}
                item={item}
                isActive={pathname === item.href}
                onClick={closeMenu}
              />
            ))}
          </ul>

          {/* Settings Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Settings
            </p>
            <ul className="space-y-1">
              {settingsNavigation.map((item) => (
                <NavItemWithPermission
                  key={item.name}
                  item={item}
                  isActive={pathname === item.href}
                  onClick={closeMenu}
                />
              ))}
            </ul>
          </div>
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {company?.name?.[0] || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {company?.name}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {company?.contact_email}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
