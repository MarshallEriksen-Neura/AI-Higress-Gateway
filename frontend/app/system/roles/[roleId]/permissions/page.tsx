import type { Role } from "@/http/admin";
import { serverFetch } from "@/lib/swr/server-fetch";
import { notFound } from "next/navigation";
import { RolePermissionsPageClient } from "./components/role-permissions-page-client";

interface PageProps {
  params: Promise<{
    roleId: string;
  }>;
}

export default async function RolePermissionsPage({ params }: PageProps) {
  // Next.js 15 中 params 是 Promise，这里先解包
  const { roleId } = await params;

  const roles = await serverFetch<Role[]>("/admin/roles");

  if (!roles) {
    notFound();
  }

  const role = roles.find((r) => r.id === roleId);

  if (!role) {
    notFound();
  }

  return <RolePermissionsPageClient role={role} />;
}
