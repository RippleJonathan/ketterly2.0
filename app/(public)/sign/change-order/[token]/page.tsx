'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Check } from 'lucide-react'
import { SignaturePad } from '@/components/ui/signature-pad'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCurrency } from '@/lib/utils/formatting'
import { toast } from 'sonner'

export default function ChangeOrderSignaturePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [changeOrder, setChangeOrder] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Signature form state
  const [signerName, setSignerName] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchChangeOrder = async () => {
      try {
        const response = await fetch(`/api/public/change-order/${token}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to load change order')
        }

        const data = await response.json()
        setChangeOrder(data)
        setSignerName(data.lead?.full_name || '')
      } catch (err: any) {
        setError(err.message || 'Failed to load change order')
      } finally {
        setLoading(false)
      }
    }

    fetchChangeOrder()
  }, [token])

  const handleSign = async () => {
    if (!signerName.trim()) {
      toast.error('Please enter your name')
      return
    }

    if (!signatureDataUrl) {
      toast.error('Please provide your signature')
      return
    }

    if (!acceptedTerms) {
      toast.error('Please accept the terms and conditions')
      return
    }

    try {
      setSigning(true)
      setError(null)

      const response = await fetch('/api/change-orders/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          share_token: token,
          signer_name: signerName,
          signature_data: signatureDataUrl,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to sign change order')
      }

      setSuccess(true)
      toast.success('Change order signed successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to sign change order')
      toast.error(err.message || 'Failed to sign change order')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error && !changeOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Change Order</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Change Order Signed!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for signing the change order. Our team will review and approve it shortly.
          </p>
          <p className="text-sm text-gray-500">
            You will receive a confirmation email once the change order is fully executed.
          </p>
        </div>
      </div>
    )
  }

  const company = changeOrder?.company
  const lead = changeOrder?.lead

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {company?.logo_url && (
            <img 
              src={company.logo_url} 
              alt={company.name}
              className="h-16 mb-4"
            />
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {company?.name || 'Change Order'}
          </h1>
          <p className="text-gray-600">Change Order Signature Required</p>
        </div>

        {/* Change Order Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Change Order Details</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Change Order #</p>
              <p className="font-semibold">{changeOrder?.change_order_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Customer</p>
              <p className="font-semibold">{lead?.full_name}</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-1">Title</p>
            <p className="font-semibold text-lg">{changeOrder?.title}</p>
          </div>

          {changeOrder?.description && (
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-1">Description</p>
              <p className="text-gray-700">{changeOrder.description}</p>
            </div>
          )}

          {/* Show line items */}
          {changeOrder?.line_items && changeOrder.line_items.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3 font-semibold">Line Items:</p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-700">Description</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-700">Qty</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-700">Unit Price</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changeOrder.line_items.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b last:border-b-0">
                        <td className="px-4 py-3 text-sm">
                          {item.description}
                          {item.notes && (
                            <div className="text-xs text-gray-500 mt-1">{item.notes}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="border-t border-b py-3 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Subtotal of Changes:</span>
              <span className="font-medium">{formatCurrency(changeOrder?.amount || 0)}</span>
            </div>
            {changeOrder?.tax_amount > 0 && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-600">Tax:</span>
                <span className="font-medium">{formatCurrency(changeOrder.tax_amount)}</span>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total Change Order Amount:</span>
              <span className="text-amber-600">{formatCurrency(changeOrder?.total || changeOrder?.amount || 0)}</span>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Signature</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="signer-name">Full Name *</Label>
              <Input
                id="signer-name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Your full name"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Signature *</Label>
              <div className="mt-1">
                <SignaturePad
                  onSave={(data) => setSignatureDataUrl(data)}
                  width={700}
                  height={200}
                />
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
              />
              <label htmlFor="terms" className="text-sm text-gray-700 leading-tight">
                I acknowledge that this electronic signature is legally binding and constitutes my acceptance of the terms and conditions outlined in this change order.
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
                {error}
              </div>
            )}

            <Button
              onClick={handleSign}
              disabled={!signerName || !signatureDataUrl || !acceptedTerms || signing}
              className="w-full bg-amber-600 hover:bg-amber-700"
              size="lg"
            >
              {signing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing...
                </>
              ) : (
                'Sign Change Order'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
