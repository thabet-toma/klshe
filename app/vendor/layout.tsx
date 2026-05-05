import { Suspense } from "react";
import { redirect } from "next/navigation";
import RoleSwitcher from "../components/ui/RoleSwitcher";
import { VendorWorkspaceProvider } from "../components/vendor/VendorWorkspace";
import { getCurrentUserRoles } from "@/lib/auth/roles";

function VendorLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-emerald-50/50 text-sm text-neutral-500">
      جارٍ التحميل…
    </div>
  );
}

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const roles = await getCurrentUserRoles();
  if (roles.authenticated && !roles.isVendor && !roles.isAdmin) {
    redirect("/");
  }
  return (
    <>
      <Suspense fallback={<VendorLoading />}>
        <VendorWorkspaceProvider>{children}</VendorWorkspaceProvider>
      </Suspense>
      <RoleSwitcher roles={roles} />
    </>
  );
}
