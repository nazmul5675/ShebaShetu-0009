"use client"

import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { StatusPill } from "@/components/StatusPill";
import { format } from "date-fns";
import { CalendarDays, Clock, Search, Filter, ChevronRight, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PatientAppointmentsProps {
  initialAppointments: any[];
}

export function PatientAppointments({ initialAppointments }: PatientAppointmentsProps) {
  const [filter, setFilter] = useState<"ALL" | "UPCOMING" | "COMPLETED" | "CANCELLED">("ALL");
  const [search, setSearch] = useState("");

  const filtered = initialAppointments.filter((apt) => {
    const searchLower = search.toLowerCase();
    
    const aptDate = new Date(apt.scheduledAt);
    const dateStr1 = format(aptDate, 'd MMM, yyyy').toLowerCase();
    const dateStr2 = format(aptDate, 'yyyy-MM-dd').toLowerCase();
    const dateStr3 = format(aptDate, 'MMMM d').toLowerCase();
    const dateStr4 = format(aptDate, 'EEEE').toLowerCase();

    const matchesSearch = 
      (apt.doctor?.user?.name?.toLowerCase().includes(searchLower) ?? false) || 
      (apt.department?.name?.toLowerCase().includes(searchLower) ?? false) ||
      (apt.hospital?.name?.toLowerCase().includes(searchLower) ?? false) ||
      (apt.status?.toLowerCase().includes(searchLower) ?? false) ||
      dateStr1.includes(searchLower) ||
      dateStr2.includes(searchLower) ||
      dateStr3.includes(searchLower) ||
      dateStr4.includes(searchLower);
    
    if (!matchesSearch) return false;
    
    if (filter === "UPCOMING") {
      return ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(apt.status);
    }
    if (filter === "COMPLETED") return apt.status === "COMPLETED";
    if (filter === "CANCELLED") return apt.status === "CANCELLED";
    
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 glass rounded-2xl w-fit">
          {(["ALL", "UPCOMING", "COMPLETED", "CANCELLED"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all",
                filter === t ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:bg-sidebar-accent/50"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative group max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            placeholder="Search by doctor or dept..."
            className="w-full glass rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length > 0 ? (
          filtered.map((apt) => (
            <GlassCard key={apt.id} className="group hover:ring-1 hover:ring-primary/40 transition-all duration-300">
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-14 w-14 rounded-2xl grid place-items-center transition-colors",
                    apt.status === "COMPLETED" ? "bg-emerald-500/10" : "bg-primary/10"
                  )}>
                    <CalendarDays className={cn(
                      "h-7 w-7",
                      apt.status === "COMPLETED" ? "text-emerald-500" : "text-primary"
                    )} />
                  </div>
                  <div>
                    <div className="text-lg font-bold group-hover:text-primary transition-colors">{apt.doctor.user.name}</div>
                    <div className="text-sm text-muted-foreground font-medium">{apt.department.name}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-12 flex-1">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Date</div>
                    <div className="text-sm font-bold flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-primary/60" /> {format(new Date(apt.scheduledAt), 'd MMM, yyyy')}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Time</div>
                    <div className="text-sm font-bold flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-primary/60" /> {format(new Date(apt.scheduledAt), 'h:mm a')}
                    </div>
                  </div>
                  <div className="space-y-1 hidden sm:block">
                    <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Status</div>
                    <StatusPill status={apt.status.toLowerCase() as any} />
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="sm:hidden flex-1">
                    <StatusPill status={apt.status.toLowerCase() as any} />
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full glass hover:bg-primary/10 hover:text-primary transition-all">
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center glass rounded-3xl border-dashed border-2 border-border/60 opacity-60">
            <XCircle className="h-12 w-12 mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-bold uppercase tracking-tight">No appointments found</h3>
            <p className="text-sm max-w-xs mt-1">
              {search ? "Try adjusting your search terms or filters." : "You haven't booked any medical visits yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
