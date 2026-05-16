"use client"

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/GlassCard";
import {
  Users2, Search, ArrowRightLeft,
  MoreVertical, ChevronUp, ChevronDown,
  Trash2, Filter, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/StatusPill";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { updateQueueStatus, moveQueuePosition } from "@/app/actions/reception";
import { toast } from "sonner";
import { QueueStatus } from "@prisma/client";
import { useSearchParams } from "next/navigation";

interface QueueManagerProps {
  queue: any[];
  actionsDisabled?: boolean;
}

export function QueueManager({ queue, actionsDisabled = false }: QueueManagerProps) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  const filtered = queue.filter(apt => {
    const s = search.toLowerCase();
    const matchesSearch =
      apt.patient.user.name?.toLowerCase().includes(s) ||
      apt.patient.user.email?.toLowerCase().includes(s) ||
      apt.queueToken?.tokenNumber.toLowerCase().includes(s) ||
      apt.doctor.user.name?.toLowerCase().includes(s) ||
      apt.doctor.specialization?.toLowerCase().includes(s);

    const matchesStatus = statusFilter ? apt.queueToken?.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const handleStatusUpdate = async (tokenId: string, status: QueueStatus) => {
    if (actionsDisabled) {
      toast.error("No hospital assigned. Please contact admin.");
      return;
    }
    const res = await updateQueueStatus(tokenId, status);
    if (res.success) toast.success(`Status updated to ${status}`);
    else toast.error(res.error || "Failed to update status");
  };

  const handleMove = async (tokenId: string, direction: "UP" | "DOWN") => {
    if (actionsDisabled) {
      toast.error("No hospital assigned.");
      return;
    }
    const res = await moveQueuePosition(tokenId, direction);
    if (res.success) toast.success(`Token moved ${direction.toLowerCase()}`);
    else toast.error(res.error || "Failed to move token");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="relative group flex-1 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            placeholder="Search by name, token, doctor or specialization..."
            className="w-full bg-background/50 border border-border/40 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          <Button
            variant={statusFilter === null ? "default" : "outline"}
            size="sm"
            className="rounded-xl text-xs h-9 px-4 font-semibold transition-all"
            onClick={() => setStatusFilter(null)}
          >
            All Patients
          </Button>
          {["WAITING", "CALLED", "IN_PROGRESS", "COMPLETED"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              className="rounded-xl text-xs h-9 px-4 font-semibold whitespace-nowrap transition-all"
              onClick={() => setStatusFilter(s)}
            >
              {s.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.length > 0 ? (
          filtered.map((apt) => (
            <GlassCard key={apt.id} className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 group hover:border-primary/20 transition-all duration-300">
              <div className="flex items-center gap-5 w-full sm:w-auto">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center text-primary group-hover:scale-105 transition-transform duration-500">
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Token</span>
                  <span className="text-xl font-black">{apt.queueToken?.tokenNumber}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold truncate">{apt.patient.user.name}</h3>
                    <StatusPill status={apt.queueToken?.status.toLowerCase()} className="text-[9px] font-black px-2 py-0.5 rounded-full" />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground/80">
                    <span className="font-semibold text-foreground/70">Dr. {apt.doctor.user.name}</span>
                    <span className="opacity-30">•</span>
                    <span className="flex items-center gap-1">
                      <Filter className="h-3 w-3" />
                      {apt.doctor.specialization}
                    </span>
                    {apt.queueToken?.calledAt && (
                      <>
                        <span className="opacity-30">•</span>
                        <span className="flex items-center gap-1 text-primary/70">
                          <ArrowRightLeft className="h-3 w-3" />
                          Called at {typeof window !== 'undefined' && new Date(apt.queueToken.calledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-none pt-4 sm:pt-0">
                <div className="flex flex-col items-start sm:items-end">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5">Queue Position</div>
                  <div className="text-lg font-black text-primary/90">#{apt.queueToken?.position}</div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1 bg-secondary/30 rounded-xl p-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg hover:bg-background/80" 
                      disabled={actionsDisabled || apt.queueToken.status !== 'WAITING'}
                      onClick={() => handleMove(apt.queueToken.id, "UP")}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg hover:bg-background/80" 
                      disabled={actionsDisabled || apt.queueToken.status !== 'WAITING'}
                      onClick={() => handleMove(apt.queueToken.id, "DOWN")}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/40 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-strong min-w-[180px] p-2 rounded-2xl">
                      <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Actions</div>
                      <DropdownMenuItem disabled className="rounded-lg gap-2">
                        <User className="h-4 w-4" /> View Patient Details
                      </DropdownMenuItem>
                      <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Update Status</div>
                      <DropdownMenuItem disabled={actionsDisabled} className="rounded-lg gap-2 cursor-pointer" onClick={() => handleStatusUpdate(apt.queueToken.id, "CALLED")}>
                        <div className="h-2 w-2 rounded-full bg-blue-500" /> Call Patient
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={actionsDisabled} className="rounded-lg gap-2 cursor-pointer" onClick={() => handleStatusUpdate(apt.queueToken.id, "IN_PROGRESS")}>
                        <div className="h-2 w-2 rounded-full bg-amber-500" /> Start Consultation
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={actionsDisabled} className="rounded-lg gap-2 cursor-pointer" onClick={() => handleStatusUpdate(apt.queueToken.id, "WAITING")}>
                        <div className="h-2 w-2 rounded-full bg-gray-500" /> Back to Waiting
                      </DropdownMenuItem>
                      <div className="my-1 border-t border-border/40" />
                      <DropdownMenuItem disabled={actionsDisabled} className="rounded-lg gap-2 cursor-pointer text-destructive focus:text-destructive" onClick={() => handleStatusUpdate(apt.queueToken.id, "CANCELLED")}>
                        <Trash2 className="h-4 w-4" /> Cancel Token
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </GlassCard>
          ))
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center glass rounded-[2rem] border-dashed border-border/60">
            <div className="h-20 w-20 rounded-full bg-secondary/30 flex items-center justify-center mb-6">
              <Users2 className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-bold">No matches found</h3>
            <p className="text-sm text-muted-foreground max-w-[250px] mt-2">
              Try adjusting your filters or search query to find the patient you're looking for.
            </p>
            {statusFilter && (
              <Button variant="link" onClick={() => setStatusFilter(null)} className="mt-4 text-primary font-bold">
                Clear Status Filter
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
