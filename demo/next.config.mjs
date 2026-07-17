/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/api/ask": ["./data/chunks.json"]
  }
};

export default nextConfig;
