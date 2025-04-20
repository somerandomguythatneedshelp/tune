/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Disable static generation for upload page when Cloudinary env vars are missing
  // This prevents build errors when environment variables aren't set
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  // Add images configuration to allow external domains
  images: {
    domains: ['tune-mu.vercel.app'],
  },
  env: {
    // Explicitly expose env vars to Next.js
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
  },
  onDemandEntries: {
    // Keep pages in memory longer
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 5,
  },
}

// Check for required environment variables
const requiredEnvVars = ['NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.warn(`\x1b[33m⚠️  WARNING: Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.warn(`\x1b[33m⚠️  Some features may not work correctly. See CLOUDINARY_SETUP.md for setup instructions.\x1b[0m`);
}

module.exports = nextConfig 