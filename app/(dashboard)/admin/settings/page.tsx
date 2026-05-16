import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { prisma } from "@/lib/db";

type SessionUser = {
  id?: string;
  role?: string;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as SessionUser).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/unauthorized");
  }

  return session;
}

export default async function AdminSettingsPage() {
  const session = await requireAdmin();
  const userId = (session.user as SessionUser).id;
  if (!userId) redirect("/login");

  const [user, preferences] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        patientProfile: true,
        doctorProfile: true,
        receptionProfile: {
          include: { hospital: true },
        },
      },
    }),
    prisma.userPreference.findUnique({
      where: { userId },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10">
      <div>
        <div className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/80 mb-1">
          Admin Account
        </div>
        <h1 className="text-4xl font-black tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground/80 mt-1">
          Manage your administrator profile and notification preferences.
        </p>
      </div>

      <SettingsForm
        user={user}
        preferences={{
          emailAlerts: preferences?.emailAlerts ?? true,
          queueUpdates: preferences?.queueUpdates ?? true,
        }}
      />
    </div>
  );
}
