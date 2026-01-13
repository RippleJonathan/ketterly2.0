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
        
        <Link href="/login">
          <Button size="lg" className="text-lg px-8">
            Login
          </Button>
        </Link>
      </div>
    </div>
  );
}
