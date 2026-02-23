'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { initGA, trackPageView } from '@/lib/analytics';

export function Analytics() {
  const pathname = usePathname();
  const initRef = useRef(false);

  // Load GA script once on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    initGA();
  }, []);

  // Send page view on route change
  useEffect(() => {
    if (!pathname || typeof window === 'undefined' || !window.gtag) return;
    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (!measurementId) return;
    // Small delay so title may have updated
    const t = setTimeout(() => {
      trackPageView(pathname, document.title);
    }, 100);
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
