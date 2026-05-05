import { redirect } from "next/navigation";
import RoleSwitcher from "../components/ui/RoleSwitcher";
import { getCurrentUserRoles } from "@/lib/auth/roles";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const roles = await getCurrentUserRoles();
  if (roles.authenticated && !roles.isAdmin) {
    redirect("/");
  }
  return (
    <>
      {children}
      <RoleSwitcher roles={roles} />
    </>
  );
}
