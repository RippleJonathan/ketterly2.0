import { Suspense } from 'react';
import { DoorKnockingClient } from '@/components/admin/door-knocking/door-knocking-client';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function DoorKnockingPage() {
  return (
    <div className="fixed inset-0 top-16 left-0 md:left-64">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full w-full">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }>
        <DoorKnockingClient />
      </Suspense>
    </div>
  );
}
