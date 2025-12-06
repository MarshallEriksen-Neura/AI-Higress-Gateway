import { adminService } from "@/http/admin";
import { PermissionsPageClient } from "./components/permissions-page-client";
import { notFound } from "next/navigation";

interface PageProps {
  params: {
    userId: string;
  };
}

export default async function UserPermissionsPage({ params }: PageProps) {
  const { userId } = params;

  let user = null;

  try {
    // Fetch user data on the server
    const users = await adminService.getAllUsers();
    user = users.find((u) => u.id === userId) || null;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    notFound();
  }

  if (!user) {
    notFound();
  }

  return <PermissionsPageClient user={user} userId={userId} />;
}
