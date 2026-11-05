import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    turbopack: {
        root: __dirname,
    },
    experimental: {
        // The /api rewrite proxy buffers request bodies (default 10MB). AI report uploads are
        // limited to 10MB by the backend (AI_REPORT_MAX_MB); allow multipart overhead so the
        // backend, not a truncated proxy body, decides and returns a clear 413.
        proxyClientMaxBodySize: "12mb",
        // The /api rewrite proxy times out after 30s by default. AI report summarization can take
        // up to AI_REPORT_TIMEOUT_MS (90s) plus model fallback, so allow longer proxied requests.
        proxyTimeout: 180000,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'plus.unsplash.com',
            },
        ],
    },
    async rewrites() {
        const backendOrigin = (process.env.BACKEND_URL || process.env.API_INTERNAL_URL || "http://127.0.0.1:5001").replace(/\/$/, "");
        return [
            {
                source: "/api/:path*",
                destination: `${backendOrigin}/api/:path*`
            }
        ];
    }
};

export default nextConfig;
