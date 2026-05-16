import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { GlassCard } from "@/components/GlassCard";
import { CalendarDays, Clock, Plus, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { createScheduleSlot } from "@/app/actions/doctor";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

async function createScheduleSlotFormAction(formData: FormData) {
  "use server";

  const session = await auth();
  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  if (!sessionUser?.id || sessionUser.role !== "DOCTOR") return;

  const doctor = await prisma.doctorProfile.findUnique({
    where: { userId: sessionUser.id },
    include: {
      departments: {
        include: {
          hospital: true
        }
      },
      hospitals: true,
    }
  });

  if (!doctor) return;

  const hospitalId = formData.get("hospitalId");
  if (typeof hospitalId !== "string") return;

  const departmentHospitalIds = doctor.departments
    .map((department) => department.hospitalId)
    .filter((id): id is string => typeof id === "string");
  const manualHospitalIds = doctor.hospitals.map((hospital) => hospital.id);
  const assignedHospitalIds = Array.from(new Set([...departmentHospitalIds, ...manualHospitalIds]));

  if (!assignedHospitalIds.includes(hospitalId)) return;

  await createScheduleSlot(formData);
}

export default async function DoctorSchedulePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const doctor = await prisma.doctorProfile.findUnique({
    where: { userId: (session.user as { id?: string }).id || "" },
    include: {
      schedules: {
        orderBy: { startTime: "asc" },
        include: { hospital: true }
      },
      departments: {
        include: {
          hospital: true
        }
      },
      hospitals: true,
    }
  });

  if (!doctor) return <div>Doctor profile not found.</div>;

  type DoctorHospital = {
    id: string;
    name: string;
    address: string;
    phone: string | null;
  };

  const assignedHospitals = doctor.departments.reduce<DoctorHospital[]>((unique, department) => {
    const hospital = department.hospital;
    if (hospital && !unique.some((item) => item.id === hospital.id)) {
      unique.push(hospital);
    }
    return unique;
  }, []);

  doctor.hospitals.forEach((hospital) => {
    if (!assignedHospitals.some((item) => item.id === hospital.id)) {
      assignedHospitals.push(hospital);
    }
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">Slot Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Set your availability and manage patient booking slots.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-1">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Quick Add Slot
          </h3>
          {assignedHospitals.length > 0 ? (
            <form action={createScheduleSlotFormAction} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase">Hospital</label>
                <select
                  name="hospitalId"
                  className="w-full glass rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/40"
                  required
                >
                  <option value="">Select hospital</option>
                  {assignedHospitals.map((hospital) => (
                    <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase">Start Time</label>
                <input
                  type="datetime-local"
                  name="startTime"
                  className="w-full glass rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/40"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase">End Time</label>
                <input
                  type="datetime-local"
                  name="endTime"
                  className="w-full glass rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/40"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-primary text-primary-foreground shadow-glow">
                Generate Slot
              </Button>
            </form>
          ) : (
            <div className="rounded-2xl border border-border/40 bg-destructive/10 p-4 text-sm text-destructive">
              No hospital assigned. Please contact admin.
            </div>
          )}
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <h3 className="font-semibold mb-6 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Your Time Slots
          </h3>

          <div className="space-y-3">
            {doctor.schedules.length > 0 ? (
              doctor.schedules.map((slot) => (
                <div key={slot.id} className="glass rounded-xl p-4 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-10 w-10 rounded-xl grid place-items-center",
                      slot.isBooked ? "bg-primary/10" : "bg-emerald-500/10"
                    )}>
                      <Clock className={cn("h-5 w-5", slot.isBooked ? "text-primary" : "text-emerald-500")} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">
                        {format(new Date(slot.startTime), "MMM d, h:mm a")} - {format(new Date(slot.endTime), "h:mm a")}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {slot.hospital.name} {doctor.roomNumber ? `- Room ${doctor.roomNumber}` : ""} - {slot.isBooked ? "Booked by Patient" : "Available for Booking"}
                      </div>
                    </div>
                  </div>

                  {!slot.isBooked && (
                    <div className="flex items-center gap-2">
                      <form action={async () => {
                        "use server"
                        const { deleteScheduleSlot } = await import("@/app/actions/doctor");
                        await deleteScheduleSlot(slot.id);
                      }}>
                        <button type="submit" className="h-8 w-8 rounded-lg glass flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-20 text-center opacity-40">
                <CalendarDays className="h-12 w-12 mx-auto mb-4" />
                <p className="text-sm">You haven't created any slots yet.</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
