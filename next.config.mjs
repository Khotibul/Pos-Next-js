/** @type {import('next').NextConfig} */
const isDesktopBuild = process.env.DESKTOP_BUILD === "1";
const nextConfig = {
  reactStrictMode: true,
  // Use a dedicated build directory for desktop builds to avoid collisions with `next dev`
  // (and Windows AV/file lock issues) that can corrupt `.next` during packaging.
  distDir: isDesktopBuild ? ".next-desktop" : ".next",
  ...(isDesktopBuild ? { output: "standalone" } : {}),
  webpack: (config, { dev }) => {
    // On some Windows setups (locked-down dirs / antivirus), webpack filesystem cache
    // can intermittently fail (ENOENT rename), causing missing chunks/manifests.
    // Disable persistent cache in dev for stability.
    // Desktop builds frequently run in environments where antivirus/file locks
    // can corrupt webpack filesystem cache writes (ENOENT rename), causing missing chunks.
    // Disable persistent cache in dev and for desktop standalone builds.
    if (dev || isDesktopBuild) config.cache = false;
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
};

export default nextConfig;
