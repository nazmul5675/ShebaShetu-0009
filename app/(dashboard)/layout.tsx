import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar, MobileNav } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

type DashboardRole = "PATIENT" | "RECEPTION" | "DOCTOR" | "ADMIN" | "SUPER_ADMIN";
type SessionUser = {
  name?: string | null;
  email?: string | null;
  role?: DashboardRole;
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const user = session.user as SessionUser;
  const role = user.role || "PATIENT";

  return (
    <div className="min-h-screen flex w-full">
      <Sidebar role={role} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar user={user} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-10 animate-fade-in">
          {children}
        </main>
      </div>
      <MobileNav role={role} />
    </div>
  );
}
