import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // experimental.cacheComponents deferred — Phase 2+ when RSC tree data fetching lands
};

export default nextConfig;
