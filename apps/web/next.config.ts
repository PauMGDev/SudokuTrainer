import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // El engine se publica como TypeScript sin compilar (`exports` apunta a src/index.ts),
  // así que Next tiene que transpilarlo él mismo.
  transpilePackages: ['engine'],
};

export default nextConfig;
