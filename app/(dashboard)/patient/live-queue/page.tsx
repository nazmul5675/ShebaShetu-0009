import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActiveQueueStatus, getPeopleAhead } from "@/lib/services/appointment-service";
import { GlassCard } from "@/components/GlassCard";
import { LiveQueueHero } from "@/components/patient/LiveQueueHero";
import { Activity, Users, Clock, AlertCircle } from "lucide-react";

export default async function LiveQueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const activeQueue = await getActiveQueueStatus(userId);
  const peopleAhead = activeQueue ? await getPeopleAhead(activeQueue.id) : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Live Tracker</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor your position in real-time.
        </p>
      </div>

      {activeQueue ? (
        <>
          <LiveQueueHero 
            appointmentId={activeQueue.id}
            tokenNumber={activeQueue.queueToken?.tokenNumber}
            departmentName={activeQueue.department.name}
            doctorName={activeQueue.doctor.user.name || "Doctor"}
            roomNumber={activeQueue.doctor.roomNumber || "TBA"}
            initialAheadCount={activeQueue.queueToken?.position ? activeQueue.queueToken.position - 1 : 0}
          />

          <div className="grid md:grid-cols-3 gap-6">
            <GlassCard className="md:col-span-2">
              <h3 className="font-semibold mb-6 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Queue Sequence
              </h3>
              <div className="space-y-3">
                {peopleAhead.map((p) => (
                  <div key={p.id} className="glass rounded-xl p-4 flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-secondary grid place-items-center text-[10px] font-bold">
                        {p.tokenNumber}
                      </div>
                      <div className="text-sm font-medium">Anonymized Patient</div>
                    </div>
                    <div className="text-[11px] text-muted-foreground">Waiting</div>
                  </div>
                ))}
                <div className="glass rounded-xl p-5 flex items-center justify-between ring-1 ring-primary/40 bg-primary/5">
                   <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary grid place-items-center text-xs font-bold text-primary-foreground shadow-glow">
                        {activeQueue.queueToken?.tokenNumber}
                      </div>
                      <div>
                        <div className="text-sm font-bold">You are here</div>
                        <div className="text-[10px] text-primary font-medium">EST. WAIT: {peopleAhead.length * 15} MIN</div>
                      </div>
                    </div>
                    <div className="px-2 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                      Active
                    </div>
                </div>
              </div>
            </GlassCard>

            <div className="space-y-6">
               <GlassCard variant="strong">
                  <h4 className="text-sm font-semibold mb-2">Hospital Protocol</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Please arrive at the clinic desk at least 15 minutes before your estimated time.
                  </p>
               </GlassCard>
               <div className="glass p-5 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-warning shrink-0" />
                  <div className="text-[11px] text-muted-foreground leading-relaxed">
                    If you miss your call, your token will be marked as "Skipped" and you'll need to contact reception.
                  </div>
               </div>
            </div>
          </div>
        </>
      ) : (
        <GlassCard className="py-20 text-center flex flex-col items-center justify-center opacity-60">
          <Activity className="h-12 w-12 mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold">No active visit</h3>
          <p className="text-sm max-w-xs mt-1">
            Check in at the hospital to see your live queue status.
          </p>
        </GlassCard>
      )}
    </div>
  );
}
