export const dynamic = 'force-dynamic';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-background">
      <p className="text-6xl font-bold text-primary mb-4">404</p>
      <h2 className="text-lg font-semibold mb-2">Page not found</h2>
      <p className="text-sm text-muted-foreground mb-6">This page doesn't exist or has been moved.</p>
      <Link
        href="/"
        className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
