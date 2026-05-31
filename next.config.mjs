/** @type {import('next').NextConfig} */
const isDesktopBuild = process.env.DESKTOP_BUILD === "1";
const googleCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://www.gstatic.com https://apis.google.com",
  "connect-src 'self' https://accounts.google.com https://www.googleapis.com https://www.gstatic.com https://*.upstash.io",
  "frame-src 'self' https://accounts.google.com",
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "media-src 'self' blob:",
].join("; ");

const nextConfig = {
  reactStrictMode: true,
  // Use a dedicated build directory for desktop builds to avoid collisions with `next dev`
  // (and Windows AV/file lock issues) that can corrupt `.next` during packaging.
  distDir: isDesktopBuild ? ".next-desktop" : ".next",
  ...(isDesktopBuild ? { output: "standalone" } : {}),
  webpack: (config, { dev }) => {
    // On some Windows setups (locked-down dirs / antivirus), webpack filesystem cache
    // can intermittently fail (ENOENT rename), causing missing chunks/manifests.
    // Disable persistent cache for stability in web + desktop builds.
    // Desktop builds frequently run in environments where antivirus/file locks
    // can corrupt webpack filesystem cache writes (ENOENT rename), causing missing chunks.
    config.cache = false;
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: googleCsp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
