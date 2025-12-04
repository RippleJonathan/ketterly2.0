/**
 * React Query hooks for lead measurements
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getLeadMeasurements,
  getMeasurementHistory,
  createMeasurements,
  updateMeasurements,
  deleteMeasurements,
  addMeasurementAccessory,
  updateMeasurementAccessory,
  removeMeasurementAccessory,
  type MeasurementFormData,
} from '@/lib/api/measurements'
import { useCurrentCompany } from './use-current-company'
import { toast } from 'sonner'

/**
 * Hook to fetch current measurements for a lead
 */
export function useLeadMeasurements(leadId: string) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['measurements', leadId, company?.id],
    queryFn: () => getLeadMeasurements(leadId, company!.id),
    enabled: !!company?.id && !!leadId,
  })
}

/**
 * Hook to fetch measurement history for a lead
 */
export function useMeasurementHistory(leadId: string) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['measurement-history', leadId, company?.id],
    queryFn: () => getMeasurementHistory(leadId, company!.id),
    enabled: !!company?.id && !!leadId,
  })
}

/**
 * Hook to create new measurements
 */
export function useCreateMeasurements(leadId: string) {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: MeasurementFormData) =>
      createMeasurements(leadId, company!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements', leadId] })
      queryClient.invalidateQueries({ queryKey: ['measurement-history', leadId] })
      toast.success('Measurements saved successfully')
    },
    onError: (error: Error) => {
      console.error('Error creating measurements:', error)
      toast.error(`Failed to save measurements: ${error.message}`)
    },
  })
}

/**
 * Hook to update existing measurements
 */
export function useUpdateMeasurements(leadId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ measurementId, data }: { measurementId: string; data: Partial<MeasurementFormData> }) =>
      updateMeasurements(measurementId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements', leadId] })
      queryClient.invalidateQueries({ queryKey: ['measurement-history', leadId] })
      // Toast handled by caller for manual overrides
    },
    onError: (error: Error) => {
      console.error('Error updating measurements:', error)
      toast.error(`Failed to update measurements: ${error.message}`)
    },
  })
}

/**
 * Hook to delete measurements
 */
export function useDeleteMeasurements(leadId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (measurementId: string) => deleteMeasurements(measurementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements', leadId] })
      queryClient.invalidateQueries({ queryKey: ['measurement-history', leadId] })
      toast.success('Measurements deleted successfully')
    },
    onError: (error: Error) => {
      console.error('Error deleting measurements:', error)
      toast.error(`Failed to delete measurements: ${error.message}`)
    },
  })
}

/**
 * Hook to add accessory to measurement
 */
export function useAddMeasurementAccessory(leadId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ measurementId, materialId, quantity, notes }: { 
      measurementId: string
      materialId: string
      quantity: number
      notes?: string
    }) => addMeasurementAccessory(measurementId, materialId, quantity, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements', leadId] })
      toast.success('Accessory added')
    },
    onError: (error: Error) => {
      console.error('Error adding accessory:', error)
      toast.error(`Failed to add accessory: ${error.message}`)
    },
  })
}

/**
 * Hook to update measurement accessory quantity
 */
export function useUpdateMeasurementAccessory(leadId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ accessoryId, quantity }: { accessoryId: string; quantity: number }) =>
      updateMeasurementAccessory(accessoryId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements', leadId] })
      toast.success('Quantity updated')
    },
    onError: (error: Error) => {
      console.error('Error updating accessory:', error)
      toast.error(`Failed to update quantity: ${error.message}`)
    },
  })
}

/**
 * Hook to remove accessory from measurement
 */
export function useRemoveMeasurementAccessory(leadId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (accessoryId: string) => removeMeasurementAccessory(accessoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements', leadId] })
      toast.success('Accessory removed')
    },
    onError: (error: Error) => {
      console.error('Error removing accessory:', error)
      toast.error(`Failed to remove accessory: ${error.message}`)
    },
  })
}

/**
 * Hook to auto-measure roof using Google Solar API
 * Automatically geocodes address if coordinates not provided
 */
export function useAutoMeasure(leadId: string) {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      address,
      latitude, 
      longitude 
    }: { 
      address?: string
      latitude?: number
      longitude?: number 
    }) => {
      if (!company?.id) throw new Error('Company not found')

      // Require either address or coordinates
      if (!address && (latitude === undefined || longitude === undefined)) {
        throw new Error('Either address or coordinates must be provided')
      }

      const response = await fetch('/api/measurements/auto-measure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          companyId: company.id,
          address,
          latitude,
          longitude,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze roof data')
      }

      return await response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['measurements', leadId] })
      queryClient.invalidateQueries({ queryKey: ['measurement-history', leadId] })
      
      if (data.message) {
        const quality = data.data.data_quality || 'UNKNOWN'
        const qualityLabel = quality === 'HIGH' ? '🟢 High' : quality === 'MEDIUM' ? '🟡 Medium' : '🟠 Low'
        
        toast.success(data.message, {
          description: `Data Quality: ${qualityLabel} • Complexity: ${data.data.roof_complexity} • Segments: ${data.data.segment_count}`,
          duration: 6000,
        })
      } else {
        toast.success('Roof measured successfully')
      }
    },
    onError: (error: Error) => {
      console.error('Auto-measure failed:', error)
      toast.error('Failed to analyze satellite data', {
        description: error.message,
      })
    },
  })
}
