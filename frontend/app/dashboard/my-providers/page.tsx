import { MyProvidersPageClient } from "./components/my-providers-page-client";

export const metadata = {
  title: "Provider 管理",
  description: "管理您的私有提供商、查看共享和公共提供商",
};

/**
 * Provider 管理页面 - 服务端组件
 * 
 * 注意：此页面需要用户登录，且数据依赖客户端的 userId。
 * 服务端无法获取 userId（存储在客户端 auth store），
 * 因此不进行服务端预取，让客户端直接请求。
 */
export default function MyProvidersPage() {
  return <MyProvidersPageClient />;
}
