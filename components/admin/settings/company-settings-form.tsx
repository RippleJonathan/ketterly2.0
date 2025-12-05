'use client'

import { useState, useEffect, useRef } from 'react'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, Upload, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'

const DEFAULT_CONTRACT_TERMS = `With this contract, [Company Name] sets forth the agreement between [Company Name] and the Customer (hereinafter "Customer") to establish the working terms for work to be completed at the service address. In addition to the working terms, this contract also establishes the agreed upon payment schedule between [Company Name] and Customer.


Liability Disclosure Addendum

1. I understand that this is a construction site, and agree to use caution when entering and exiting my property and to ensure the safety of my family members, friends, children and pets on the premises. I understand and accept the risks of falling debris and errant nails. It is my responsibility to use reasonable caution and I agree to release and hold harmless [Company Name], of any responsibility for any injury, damage to property or death that may occur due in part or in whole to any negligence on my part. I understand it is my responsibility to secure any items in my home that may be fragile or might fall resulting in injury or death. Any damage to any items is the sole responsibility of Customer.

2. All vehicles operated by employees are rated for driveway usage and any damage and/or cracks resulting from routine driveway usage and/or parking in the driveway to complete the job is not the responsibility of [Company Name].

3. I understand that any punctured lines are not the responsibility of [Company Name] during the installation process. Code provides for installation standards for roofing and all code standards are followed by [Company Name]. In the event that an electric, HVAC, Plumbing, etc. line is damaged during the installation process, it is the sole responsibility of Customer to repair.

Right of Rescission and Property Disclosure

You have the right to cancel this contract within 3 business days of the contract date under TX State Law. By initialing here I confirm that I have been informed of the cancellation information found on this contract titled "Notice of Cancellation for Contract".

Cancellation I choose to cancel this contract


Customer Signature_____________________________Date______________

4. I understand that a [Company Name] Representative is available upon request to inspect all furnace vent connections that may become unattached during the roofing process. I understand it is my responsibility to ensure these connections are secure or request a [Company Name] Representative to inspect the crucial connections, so that Carbon Monoxide does not enter my dwelling. I agree that this is my responsibility to ensure the safety of my family and agree to hold harmless [Company Name] of all liability associated with Carbon Monoxide and/or furnace vent connections. I further understand that Carbon Monoxide is a deadly Gas and Serious injury or death may occur as a result of furnace vents becoming disconnected.

5. In the event of rotten decking, [Company Name] will repair and/or replace rotten decking at the expense of Customer. Not replacing rotten decking will void your manufacturer warranty as well as your 10-Year Workmanship Warranty from [Company Name].

6. A new roofing system will not remedy existing issues to framing, decking, fascia or soffit. If agreed upon in writing in the special instructions above, any of these type of repairs can be made at the expense and request of Customer prior to the installation of the roof. However, these repairs are not a part of the scope of work, unless otherwise noted and repairs to these items cannot be completed after the installation of the roofing system.

7. Venue: All suits arising out of or related to this agreement shall be filed in the courts of Travis County, Texas.

8. Warranty: [Company Name] includes a [Replacement Warranty]-Year Workmanship Warranty on all [Company Name] roofing systems, which protects against poor workmanship. Repairs include a [Repair Warranty]-year workmanship warranty. [Company Name] is not responsible for normal wear and tear. See complete warranty information for details. Warranty begins upon payment in full of total contract amount and approved supplements. Warranty will be voided by unpaid contract.

9. Payments: Failure to make first payment may result in work stoppage. [Company Name] is not liable for damages that may occur due to work stoppage for failure to make initial contract payment to property. This includes but is not limited to flooding, water damage, theft of material, etc. Final roof payment is due to [Company Name] upon roof completion. Any and all trade payments are due upon completion of trade. Final payments not received within 30 days of completion will be considered failure to pay and will be subject to Failure to Pay Penalties. See Failure to Pay Penalties for further details.

10. Failure to Pay Penalties: 10% penalty assessed against the total remainder due, all discounts will be revoked at the sole discretion of [Company Name] and the account is subject to being sent to a 3rd party collections agency. Failure to pay may also result in Theft of Service charges being filed per TX law in addition to any necessary civil remedies.

11. Notice of Cancellation for Contract: If I choose to exercise my 3 Day Right of Rescission, I understand that by signing and dating in the space provided will make this contract null and void and no work will be provided by [Company Name]. I understand it is my responsibility to mail 1 copy of this cancelled contract to the corporate office of [Company Name] to [Company Address] or to [Company Email] post marked or time stamped no later than 3 business days after the date and time that this contract was executed. In the event that your insurance company denies a filed claim a pre-contract will be cancelled with proof of denial. Contracts cancelled outside of this period may result in a restocking fee not to exceed 25% of the total contracted amount.

12. Note: [Company Name] Sales Representatives do not make verbal contracts and any terms not disclosed on a contract are considered null and void.

13. Payment Methods: We accept personal checks, money orders, cashiers checks or credit cards. (Make checks payable to [Company Name]) There is a 3.0% processing fee for credit card transactions. Returned checks will result in a returned check fee of $50 and/or potential hot check charges filed with the appropriate authorities.

*** TX law requires a person insured under a property insurance policy to pay any deductible applicable to a claim made under the policy. It is a violation of TX law for a seller of goods or services who reasonably expects to be paid wholly or partly from the proceeds of a property insurance claim to knowingly allow the insured person to fail to pay, or assist the insured person's failure to pay, the applicable insurance deductible. ***`

