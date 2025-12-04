'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function TestAutoMeasurePage() {
  const [leadId, setLeadId] = useState('')
  const [latitude, setLatitude] = useState('30.2672') // Austin, TX default
  const [longitude, setLongitude] = useState('-97.7431')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  // Test addresses with known coordinates
  const testAddresses = [
    {
      name: 'White House',
      lat: 38.8977,
      lng: -77.0365,
      address: '1600 Pennsylvania Avenue NW, Washington, DC'
    },
    {
      name: 'Apple Park',
      lat: 37.3318,
      lng: -122.0312,
      address: '1 Infinite Loop, Cupertino, CA'
    },
    {
      name: 'Austin, TX House',
      lat: 30.2672,
      lng: -97.7431,
      address: 'Austin, TX'
    }
  ]

  const handleTest = async () => {
    if (!leadId || !latitude || !longitude) {
      toast.error('Please fill in all fields')
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      // Get company ID from current user
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please log in first')
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData) {
        toast.error('User data not found')
        return
      }

      // Call the auto-measure API
      const response = await fetch('/api/measurements/auto-measure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          companyId: userData.company_id,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to measure roof')
      }

      setResult(data)
      toast.success(data.message || 'Roof measured successfully!')

    } catch (error) {
      console.error('Test failed:', error)
      toast.error(error instanceof Error ? error.message : 'Test failed')
    } finally {
      setIsLoading(false)
    }
  }

  const loadTestAddress = (address: typeof testAddresses[0]) => {
    setLatitude(address.lat.toString())
    setLongitude(address.lng.toString())
    toast.info(`Loaded: ${address.name}`)
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Auto-Measure Roof Test</h1>
          <p className="text-muted-foreground mt-2">
            Test the Google Solar API integration
          </p>
        </div>

        {/* Test Address Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Test Addresses</CardTitle>
            <CardDescription>Click to load coordinates for known locations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {testAddresses.map((addr) => (
                <Button
                  key={addr.name}
                  variant="outline"
                  onClick={() => loadTestAddress(addr)}
                >
                  {addr.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Test Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="leadId">Lead ID (UUID)</Label>
              <Input
                id="leadId"
                placeholder="Enter a lead ID from your database"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Go to /admin/leads and copy a lead ID from the URL
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </div>
            </div>

            <Button 
              onClick={handleTest} 
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Analyzing Satellite Data...' : 'Test Auto-Measure'}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-900">Success! 🎉</CardTitle>
              <CardDescription>{result.message}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Actual Squares</p>
                  <p className="text-2xl font-bold">{result.data.actual_squares}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total w/ Waste</p>
                  <p className="text-2xl font-bold">{result.data.total_squares}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Roof Pitch</p>
                  <p className="text-2xl font-bold">{result.data.roof_pitch}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Complexity</p>
                  <p className="text-2xl font-bold capitalize">{result.data.roof_complexity}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">Pitch (degrees):</span>{' '}
                  <strong>{result.data.roof_pitch_degrees}°</strong>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Roof Segments:</span>{' '}
                  <strong>{result.data.segment_count}</strong>
                </p>
                {result.data.satellite_date && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Imagery Date:</span>{' '}
                    <strong>{new Date(result.data.satellite_date).toLocaleDateString()}</strong>
                  </p>
                )}
                <p className="text-sm">
                  <span className="text-muted-foreground">Measurement ID:</span>{' '}
                  <code className="text-xs bg-white px-2 py-1 rounded">{result.data.id}</code>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <code className="bg-muted px-2 py-1 rounded">/admin/leads</code> and open any lead</li>
              <li>Copy the lead ID from the URL (e.g., <code className="bg-muted px-2 py-1 rounded">/admin/leads/[this-is-the-id]</code>)</li>
              <li>Paste the lead ID above</li>
              <li>Choose a test address or enter custom coordinates</li>
              <li>Click "Test Auto-Measure"</li>
              <li>The system will fetch satellite data and save measurements to the database</li>
            </ol>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="font-medium text-blue-900">💡 Tip:</p>
              <p className="text-blue-800 mt-1">
                After testing, go to the lead's Estimates tab to see the auto-measure button in action!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
