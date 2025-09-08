import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  headers: async () => [
    {
      // Prevent CDN caching of service worker
      source: '/sw.js',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-cache, no-store, must-revalidate, private, max-age=0',
        },
        {
          key: 'Pragma', 
          value: 'no-cache',
        },
        {
          key: 'Expires',
          value: '0',
        },
        {
          key: 'X-Robots-Tag',
          value: 'noindex',
        },
      ],
    },
    {
      // Force no-cache on main pages to ensure fresh SSR
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-cache, no-store, must-revalidate, private',
        },
      ],
    },
  ],
};

export default nextConfig;
