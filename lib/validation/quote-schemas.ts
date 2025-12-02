// Zod validation schemas for quotes
import { z } from 'zod'
import { LineItemCategory } from '@/lib/types/quotes'

export const lineItemSchema = z.object({
  category: z.nativeEnum(LineItemCategory),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required (e.g., sqft, hours, each)'),
  unit_price: z.number().min(0, 'Unit price must be 0 or greater'),
  cost_per_unit: z.number().min(0).optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
})

export const quoteFormSchema = z.object({
  option_label: z.string().optional(),
  tax_rate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100%'),
  discount_amount: z.number().min(0, 'Discount cannot be negative'),
  payment_terms: z.string().min(1, 'Payment terms are required'),
  notes: z.string().optional(),
  valid_until: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    z.date(),
  ]).transform((val) => typeof val === 'string' ? val : val.toISOString().split('T')[0]),
  line_items: z
    .array(lineItemSchema)
    .min(1, 'At least one line item is required'),
})

export type QuoteFormValues = z.infer<typeof quoteFormSchema>
export type LineItemFormValues = z.infer<typeof lineItemSchema>
