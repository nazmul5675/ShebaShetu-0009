"use client"

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, LayoutList, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QueueManager } from "@/components/reception/QueueManager";
import { CheckInModal } from "@/components/reception/CheckInModal";
import { QueueMovements } from "@/components/reception/QueueMovements";

interface QueueContentProps {
  queue: any[];
  pendingAppointments: any[];
  movements: any[];
  canManage: boolean;
  hospitalName: string | null;
}

export function QueueContent({ queue, pendingAppointments, movements, canManage, hospitalName }: QueueContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [view, setView] = useState<"live" | "movements">("live");

  useEffect(() => {
    if (searchParams.get("action") === "checkin") {
      setIsCheckInOpen(true);
    }
    if (searchParams.get("view") === "movements") {
      setView("movements");
    }
  }, [searchParams]);

  const closeCheckIn = (open: boolean) => {
    setIsCheckInOpen(open);
    if (!open && searchParams.get("action")) {
      router.replace("/reception/queue");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/80 mb-1">Queue Control</div>
          <h1 className="text-4xl font-black tracking-tight">Queue Manager</h1>
          <p className="text-sm text-muted-foreground/80 mt-1">
            {canManage
              ? `Monitor and process patient tokens for ${hospitalName || "your assigned hospital"}.`
              : "No hospital assigned. Please contact admin before managing queue actions."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="glass-strong border-border/40 rounded-2xl p-1.5 flex items-center shadow-lg">
            <Button 
              variant={view === "live" ? "secondary" : "ghost"} 
              size="sm" 
              className={cn(
                "h-9 rounded-xl text-xs font-bold px-4 transition-all",
                view === "live" && "bg-background shadow-sm"
              )}
              onClick={() => setView("live")}
            >
              <LayoutList className="h-4 w-4 mr-2" /> Live Queue
            </Button>
            <Button 
              variant={view === "movements" ? "secondary" : "ghost"} 
              size="sm" 
              className={cn(
                "h-9 rounded-xl text-xs font-bold px-4 transition-all",
                view === "movements" && "bg-background shadow-sm"
              )}
              onClick={() => setView("movements")}
            >
              <History className="h-4 w-4 mr-2" /> Movements
            </Button>
          </div>
          <Button 
            className="bg-primary text-primary-foreground shadow-glow h-12 rounded-2xl px-6 font-bold text-sm transition-all active:scale-95"
            onClick={() => setIsCheckInOpen(true)}
            disabled={!canManage}
          >
            <Plus className="h-5 w-5 mr-2" /> New Check-in
          </Button>
        </div>
      </div>

      <div className="min-h-[60vh]">
        {view === "live" ? (
          <QueueManager queue={queue} actionsDisabled={!canManage} />
        ) : (
          <QueueMovements movements={movements} />
        )}
      </div>

      <CheckInModal 
        open={isCheckInOpen} 
        onOpenChange={closeCheckIn} 
        pendingAppointments={pendingAppointments} 
        canManage={canManage}
      />
    </div>
  );
}
