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
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  // Use a dedicated build directory for desktop builds to avoid collisions with `next dev`
  // (and Windows AV/file lock issues) that can corrupt `.next` during packaging.
  distDir: isDesktopBuild ? ".next-desktop" : ".next",
  ...(isDesktopBuild ? { output: "standalone" } : {}),
  webpack: (config) => {
    // Keep the default Next.js cache for normal web builds; disabling it makes builds
    // slower and can leave incomplete manifests on Windows. Desktop builds can still
    // opt out because packaging often runs under antivirus/file-lock pressure.
    if (isDesktopBuild || process.env.NEXT_DISABLE_WEBPACK_CACHE === "1") {
      config.cache = false;
    }
    return config;
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-avatar", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tooltip"],
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
