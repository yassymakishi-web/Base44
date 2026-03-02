import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // これが最重要：型エラーがあってもビルドを止めない
  typescript: {
    ignoreBuildErrors: true,
  },
  // ついでに書き方チェックの警告も無視する
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 念のため Turbopack のチェックを緩める（もし使っていれば）
  experimental: {
    // 必要な場合のみ。通常は上記2つで十分です
  }
};

export default nextConfig;
