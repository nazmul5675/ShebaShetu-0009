import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { GlassCard } from "@/components/GlassCard";
import { AIDisclaimer } from "@/components/AIDisclaimer";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import {
  getUpcomingAppointments,
  getActiveQueueStatus,
  getPatientStats,
  getPeopleAhead
} from "@/lib/services/appointment-service";
import {
  ArrowRight, Clock, CalendarDays, ChevronRight,
  TrendingUp, Activity, Stethoscope, FolderHeart
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import dynamic from "next/dynamic";

const LiveQueueHero = dynamic(() => import("@/components/patient/LiveQueueHero").then(mod => mod.LiveQueueHero), {
  ssr: true,
  loading: () => <div className="lg:col-span-2 h-64 bg-muted/50 animate-pulse rounded-2xl" />
});

const SymptomCheck = dynamic(() => import("@/components/patient/SymptomCheck").then(mod => mod.SymptomCheck), {
  ssr: true,
  loading: () => <div className="lg:col-span-2 h-48 bg-muted/50 animate-pulse rounded-2xl" />
});

export default async function PatientDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  // Parallelize data fetching to avoid waterfalls
  const [appointments, activeQueue, stats] = await Promise.all([
    getUpcomingAppointments(userId),
    getActiveQueueStatus(userId),
    getPatientStats(userId),
  ]);

  const peopleAhead = activeQueue ? await getPeopleAhead(activeQueue.id) : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Greeting */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Patient · Dashboard</div>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">Assalamu Alaikum, {session.user.name?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeQueue
              ? "Your visit is moving quickly. Here's the calm view."
              : "No active visits right now. Book one below to get started."}
          </p>
        </div>
        <Link href="/patient/booking">
          <Button className="bg-gradient-emerald text-primary-foreground shadow-glow">
            <CalendarDays className="h-4 w-4 mr-1.5" /> Book new visit
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Hero Live Queue or Empty State */}
        {activeQueue ? (
          <LiveQueueHero
            appointmentId={activeQueue.id}
            tokenNumber={activeQueue.queueToken?.tokenNumber}
            departmentName={activeQueue.department.name}
            doctorName={activeQueue.doctor.user.name || "Doctor"}
            roomNumber={activeQueue.doctor.roomNumber || "TBA"}
            initialAheadCount={activeQueue.queueToken?.position ? activeQueue.queueToken.position - 1 : 0}
          />
        ) : (
          <GlassCard variant="strong" className="lg:col-span-2 flex flex-col items-center justify-center py-12 text-center">
            <Activity className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">No active queue token</h3>
            <p className="text-sm text-muted-foreground max-w-xs mt-1">
              When you check in at the hospital, your live queue status will appear here.
            </p>
          </GlassCard>
        )}

        {/* Upcoming */}
        <GlassCard className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Upcoming</div>
            <Link href="/patient/appointments" className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {appointments.length > 0 ? appointments.slice(0, 2).map((apt) => (
              <div key={apt.id} className="glass rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <StatusPill status={apt.status.toLowerCase() as any} />
                  <span className="text-[10px] text-muted-foreground">{format(new Date(apt.scheduledAt), 'EEE, d MMM')}</span>
                </div>
                <div className="text-sm font-semibold">{apt.doctor.user.name}</div>
                <div className="text-xs text-muted-foreground">{apt.department.name}</div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" /> {format(new Date(apt.scheduledAt), 'h:mm a')}
                </div>
              </div>
            )) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 opacity-60">
                <CalendarDays className="h-8 w-8 mb-2" />
                <div className="text-xs">No upcoming visits</div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SymptomCheck />

        {/* Quick stats */}
        <GlassCard>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Your care</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: TrendingUp, val: stats.totalVisits.toString(), label: "Visits done" },
              { icon: Stethoscope, val: stats.uniqueDoctors.toString(), label: "Doctors seen" },
              { icon: FolderHeart, val: stats.totalReports.toString(), label: "Reports" },
              { icon: Activity, val: stats.onTimeRate, label: "On-time rate" },
            ].map(({ icon: I, val, label }) => (
              <div key={label} className="glass rounded-xl p-3 hover:bg-primary/5 transition-colors">
                <I className="h-4 w-4 text-primary mb-1.5" />
                <div className="text-xl font-bold">{val}</div>
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{label}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* People ahead — discreet preview */}
      {activeQueue && peopleAhead.length > 0 && (
        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold">People ahead of you</div>
              <div className="text-xs text-muted-foreground">Identities are anonymized for privacy.</div>
            </div>
            <Link href="/patient/live-queue" className="text-xs text-primary hover:underline flex items-center gap-1">
              See full queue <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {peopleAhead.map((p) => (
              <div key={p.id} className="glass rounded-xl p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary grid place-items-center text-[11px] font-semibold">
                  {p.appointment.patient.user.name?.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">Token {p.tokenNumber}</div>
                  <div className="text-[11px] text-muted-foreground truncate">Wait: {p.estimatedWait || 15} min</div>
                </div>
                <StatusPill status="waiting" />
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <AIDisclaimer />
    </div>
  );
}
