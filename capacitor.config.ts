import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Production package name (avoid com.example/com.test).
  appId: "com.pospro.mobile",
  appName: "POS Pro",
  // Minimal local web assets for Capacitor bootstrap. The app uses hosted renderer (server.url) by default.
  webDir: "mobile/web",
  server: {
    // Hosted renderer (same approach as desktop Electron).
    // Override at build time if needed: `CAPACITOR_SERVER_URL=https://...`
    url: process.env.CAPACITOR_SERVER_URL || "https://pos-next-js-kohl.vercel.app",
    // Prevent cleartext HTTP in production builds.
    cleartext: false,
    androidScheme: "https",
  },
  // Prevent navigation outside allowed origins unless explicitly whitelisted.
  allowNavigation: ["pos-next-js-kohl.vercel.app"],
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
    },
  },
};

export default config;
