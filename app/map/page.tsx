'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MapRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/explore'); }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-pulse text-slate">Redirecting to Explore...</div>
    </div>
  );
}
