/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'udistfvjicapcfmyqwut.supabase.co' },
    ],
  },
};
export default nextConfig;
