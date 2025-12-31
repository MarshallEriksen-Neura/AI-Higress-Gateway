import type { NextConfig } from "next";

// @ts-ignore - next-pwa doesn't have TypeScript definitions
const withPWA = require('next-pwa');
// @ts-ignore - @next/bundle-analyzer doesn't have TypeScript definitions
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // 跳过类型检查（用于快速构建分析）
  typescript: {
    ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === 'true',
  },
  
  // 生产构建优化
  compiler: {
    // 移除 console.log（仅生产环境）
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // 实验性功能
  experimental: {
    // 优化包导入
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
    ],
  },
  
  // Turbopack 配置（开发模式）
  turbopack: {},
  
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS 
    ? process.env.ALLOWED_DEV_ORIGINS.split(',') 
    : ["192.168.31.132"],
  
  // 图片优化配置
  images: {
    // 图片格式优化
    formats: ['image/avif', 'image/webp'],
    // 设备尺寸断点
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // 图片尺寸断点
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 最小化缓存时间（秒）
    minimumCacheTTL: 60,
    // 远程图片模式 - 从环境变量动态配置
    remotePatterns: (() => {
      const patterns: Array<{
        protocol: 'http' | 'https';
        hostname: string;
        port?: string;
        pathname: string;
      }> = [];
      
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      
      try {
        const url = new URL(apiBaseUrl);
        const protocol = url.protocol.replace(':', '') as 'http' | 'https';
        const port = url.port || (protocol === 'https' ? '' : '');
        
        patterns.push({
          protocol,
          hostname: url.hostname,
          ...(port && { port }),
          pathname: '/media/**',
        });
      } catch (e) {
        console.warn('Invalid NEXT_PUBLIC_API_BASE_URL, using default localhost:8000');
        patterns.push({
          protocol: 'http',
          hostname: 'localhost',
          port: '8000',
          pathname: '/media/**',
        });
      }
      
      // 添加通配符 HTTPS 支持（用于其他 CDN 或外部图片）
      patterns.push({
        protocol: 'https',
        hostname: '**',
        pathname: '/media/**',
      });
      
      return patterns;
    })(),
  },
  
  // 安全头部配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  },

  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/dashboard/overview',
        permanent: false,
      },
      {
        source: '/dashboard/providers',
        destination: '/dashboard/my-providers',
        permanent: false,
      },
    ];
  },
  
  // 生产构建输出配置
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  
  // 压缩配置
  compress: true,
  
  // 性能优化
  poweredByHeader: false, // 移除 X-Powered-By 头
  reactStrictMode: true, // 启用严格模式
};

export default withBundleAnalyzer(
  withPWA({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
  })(nextConfig)
);
