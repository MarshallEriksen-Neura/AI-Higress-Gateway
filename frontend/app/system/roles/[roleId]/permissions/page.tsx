import { adminService, type Role } from "@/http/admin";
import { notFound } from "next/navigation";
import { RolePermissionsPageClient } from "./components/role-permissions-page-client";

interface PageProps {
  params: {
    roleId: string;
  };
}

export default async function RolePermissionsPage({ params }: PageProps) {
  const { roleId } = params;

  let roles: Role[] | null = null;

  try {
    roles = await adminService.getRoles();
  } catch (error) {
    // 在服务端记录错误日志，前端统一走 notFound 逻辑
    console.error("Failed to fetch role:", error);
    notFound();
  }

  if (!roles) {
    notFound();
  }

  const role = roles.find((r) => r.id === roleId);

  if (!role) {
    notFound();
  }

  return <RolePermissionsPageClient role={role} />;
}
