"use client"

import { useState } from "react";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, User, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { checkInPatient } from "@/app/actions/reception";
import { toast } from "sonner";

interface CheckInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingAppointments: any[];
  canManage: boolean;
}

export function CheckInModal({ open, onOpenChange, pendingAppointments, canManage }: CheckInModalProps) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const filtered = pendingAppointments.filter(apt => {
    const s = search.toLowerCase();
    return (
      apt.patient.user.name?.toLowerCase().includes(s) ||
      apt.patient.user.email?.toLowerCase().includes(s) ||
      apt.patient.id.toLowerCase().includes(s) ||
      apt.doctor.user.name?.toLowerCase().includes(s) ||
      apt.doctor.specialization?.toLowerCase().includes(s)
    );
  });

  const handleCheckIn = async (id: string) => {
    setLoading(id);
    try {
      const res = await checkInPatient(id);
      if (res.success) {
        toast.success(`Checked in! Token: ${res.tokenNumber}`);
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to check in");
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-border/60 sm:max-w-xl p-0 overflow-hidden gap-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold tracking-tight">New Patient Check-in</DialogTitle>
          <DialogDescription className="text-muted-foreground/80">
            {canManage
              ? "Search for an existing appointment to issue a queue token."
              : "No hospital assigned. Please contact admin before issuing queue tokens."}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input 
              placeholder="Search by name, email, or patient ID..."
              className="w-full bg-background/50 border border-border/40 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              disabled={!canManage}
            />
          </div>

          <div className="max-h-[45vh] overflow-y-auto pr-2 space-y-3 scrollbar-thin">
            {filtered.length > 0 ? (
              filtered.map((apt) => (
                <div 
                  key={apt.id} 
                  className="glass border-border/20 rounded-2xl p-4 flex items-center justify-between group hover:border-primary/30 hover:bg-primary/5 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">{apt.patient.user.name}</div>
                      <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <span className="flex items-center gap-1.5 font-medium text-primary/80">
                          <Clock className="h-3.5 w-3.5" /> 
                          {typeof window !== 'undefined' && new Date(apt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="hidden sm:inline opacity-30 text-xs">|</span>
                        <span className="font-medium">Dr. {apt.doctor.user.name}</span>
                        {apt.patient.user.email && (
                          <>
                            <span className="hidden sm:inline opacity-30 text-xs">|</span>
                            <span className="text-[10px] truncate max-w-[120px]">{apt.patient.user.email}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button 
                    disabled={!canManage || !!loading}
                    onClick={() => handleCheckIn(apt.id)}
                    className="rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-10 px-5 font-bold transition-all active:scale-95"
                  >
                    {loading === apt.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Check In"
                    )}
                  </Button>
                </div>
              ))
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                <div className="h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">No appointments found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try searching with a different name or ID</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-secondary/20 border-t border-border/40 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <p className="text-[11px] font-medium text-muted-foreground">
            Only showing PENDING appointments for today
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
