'use client';

import { useEffect } from 'react';
import { analyticsPromise } from '@/lib/firebase';

export default function Analytics() {
  useEffect(() => {
    analyticsPromise.catch(() => {});
  }, []);
  return null;
}
