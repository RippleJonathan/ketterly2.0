export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          Ketterly
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          CRM for Roofing Companies
        </p>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Phase 0: Foundation Setup in Progress
          </p>
          <div className="flex gap-4 justify-center">
            <div className="bg-white px-6 py-3 rounded-lg shadow-sm">
              <span className="text-green-600 font-semibold">✓</span> Next.js 15
            </div>
            <div className="bg-white px-6 py-3 rounded-lg shadow-sm">
              <span className="text-green-600 font-semibold">✓</span> Supabase Connected
            </div>
            <div className="bg-white px-6 py-3 rounded-lg shadow-sm">
              <span className="text-yellow-600 font-semibold">⏳</span> Database Schema
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
