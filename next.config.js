/** @type {import('next').NextConfig} */
const nextConfig = {
  // appDir is enabled by default in Next.js 14+
  async redirects() {
    return [
      { source: '/connect', destination: '/dashboard/inbox', permanent: true },
      { source: '/inbox', destination: '/dashboard/inbox', permanent: true },
      { source: '/inbox/:id', destination: '/dashboard/inbox/:id', permanent: true },
    ];
  },
}

module.exports = nextConfig
