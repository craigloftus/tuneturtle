import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { compression } from "vite-plugin-compression2";

const inlineCssPlugin = (): Plugin => ({
  name: "inline-css",
  apply: "build",
  transformIndexHtml(html, ctx) {
    if (!ctx?.bundle) return html;

    const linkTags = html.match(/<link\s+[^>]*rel=["']stylesheet["'][^>]*>/g) ?? [];
    if (!linkTags.length) return html;

    const cssAssetsByHref = new Map<string, string>();
    for (const asset of Object.values(ctx.bundle)) {
      if (asset.type !== "asset") continue;
      if (!asset.fileName.endsWith(".css")) continue;
      const href = `/${asset.fileName}`;
      const source =
        typeof asset.source === "string" ? asset.source : asset.source.toString();
      cssAssetsByHref.set(href, source);
    }

    const inlinedCss: string[] = [];
    let transformed = html;

    for (const tag of linkTags) {
      const hrefMatch = tag.match(/href=["']([^"']+)["']/);
      const href = hrefMatch?.[1];
      if (!href) continue;

      const css = cssAssetsByHref.get(href);
      if (!css) continue;

      transformed = transformed.replace(tag, "");
      inlinedCss.push(css);
    }

    if (!inlinedCss.length) return html;

    const styles = inlinedCss
      .map((css) => `<style data-vite-inline-css="true">${css}</style>`)
      .join("");

    return transformed.replace("</head>", `${styles}</head>`);
  },
});

export default defineConfig({
  plugins: [
    react(),
    compression(),
    inlineCssPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
        suppressWarnings: true,
      },
      manifest: {
        "name": "TuneTurtle",
        "short_name": "TuneTurtle",
        "description": "Listen to your music directly from an AWS S3 bucket",
        "display": "fullscreen",
        "background_color": "#059669",
        "theme_color": "#059669",
        "icons": [
          {
            "src": "/static/icon-maskable.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "maskable"
          },
          {
            "src": "/static/icon-144.png",
            "sizes": "144x144",
            "type": "image/png",
            "purpose": "any"
          },
          {
            "src": "/static/icon-192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any"
          },
          {
            "src": "/static/icon-512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any"
          }
        ]
      }
    }),
  ],
  server: {
    host: "0.0.0.0",
  },
  build: {
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
