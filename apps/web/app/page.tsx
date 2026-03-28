'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    if (user.isPendingApproval) { router.replace('/pending'); return; }
    router.replace(user.role === 'TENANT' ? '/tenant' : '/dashboard');
  }, [user, router]);

  return null;
}
