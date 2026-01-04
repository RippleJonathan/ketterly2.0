'use client'

import { useState } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { useManagedLocations } from '@/lib/hooks/use-location-admin'
import { useCreateCompanyNotification, useCreateLocationNotification } from '@/lib/hooks/use-notifications'
import { toast } from 'sonner'

export function QuickTextButton() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState('medium')
  const [isSending, setIsSending] = useState(false)

  const { data: userData } = useCurrentUser()
  const user = userData?.data
  const { managedLocationIds } = useManagedLocations()

  const createCompanyNotification = useCreateCompanyNotification()
  const createLocationNotification = useCreateLocationNotification()

  // Determine notification scope based on user role
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isOffice = user?.role === 'office'
  const canSendCompanyWide = isAdmin
  const canSendLocationWide = isAdmin || isOffice

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }

    setIsSending(true)

    try {
      // Create actual notification using the API
      await createCompanyNotification.mutateAsync({
        title: 'Company Announcement',
        message: message.trim(),
        priority: priority as 'low' | 'medium' | 'high'
      })

      setMessage('')
      setPriority('medium')
      setOpen(false)
    } catch (error) {
      // Error handling is done in the mutation
    } finally {
      setIsSending(false)
    }
  }

  const getScopeDescription = () => {
    if (canSendCompanyWide) {
      return 'This notification will be sent to all users in your company.'
    } else if (canSendLocationWide) {
      return `This notification will be sent to all users in your managed location${managedLocationIds.length > 1 ? 's' : ''}.`
    }
    return 'You do not have permission to send notifications.'
  }

  if (!canSendCompanyWide && !canSendLocationWide) {
    return null // Don't show the button if user can't send notifications
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="w-4 h-4" />
          Quick Text
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send Notification</DialogTitle>
          <DialogDescription>
            {getScopeDescription()}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your notification message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            {isSending ? 'Sending...' : 'Send Notification'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}