import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { GlassCard } from "@/components/GlassCard";
import { 
  Users2, LayoutDashboard, CalendarRange, 
  ArrowRight, Search, Plus, User, Activity, History 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getReceptionStats, getRecentCheckIns, getActiveDoctors } from "@/lib/services/reception-service";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { StatusPill } from "@/components/StatusPill";
import { DashboardSearch } from "@/components/reception/DashboardSearch";

export default async function ReceptionDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const receptionProfile = await prisma.receptionProfile.findUnique({
    where: { userId },
    include: { hospital: true },
  });

  const hospitalId = receptionProfile?.hospitalId || undefined;

  const [stats, recentCheckIns, activeDoctors] = hospitalId
    ? await Promise.all([
        getReceptionStats(hospitalId),
        getRecentCheckIns(5, hospitalId),
        getActiveDoctors(hospitalId)
      ])
    : [
        { activeQueues: 0, totalTokens: 0, apptsRemaining: 0, staffActive: 0 },
        [],
        [],
      ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/80 mb-1">Reception · Control Center</div>
          <h1 className="text-4xl font-black tracking-tight mt-1">Hello, {session.user.name?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-muted-foreground/80 mt-1">
            {!hospitalId ? (
              "No hospital assigned. Please contact admin before managing check-ins."
            ) : stats.totalTokens > 0 ? (
              <>System is active with <span className="text-primary font-bold">{stats.totalTokens}</span> tokens issued today.</>
            ) : (
              "System is ready for check-ins. No active sessions currently."
            )}
          </p>
        </div>
        <Link href={hospitalId ? "/reception/queue?action=checkin" : "/reception/queue"}>
          <Button className="bg-primary text-primary-foreground shadow-glow h-12 rounded-2xl px-6 font-bold text-sm transition-all active:scale-95">
            <Plus className="h-5 w-5 mr-2" /> New Check-in
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Queues", val: stats.activeQueues, icon: Activity, tint: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Total Tokens", val: stats.totalTokens, icon: LayoutDashboard, tint: "text-primary", bg: "bg-primary/10" },
          { label: "Appts Remaining", val: stats.apptsRemaining, icon: CalendarRange, tint: "text-orange-500", bg: "bg-orange-500/10" },
          { label: "Staff Active", val: stats.staffActive, icon: Users2, tint: "text-emerald-500", bg: "bg-emerald-500/10" },
        ].map((stat) => (
          <GlassCard key={stat.label} className="p-5 flex items-center gap-4 group hover:border-primary/20 transition-all">
            <div className={`h-12 w-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.tint} group-hover:scale-110 transition-transform`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-black">{stat.val}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{stat.label}</div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-0 overflow-hidden flex flex-col">
          <div className="p-6 pb-2 flex items-center justify-between">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Recent Check-ins
            </h3>
            <DashboardSearch />
          </div>
          
          <div className="p-6 pt-4 space-y-3 flex-1 overflow-y-auto scrollbar-thin max-h-[400px]">
            {recentCheckIns.length > 0 ? (
              recentCheckIns.map((apt) => (
                <div key={apt.id} className="glass border-border/20 rounded-2xl p-4 flex items-center justify-between group hover:bg-primary/[0.02] hover:border-primary/20 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-secondary/50 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">{apt.patient.user.name}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 font-medium mt-1">
                        <span className="text-primary/70">Dr. {apt.doctor.user.name}</span>
                        <span className="opacity-30">•</span>
                        <span className="bg-secondary px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter">Token {apt.queueToken?.tokenNumber || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                  <StatusPill status={apt.status.toLowerCase()} className="text-[10px] font-black px-2.5 py-1" />
                </div>
              ))
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                <LayoutDashboard className="h-16 w-16 mx-auto mb-4" />
                <p className="text-sm font-bold">No check-ins today</p>
                <p className="text-xs mt-1">Active patient tokens will appear here.</p>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-secondary/20 border-t border-border/20">
            <Link href="/reception/queue?view=movements" className="w-full text-center text-xs font-bold text-primary hover:underline flex items-center justify-center gap-1.5">
              See all queue movements <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Doctor Availability
            </h3>
          </div>
          <div className="space-y-4">
            {activeDoctors.length > 0 ? (
              <div className="space-y-3">
                {activeDoctors.map((doc) => (
                  <div key={doc.id} className="glass border-border/20 rounded-xl p-3 flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <div className="text-sm font-bold">{doc.user.name}</div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{doc.departments[0]?.name || "General"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center opacity-40">
                <p className="text-xs italic">No doctors active in system.</p>
              </div>
            )}
            <Link href="/reception/schedule" className="block w-full pt-4">
              <Button variant="outline" className="w-full h-11 rounded-xl border-border/40 text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
                Manage Schedule
              </Button>
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
