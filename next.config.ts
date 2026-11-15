import type { NextConfig } from 'next';

// The development-only check route lives in `page.dev.tsx`. The `dev.tsx`
// extension is a page extension only in development, so production builds
// omit the route.
const baseExtensions = ['tsx', 'ts', 'jsx', 'js'];
const pageExtensions =
  process.env.NODE_ENV === 'development'
    ? [...baseExtensions, 'dev.tsx']
    : baseExtensions;

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  pageExtensions,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
