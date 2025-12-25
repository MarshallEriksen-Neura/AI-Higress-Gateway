import { PermissionsPageClient } from "./components/permissions-page-client";
import { notFound } from "next/navigation";
import { serverFetch } from "@/lib/swr/server-fetch";
import type { UserInfo } from "@/lib/api-types";

interface PageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function UserPermissionsPage({ params }: PageProps) {
  // Next.js 15 中 params 是 Promise，这里先解包
  const { userId } = await params;

  const users = await serverFetch<UserInfo[]>("/admin/users");
  const user = users?.find((u) => u.id === userId) ?? null;

  if (!user) {
    notFound();
  }

  return <PermissionsPageClient user={user} userId={userId} />;
}
