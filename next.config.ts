import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // ビルド時の型エラーを無視して強行する
    ignoreBuildErrors: true,
  },
  eslint: {
    // ビルド時のESLintチェック（書き方チェック）を無視する
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
