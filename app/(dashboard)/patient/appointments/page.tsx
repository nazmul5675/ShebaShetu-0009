import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPatientAppointments } from "@/lib/services/appointment-service";
import { PatientAppointments } from "@/components/patient/PatientAppointments";

export default async function AppointmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const appointments = await getPatientAppointments((session.user as any).id);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/80 mb-1">Medical Records</div>
          <h1 className="text-4xl font-black tracking-tight">Your Appointments</h1>
          <p className="text-sm text-muted-foreground/80 mt-1 max-w-md">
            Easily track your health journey, manage upcoming visits, and review your clinical history.
          </p>
        </div>
      </div>

      <PatientAppointments initialAppointments={appointments} />
    </div>
  );
}

