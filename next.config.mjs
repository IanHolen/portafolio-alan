/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'udistfvjicapcfmyqwut.supabase.co' },
    ],
  },
};
export default nextConfig;
