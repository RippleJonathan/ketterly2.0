'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface QuickAddLeadButtonProps {
  variant?: 'default' | 'outline'
}

export function QuickAddLeadButton({ variant = 'default' }: QuickAddLeadButtonProps) {
  return (
    <Button
      asChild
      size={variant === 'default' ? 'sm' : variant === 'outline' ? 'default' : 'sm'}
      variant={variant}
      className="gap-2"
    >
      <Link href="/admin/leads/new">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Add Lead</span>
      </Link>
    </Button>
  )
}
