'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/**
 * SALES PAGE - REDIRECTS TO DASHBOARD
 *
 * The Sales table is now accessible via the "View All Sales" modal
 * on the Executive Sales Dashboard. Direct navigation to /sales
 * is redirected to maintain a clean single-dashboard experience.
 */
export default function SalesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main dashboard - sales are accessed via the modal
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-text-secondary mt-4">Redirecting to Dashboard...</p>
        <p className="text-sm text-text-muted mt-2">Sales are now accessible via "View All Sales"</p>
      </div>
    </div>
  );
}
