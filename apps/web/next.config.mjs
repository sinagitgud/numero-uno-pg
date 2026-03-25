import withPWAInit from '@ducanh2912/next-pwa';

// Build-time env validation
if (!process.env.NEXT_PUBLIC_API_URL && process.env.NODE_ENV === 'production') {
  throw new Error('NEXT_PUBLIC_API_URL is required');
}

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'next-static', expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 } },
    },
    {
      urlPattern: /\/api\/(invoices|payments)\/.*/i,
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /\/api\/.*/i,
      handler: 'NetworkFirst',
      options: { cacheName: 'api-cache', networkTimeoutSeconds: 10, expiration: { maxEntries: 100, maxAgeSeconds: 60 } },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@numero-uno-pg/shared'],
};

export default withPWA(nextConfig);