export function CompanySettingsForm() {
  const { data: company, isLoading } = useCurrentCompany()
  const queryClient = useQueryClient()
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    contact_phone: '',
    contact_email: '',
    logo_url: '',
    replacement_warranty_years: 10,
    repair_warranty_years: 1,
    contract_terms: '',
    tax_rate: 0,
  })

  useEffect(() => {
    if (company) {
      console.log('Loading company data:', company)
      setFormData({
        name: company.name || '',
        address: company.address || '',
        city: company.city || '',
        state: company.state || '',
        zip: company.zip || '',
        contact_phone: company.contact_phone || '',
        contact_email: company.contact_email || '',
        logo_url: company.logo_url || '',
        replacement_warranty_years: company.replacement_warranty_years || 10,
        repair_warranty_years: company.repair_warranty_years || 1,
        contract_terms: company.contract_terms || '',
        tax_rate: company.tax_rate || 0,
      })
    }
  }, [company])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return

    setIsSaving(true)
    try {
      const supabase = createClient()
      
      console.log('Saving company data:', formData)
      
      const { data, error } = await supabase
        .from('companies')
        .update(formData)
        .eq('id', company.id)
        .select()

      if (error) throw error
      
      console.log('Saved successfully:', data)

      // Invalidate the company cache to refetch fresh data
      await queryClient.invalidateQueries({ queryKey: ['current-company'] })
      
      toast.success('Company settings updated successfully')
    } catch (error) {
      console.error('Failed to update company settings:', error)
      toast.error('Failed to update settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUseTemplate = () => {
    let template = DEFAULT_CONTRACT_TERMS
      .replace(/\[Company Name\]/g, company?.name || '[Company Name]')
      .replace(/\[Company Address\]/g, company?.address || '[Company Address]')
      .replace(/\[Company Email\]/g, company?.contact_email || '[Company Email]')
      .replace(/\[Replacement Warranty\]/g, formData.replacement_warranty_years?.toString() || '10')
      .replace(/\[Repair Warranty\]/g, formData.repair_warranty_years?.toString() || '1')

    setFormData(prev => ({
      ...prev,
      contract_terms: template,
    }))
    toast.success('Template loaded! Review and customize as needed.')
  }

  const handleLogoUpload = async (file: File) => {
    if (!company) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    setIsUploadingLogo(true)
    try {
      const supabase = createClient()

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${company.id}/company-logos/logo-${Date.now()}.${fileExt}`

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get signed URL (since bucket is private)
      const { data: urlData } = await supabase.storage
        .from('documents')
        .createSignedUrl(fileName, 365 * 24 * 60 * 60) // 1 year expiry

      if (!urlData?.signedUrl) throw new Error('Failed to get signed URL')

      // Update form data with new logo URL
      setFormData(prev => ({ ...prev, logo_url: urlData.signedUrl }))

      toast.success('Logo uploaded successfully!')
    } catch (error) {
      console.error('Logo upload failed:', error)
      toast.error('Failed to upload logo')
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleLogoUpload(file)
    }
  }

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logo_url: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="contract">Contract Terms</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Update your company details that appear on quotes and invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Company Logo</Label>
                  <div className="space-y-3">
                    {/* Current logo preview */}
                    {formData.logo_url && (
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <img
                          src={formData.logo_url}
                          alt="Company logo"
                          className="h-12 w-auto object-contain"
                        />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Current logo</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveLogo}
                          disabled={isUploadingLogo}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* File upload */}
                    <div className="flex items-center gap-3">
                      <Input
                        ref={fileInputRef}
                        id="logo"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={isUploadingLogo}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingLogo}
                        className="flex items-center gap-2"
                      >
                        {isUploadingLogo ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG up to 5MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Phone</Label>
                  <Input
                    id="contact_phone"
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="replacement_warranty_years">Replacement Warranty (Years)</Label>
                  <Input
                    id="replacement_warranty_years"
                    type="number"
                    min="1"
                    max="50"
                    value={formData.replacement_warranty_years}
                    onChange={(e) => setFormData({ ...formData, replacement_warranty_years: parseInt(e.target.value) || 10 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="repair_warranty_years">Repair Warranty (Years)</Label>
                  <Input
                    id="repair_warranty_years"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.repair_warranty_years}
                    onChange={(e) => setFormData({ ...formData, repair_warranty_years: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Sales Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="20"
                    value={(formData.tax_rate * 100).toFixed(2)}
                    onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) / 100 || 0 })}
                    placeholder="8.25"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter as percentage (e.g., 8.25 for 8.25%). Used for material order calculations.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contract" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contract Terms & Conditions</CardTitle>
              <CardDescription>
                These terms will appear on page 2 of your quote PDFs. Customize them to match your business requirements.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUseTemplate}
                  disabled={isSaving}
                >
                  Load Default Template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData({ ...formData, contract_terms: '' })}
                  disabled={isSaving}
                >
                  Clear
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract_terms">Contract Terms</Label>
                <Textarea
                  id="contract_terms"
                  value={formData.contract_terms}
                  onChange={(e) => setFormData({ ...formData, contract_terms: e.target.value })}
                  rows={20}
                  className="font-mono text-xs"
                  placeholder="Enter your custom contract terms and conditions..."
                />
                <p className="text-xs text-muted-foreground">
                  Available placeholders: [Company Name], [Company Address], [Company Email], [Replacement Warranty], [Repair Warranty].
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4 mt-6">
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </div>
    </form>
  )
}
