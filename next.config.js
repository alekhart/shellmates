/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable if you need to serve skill.md as a static file
  async rewrites() {
    return [
      {
        source: '/skill.md',
        destination: '/api/skill',
      },
    ];
  },
};

module.exports = nextConfig;
