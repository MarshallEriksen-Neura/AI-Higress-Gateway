import { adminService } from "@/http/admin";
import { notFound } from "next/navigation";
import { UserRolesPageClient } from "./components/user-roles-page-client";
import type { UserInfo } from "@/lib/api-types";

interface PageProps {
  params: {
    userId: string;
  };
}

export default async function UserRolesPage({ params }: PageProps) {
  const { userId } = params;

  let user: UserInfo | null = null;

  try {
    const users = await adminService.getAllUsers();
    user = (users.find((u) => u.id === userId) as UserInfo | undefined) || null;
  } catch (error) {
    // 在服务端记录错误日志，前端统一走 notFound 逻辑
    console.error("Failed to fetch user:", error);
    notFound();
  }

  if (!user) {
    notFound();
  }

  return <UserRolesPageClient user={user} />;
}
