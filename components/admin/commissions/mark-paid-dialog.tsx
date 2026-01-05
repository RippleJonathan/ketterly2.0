'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, DollarSign } from 'lucide-react'

import { LeadCommissionWithRelations } from '@/lib/types/commissions'
import { markCommissionPaid } from '@/lib/actions/commissions'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'

const markPaidSchema = z.object({
  paid_date: z.date({
    required_error: 'Paid date is required',
  }),
  payment_reference: z.string().min(1, 'Payment reference is required'),
})

type MarkPaidFormData = z.infer<typeof markPaidSchema>

interface MarkPaidDialogProps {
  commission: LeadCommissionWithRelations
  onSuccess?: () => void
}

export function MarkPaidDialog({ commission, onSuccess }: MarkPaidDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<MarkPaidFormData>({
    resolver: zodResolver(markPaidSchema),
    defaultValues: {
      paid_date: new Date(),
      payment_reference: '',
    },
  })

  const onSubmit = async (data: MarkPaidFormData) => {
    setIsSubmitting(true)
    try {
      const result = await markCommissionPaid(
        commission.id,
        data.paid_date.toISOString(),
        data.payment_reference
      )

      if (result.success) {
        toast.success('Commission marked as paid successfully')
        setOpen(false)
        form.reset()
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to mark commission as paid')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <DollarSign className="mr-2 h-4 w-4" />
          Mark Paid
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mark Commission as Paid</DialogTitle>
          <DialogDescription>
            Record payment details for this commission. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Commission Details */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">User:</span>
                <span className="text-sm font-medium">{commission.user?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Amount:</span>
                <span className="text-sm font-medium">
                  ${commission.calculated_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {commission.balance_owed !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Balance Owed:</span>
                  <span className={`text-sm font-medium ${commission.balance_owed > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${Math.abs(commission.balance_owed).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            {/* Paid Date */}
            <FormField
              control={form.control}
              name="paid_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Paid Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full pl-3 text-left font-normal"
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date('1900-01-01')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    The date when this commission was paid
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Reference */}
            <FormField
              control={form.control}
              name="payment_reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Reference</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Check #1234, Transfer ID, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Check number, wire transfer ID, or other payment identifier
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Marking Paid...' : 'Mark as Paid'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
