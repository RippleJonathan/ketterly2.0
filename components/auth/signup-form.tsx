'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { toast } from 'sonner'
import { z } from 'zod'
import { signupSchema } from '@/lib/validation/schemas'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'

export function SignupForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    companyName: '',
  })

  // Real-time password validation
  const passwordRequirements = [
    { label: 'At least 8 characters', met: formData.password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(formData.password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(formData.password) },
    { label: 'One number', met: /[0-9]/.test(formData.password) },
  ]

  const allRequirementsMet = passwordRequirements.every((req) => req.met)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate with Zod
      signupSchema.parse(formData)

      const supabase = createClient()

      // 1. Sign up the user with email verification
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/callback?next=/admin/dashboard`,
          data: {
            full_name: formData.fullName,
          },
        },
      })

      if (signupError) throw signupError
      if (!authData.user) throw new Error('No user returned from signup')

      // Check if user already exists (email already registered)
      if (authData.user.identities?.length === 0) {
        toast.error('An account with this email already exists. Please sign in instead.')
        router.push('/login')
        return
      }

      // 2. Create company and user record via server API (bypasses RLS)
      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authData.user.id,
          email: formData.email,
          fullName: formData.fullName,
          companyName: formData.companyName,
        }),
      })

      if (!signupResponse.ok) {
        const error = await signupResponse.json()
        throw new Error(error.message || 'Failed to complete signup')
      }

      const { companyName, isExistingCompany } = await signupResponse.json()

      // Show success message
      if (isExistingCompany) {
        toast.success(`Joined ${companyName}! Please check your email to verify your account.`)
      } else {
        toast.success('Account created! Please check your email to verify your account.')
      }
      
      // Note: User won't be logged in until they verify their email
      // The callback route will handle the redirect after verification
    } catch (error: any) {
      console.error('Signup error:', error)
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message)
      } else {
        toast.error(error.message || 'Failed to create account')
      }
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
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="mt-1 pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          
          {/* Password Requirements */}
          {formData.password && (
            <div className="mt-2 space-y-1">
              {passwordRequirements.map((req) => (
                <div
                  key={req.label}
                  className={`flex items-center text-xs ${
                    req.met ? 'text-green-600' : 'text-gray-500'
                  }`}
                >
                  <CheckCircle2
                    className={`w-3 h-3 mr-1.5 ${
                      req.met ? 'text-green-600' : 'text-gray-300'
                    }`}
                  />
                  {req.label}
                </div>
              ))}
            </div>
          )}
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

        <Button type="submit" className="w-full" disabled={loading || !allRequirementsMet}>
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
