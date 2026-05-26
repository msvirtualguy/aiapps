/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    AGENT_BACKEND_URL: process.env.AGENT_BACKEND_URL || "http://localhost:8000",
  },
};

module.exports = nextConfig;
