import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { GlassCard } from "@/components/GlassCard";
import {
  ClipboardList, Calendar, Users,
  ArrowUpRight, Clock, CheckCircle2, User
} from "lucide-react";
import Link from "next/link";
import { getDoctorStats, getDoctorAppointments, getActiveAppointment, getDoctorAvailability, getPatientHistory } from "@/lib/services/doctor-service";
import { format } from "date-fns";
import { StatusPill } from "@/components/StatusPill";
import { ActiveSession } from "@/components/doctor/ActiveSession";
import { startAppointment } from "@/app/actions/doctor";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default async function DoctorDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const [stats, appointments, activeAppointment, availability] = await Promise.all([
    getDoctorStats(userId),
    getDoctorAppointments(userId),
    getActiveAppointment(userId),
    getDoctorAvailability(userId)
  ]);

  type PatientHistory = Awaited<ReturnType<typeof getPatientHistory>>;
  let patientHistory: PatientHistory = [];
  if (activeAppointment) {
    patientHistory = await getPatientHistory(activeAppointment.patientId);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Doctor · Dashboard</div>
        <h1 className="text-3xl font-bold mt-1">Welcome, Dr. {session.user.name?.split(' ')[0] || "Doctor"} 🩺</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {activeAppointment ? "You have an active session in progress." : stats?.appointmentsToday ? `You have ${stats.appointmentsToday} patients scheduled for today.` : "Review your schedule and patient visits for today."}
        </p>
      </div>

      {activeAppointment && (
        <ActiveSession appointment={activeAppointment} history={patientHistory} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <GlassCard className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 grid place-items-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats?.appointmentsToday || 0}</div>
            <div className="text-xs text-muted-foreground">Patients Today</div>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 grid place-items-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats?.completedToday || 0}</div>
            <div className="text-xs text-muted-foreground">Completed Today</div>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-orange-500/15 grid place-items-center">
            <Clock className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats?.avgWaitTime || "N/A"}</div>
            <div className="text-xs text-muted-foreground">Avg. Wait Time</div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Upcoming Queue
            </h3>
            <Link href="/doctor/dashboard" className="text-xs text-primary hover:underline flex items-center gap-1">
              View full list <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {appointments.length > 0 ? (
              appointments.map((apt) => (
                <div key={apt.id} className="glass rounded-xl p-4 flex items-center justify-between group hover:bg-sidebar-accent/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary grid place-items-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{apt.patient.user.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" /> {format(new Date(apt.scheduledAt), "h:mm a")}
                        {apt.queueToken && <span className="ml-2 font-bold text-primary">Token {apt.queueToken.tokenNumber}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusPill status={apt.status.toLowerCase() as any} />
                    {!activeAppointment && (
                      <form action={async () => {
                        "use server"
                        await startAppointment(apt.id);
                      }}>
                        <Button size="sm" className="h-8 rounded-lg bg-primary text-[10px] font-bold uppercase tracking-wider px-3">
                          Start Checkup
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center opacity-40">
                <ClipboardList className="h-10 w-10 mx-auto mb-3" />
                <p className="text-sm">No patients waiting in queue.</p>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="font-semibold mb-6 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Quick Schedule
          </h3>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {stats?.specialization ? `Your ${stats.specialization} availability:` : "Your availability is not yet configured."}
            </p>
            {availability ? (
              <div className="glass p-3 rounded-xl text-center text-sm font-bold text-primary bg-primary/5">
                {availability}
              </div>
            ) : (
              <div className="glass p-3 rounded-xl text-center text-[10px] text-muted-foreground">
                No slots configured for today.
              </div>
            )}
            <Link href="/doctor/schedule" className="block w-full">
              <Button variant="outline" className="w-full py-2.5 rounded-xl border-border/60 text-xs font-semibold mt-2">
                Manage Schedule
              </Button>
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
