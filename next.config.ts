import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // face-api.js(TensorFlow.js)를 서버 번들에서 제외
  serverExternalPackages: ["face-api.js", "canvas", "@tensorflow/tfjs-node"],

  webpack: (config, { isServer }) => {
    // 브라우저 빌드: Node 전용 모듈 폴리필 비활성화
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        os: false,
        stream: false,
        buffer: false,
      };
    }
    return config;
  },
};

export default nextConfig;
