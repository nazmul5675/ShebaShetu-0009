import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function ReceptionSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  
  const [user, preferences] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, name: true, email: true, image: true,
        role: true,
        receptionProfile: {
          include: { hospital: true }
        }
      }
    }),
    prisma.userPreference.findUnique({
      where: { userId }
    })
  ]);

  if (!user) redirect("/login");

  const safePreferences = {
    emailAlerts: preferences?.emailAlerts ?? true,
    queueUpdates: preferences?.queueUpdates ?? true,
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your receptionist profile and account security.
        </p>
      </div>

      <SettingsForm 
        user={user as any} 
        preferences={safePreferences} 
      />
    </div>
  );
}
