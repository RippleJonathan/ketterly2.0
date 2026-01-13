import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          Ketterly
        </h1>
        <p className="text-2xl text-gray-600 mb-8">
          CRM for Roofing Companies
        </p>
        <p className="text-lg text-gray-500 mb-12">
          Streamline your roofing business with powerful lead management, 
          quote generation, project tracking, and invoicing - all in one place.
        </p>
        
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg" className="text-lg px-8">
              Login
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Sign Up
            </Button>
          </Link>
        </div>

        <div className="mt-16 pt-16 border-t border-gray-300">
          <p className="text-sm text-gray-500 mb-4">Built with modern technology</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <div className="bg-white px-6 py-3 rounded-lg shadow-sm">
              <span className="text-green-600 font-semibold">✓</span> Next.js 15
            </div>
            <div className="bg-white px-6 py-3 rounded-lg shadow-sm">
              <span className="text-green-600 font-semibold">✓</span> Supabase
            </div>
            <div className="bg-white px-6 py-3 rounded-lg shadow-sm">
              <span className="text-green-600 font-semibold">✓</span> TypeScript
            </div>
            <div className="bg-white px-6 py-3 rounded-lg shadow-sm">
              <span className="text-green-600 font-semibold">✓</span> Tailwind CSS
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
