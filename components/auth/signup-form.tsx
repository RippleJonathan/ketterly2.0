'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { toast } from 'sonner'

export function SignupForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    companyName: '',
  })

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      // 1. Sign up the user
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
        },
      })

      if (signupError) throw signupError
      if (!authData.user) throw new Error('No user returned from signup')

      // 2. Check if company exists (for existing tenants like Ripple Roofing)
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id, name')
        .eq('contact_email', formData.email.toLowerCase())
        .single()

      let companyId: string

      if (existingCompany) {
        // Joining existing company
        companyId = existingCompany.id
        toast.success(`Joined ${existingCompany.name}!`)
      } else {
        // Create new company
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: formData.companyName,
            slug: formData.companyName.toLowerCase().replace(/\s+/g, '-'),
            contact_email: formData.email,
          })
          .select()
          .single()

        if (companyError) throw companyError
        companyId = newCompany.id
      }

      // 3. Create user record in users table via API route (bypasses RLS)
      const userResponse = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authData.user.id,
          companyId,
          email: formData.email,
          fullName: formData.fullName,
        }),
      })

      if (!userResponse.ok) {
        const error = await userResponse.json()
        throw new Error(error.message || 'Failed to create user record')
      }

      toast.success('Account created successfully!')
      router.push('/admin/dashboard')
      router.refresh()
    } catch (error: any) {
      console.error('Signup error:', error)
      toast.error(error.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSignup} className="mt-8 space-y-6">
      <div className="rounded-lg bg-white shadow-xl p-8 space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <Input
            id="fullName"
            type="text"
            required
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="mt-1"
            placeholder="John Smith"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="mt-1"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <Input
            id="password"
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="mt-1"
            placeholder="••••••••"
            minLength={6}
          />
          <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
        </div>

        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
            Company Name
          </label>
          <Input
            id="companyName"
            type="text"
            required
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            className="mt-1"
            placeholder="Acme Roofing LLC"
          />
          <p className="mt-1 text-xs text-gray-500">
            If joining an existing company, use the email associated with that company
          </p>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>

        <div className="text-center text-sm">
          <span className="text-gray-600">Already have an account? </span>
          <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
            Sign in
          </Link>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900 font-medium">
          💡 Tip: If you're joining Ripple Roofing, use <strong>info@rippleroofing.com</strong> as your email
        </p>
      </div>
    </form>
  )
}
