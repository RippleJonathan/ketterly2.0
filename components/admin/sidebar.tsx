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
  MapPin,
  Plus,
  LogOut,
  Bell
} from 'lucide-react'
import { useState } from 'react'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { DynamicSidebarHeader } from './dynamic-sidebar-header'
import { useCheckPermission } from '@/lib/hooks/use-permissions'
import { useManagedLocations } from '@/lib/hooks/use-location-admin'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavItem {
  name: string
  href: string
  icon: any
  permission?: string // Required permission key
  roles?: string[] // Legacy: allowed roles (deprecated - use permission instead)
  comingSoon?: boolean
}

interface SidebarProps {
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

// Sales workflow navigation
const salesNavigation: NavItem[] = [
  { 
    name: 'Add Lead', 
    href: '/admin/leads/new', 
    icon: Plus,
    permission: 'can_create_leads'
  },
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
  { 
    name: 'Door Knocking', 
    href: '/admin/door-knocking', 
    icon: MapPin,
    // Everyone can access door knocking feature
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
    name: 'Notifications', 
    href: '/admin/notifications', 
    icon: Bell,
    // Everyone can view their own notifications
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
    name: 'Locations',
    href: '/admin/settings/locations',
    icon: MapPin,
    roles: ['admin', 'super_admin', 'office'] // Office users can manage their location pricing
  },
  // Removed: Role Permissions (not needed currently)
  // { 
  //   name: 'Role Permissions', 
  //   href: '/admin/settings/role-permissions', 
  //   icon: Shield,
  //   roles: ['admin', 'super_admin'] // Company-wide only
  // },
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
  
  // Hide Users nav item completely for sales, marketing, and production roles
  const shouldHideUsersNav = item.href === '/admin/users' && user?.role && ['sales', 'marketing', 'production'].includes(user.role)

  // Check permission if required
  const { data: hasPermission } = useCheckPermission(
    user?.id || '',
    item.permission || ''
  )

  // Check role if specified
  const hasRole = !item.roles || (user?.role && item.roles.includes(user.role))

  // Show if:
  // 1. No permission/role required, OR
  // 2. User has required permission (e.g., can_view_users), OR
  // 3. User has required role
  const canSee = (!item.permission && !item.roles) || hasPermission === true || hasRole

  // Don't render if hidden or not permitted
  if (shouldHideUsersNav || !canSee) return null

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

interface SidebarProps {
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

export function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
  const pathname = usePathname()
  const { data: company } = useCurrentCompany()
  const { data: userResponse } = useCurrentUser()
  const supabase = createClient()
  const router = useRouter()
  
  const user = userResponse?.data

  const closeMenu = () => setMobileMenuOpen(false)

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Signed out successfully')
      router.push('/login')
      router.refresh()
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  return (
    <>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 px-3 py-2 w-full hover:bg-gray-50 rounded-lg transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar_url || undefined} />
                  <AvatarFallback className="text-sm">
                    {user?.full_name ? getInitials(user.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {user?.email}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  )
}
