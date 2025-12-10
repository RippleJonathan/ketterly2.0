'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/lib/hooks/use-users'
import { useUpdateUser } from '@/lib/hooks/use-users'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  bio: z.string().optional(),
  specialties: z.string().optional(),
  certifications: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

export function ProfileForm() {
  const { data: userResponse } = useCurrentUser()
  const updateUser = useUpdateUser()

  const user = userResponse?.data

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      phone: user?.phone || '',
      bio: user?.bio || '',
      specialties: user?.specialties?.join(', ') || '',
      certifications: user?.certifications?.join(', ') || '',
    },
  })

  if (!user) {
    return <div>Loading...</div>
  }

  const onSubmit = async (data: ProfileFormData) => {
    const updates: any = {
      full_name: data.full_name,
      phone: data.phone || null,
      bio: data.bio || null,
      specialties: data.specialties
        ? data.specialties.split(',').map((s) => s.trim()).filter(Boolean)
        : null,
      certifications: data.certifications
        ? data.certifications.split(',').map((s) => s.trim()).filter(Boolean)
        : null,
    }

    await updateUser.mutateAsync({ userId: user.id, updates })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="(555) 123-4567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us a bit about yourself..."
                  className="resize-none"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Brief description about your role and experience
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="specialties"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specialties</FormLabel>
              <FormControl>
                <Input placeholder="Asphalt Shingles, Metal Roofing" {...field} />
              </FormControl>
              <FormDescription>Comma-separated list of your specialties</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="certifications"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Certifications</FormLabel>
              <FormControl>
                <Input placeholder="GAF Master Elite, OSHA 10" {...field} />
              </FormControl>
              <FormDescription>
                Comma-separated list of your certifications
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={updateUser.isPending}>
          {updateUser.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  )
}
