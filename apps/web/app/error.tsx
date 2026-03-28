'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <p className="text-4xl mb-4">😕</p>
      <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mb-6">We hit an unexpected error.</p>
      <button
        onClick={reset}
        className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium"
      >
        Try again
      </button>
    </div>
  );
}
