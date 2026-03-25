'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    toast.success('Logged out');
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
      <h1 className="font-semibold text-base truncate">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground hidden sm:block">{user?.name}</span>
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
