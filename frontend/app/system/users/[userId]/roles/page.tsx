import { notFound } from "next/navigation";
import { UserRolesPageClient } from "./components/user-roles-page-client";
import type { UserInfo } from "@/lib/api-types";
import { serverFetch } from "@/lib/swr/server-fetch";

interface PageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function UserRolesPage({ params }: PageProps) {
  // Next.js 15 中 params 是 Promise，这里先解包
  const { userId } = await params;

  const users = await serverFetch<UserInfo[]>("/admin/users");
  const user = users?.find((u) => u.id === userId) ?? null;

  if (!user) {
    notFound();
  }

  return <UserRolesPageClient user={user} />;
}
