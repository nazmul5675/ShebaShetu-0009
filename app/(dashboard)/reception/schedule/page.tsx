import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getDoctorsWithSchedules } from "@/lib/services/reception-service";
import { DoctorScheduleView } from "@/components/reception/DoctorScheduleView";

export default async function ReceptionSchedulePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const profile = await prisma.receptionProfile.findUnique({
    where: { userId },
    select: { hospitalId: true }
  });

  const doctors = await getDoctorsWithSchedules(profile?.hospitalId || undefined);
  const serializedDoctors = JSON.parse(JSON.stringify(doctors));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold">Doctor Schedules</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and coordinate doctor availability and booked slots.
        </p>
      </div>

      <DoctorScheduleView doctors={serializedDoctors} />
    </div>
  );
}
