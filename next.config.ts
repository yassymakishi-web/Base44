import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. ビルド時の型エラー（TypeScript Error）を無視する
  typescript: {
    ignoreBuildErrors: true,
  },
  // 2. ビルド時のコード書き方チェック（ESLint）を無視する
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
