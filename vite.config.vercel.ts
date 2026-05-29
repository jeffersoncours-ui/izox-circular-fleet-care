// Vercel preview build: SPA mode, no Cloudflare Workers adapter.
// All data fetching is client-side (Supabase), so a static SPA shell works fine.
// Production deploys on Cloudflare Workers via the default vite.config.ts.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    spa: {
      enabled: true,
      maskPath: "/",
      prerender: {
        // Outputs dist/client/index.html — the static SPA shell
        outputPath: "/index",
      },
    },
  },
  vite: {
    // The sandbox doesn't support IPv6 (::). Force the prerender preview
    // server (used internally by TanStack Start during build) to bind to IPv4.
    preview: { host: "127.0.0.1" },
  },
});
