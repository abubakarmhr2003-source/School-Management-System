const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

module.exports = {
  poweredByHeader: false,
  devIndicators: false, // hides the "Rendering..." / route badge Next.js shows at the bottom in dev mode
  serverExternalPackages: ['postgres', 'nodemailer', 'read-excel-file'],
  experimental: {
    serverActions: { bodySizeLimit: '3mb' },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
