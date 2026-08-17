import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 16+: 로컬 네트워크 IP에서 dev 접속 시 허용 origin을 명시해야 함
  allowedDevOrigins: ["172.30.1.1", "172.16.4.248", "192.168.219.107"],
  // 모노레포/중첩 lockfile 환경에서 Turbopack 루트 추론 경고를 방지
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
