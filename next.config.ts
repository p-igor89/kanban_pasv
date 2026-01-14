import type { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Security headers for all routes
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Allow Next.js chunks and inline scripts (hashed)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // TODO: Replace with nonces in production
      // Allow Tailwind and inline styles (hashed)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Allow images from self, data URIs, Supabase, and external sources
      "img-src 'self' data: blob: https://*.supabase.co https:",
      // Allow fonts from self, data URIs, and Google Fonts
      "font-src 'self' data: https://fonts.gstatic.com",
      // Allow connections to Supabase and self
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      // Prevent framing by other sites
      "frame-ancestors 'none'",
      // Restrict base URI
      "base-uri 'self'",
      // Restrict form submissions
      "form-action 'self'",
      // Require all resources over HTTPS in production
      process.env.NODE_ENV === 'production' ? 'upgrade-insecure-requests' : '',
      // Block all plugins (Flash, Java, etc.)
      "object-src 'none'",
      // Restrict manifest source
      "manifest-src 'self'",
      // Restrict worker source
      "worker-src 'self' blob:",
      // Restrict media source
      "media-src 'self' blob:",
    ]
      .filter(Boolean)
      .join('; '),
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: ['camera=()', 'microphone=()', 'geolocation=()', 'interest-cohort=()'].join(', '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Security headers for all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // API routes CORS headers
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.ALLOWED_ORIGIN || 'http://localhost:3003',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token',
          },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ];
  },
};

export default withBundleAnalyzerConfig(nextConfig);
