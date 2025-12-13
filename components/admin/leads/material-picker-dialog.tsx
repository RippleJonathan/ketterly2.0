'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { searchMaterials } from '@/lib/api/materials'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Package, DollarSign, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatting'
import { Material } from '@/lib/types/materials'

interface MaterialPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectMaterial: (material: Material) => void
  companyId: string
}

export function MaterialPickerDialog({
  open,
  onOpenChange,
  onSelectMaterial,
  companyId,
}: MaterialPickerDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { data: materialsResponse, isLoading } = useQuery({
    queryKey: ['material-search', companyId, debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        // Return all active materials if no search
        const supabase = createClient()
        const { data, error } = await supabase
          .from('materials')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('name')
          .limit(50)
        
        if (error) throw error
        return { data: data || [], error: null }
      }
      return searchMaterials(companyId, debouncedQuery, 50)
    },
    enabled: open,
  })

  const materials = materialsResponse?.data || []

  const handleSelectMaterial = (material: Material) => {
    onSelectMaterial(material)
    onOpenChange(false)
    setSearchQuery('')
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      shingles: 'bg-red-100 text-red-800',
      underlayment: 'bg-blue-100 text-blue-800',
      ventilation: 'bg-green-100 text-green-800',
      flashing: 'bg-yellow-100 text-yellow-800',
      fasteners: 'bg-purple-100 text-purple-800',
      siding: 'bg-orange-100 text-orange-800',
      windows: 'bg-cyan-100 text-cyan-800',
      gutters: 'bg-gray-100 text-gray-800',
      other: 'bg-gray-100 text-gray-800',
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Material from Database</DialogTitle>
          <DialogDescription>
            Search your materials database and add items to this estimate
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, manufacturer, or product line..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Results */}
          <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Searching materials...
              </div>
            ) : materials.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No materials found</p>
                {searchQuery && (
                  <p className="text-sm mt-1">Try a different search term</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {materials.map((material) => (
                  <button
                    key={material.id}
                    onClick={() => handleSelectMaterial(material)}
                    className="w-full p-4 hover:bg-gray-50 transition-colors text-left flex items-center justify-between group"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {material.name}
                        </span>
                        <Badge className={getCategoryColor(material.category)}>
                          {material.category}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        {material.manufacturer && (
                          <span className="mr-3">{material.manufacturer}</span>
                        )}
                        {material.product_line && (
                          <span className="mr-3">• {material.product_line}</span>
                        )}
                        <span>• {material.unit}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        {material.current_cost && (
                          <div className="flex items-center gap-1 text-green-600">
                            <DollarSign className="h-3 w-3" />
                            <span className="font-medium">
                              {formatCurrency(material.current_cost)}/{material.unit}
                            </span>
                          </div>
                        )}
                        {material.default_per_square && (
                          <span className="text-gray-500">
                            ~{material.default_per_square} per square
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
            <p>
              <strong>💡 Tip:</strong> Select a material to automatically populate
              description, unit, and cost. You can adjust quantity and pricing after.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
