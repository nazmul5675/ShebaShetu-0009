"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import {
  Home, Stethoscope, CalendarDays, Activity, FolderHeart, Sparkles,
  ListChecks, Users2, CalendarRange, ClipboardList, LifeBuoy, Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: typeof Home };

const PATIENT: Item[] = [
  { to: "/patient/dashboard",  label: "Dashboard",     icon: Home },
  { to: "/patient/symptoms",   label: "AI Symptom",    icon: Sparkles },
  { to: "/patient/booking",    label: "Book Visit",    icon: CalendarDays },
  { to: "/patient/live-queue", label: "Live Queue",    icon: Activity },
  { to: "/patient/appointments", label: "Appointments", icon: ListChecks },
  { to: "/patient/reports",    label: "Report Vault",  icon: FolderHeart },
];

const RECEPTION: Item[] = [
  { to: "/reception/dashboard", label: "Dashboard",     icon: Home },
  { to: "/reception/queue",     label: "Queue Manager", icon: Users2 },
  { to: "/reception/schedule",  label: "Doctor Schedule", icon: CalendarRange },
];

const DOCTOR: Item[] = [
  { to: "/doctor/dashboard",    label: "Today's List",  icon: ClipboardList },
  { to: "/doctor/schedule",     label: "Schedule",      icon: CalendarDays },
];

const ADMIN: Item[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: Home },
  { to: "/admin/users", label: "User Management", icon: Users2 },
  { to: "/admin/support", label: "Support Tickets", icon: LifeBuoy },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  role: "PATIENT" | "RECEPTION" | "DOCTOR" | "ADMIN" | "SUPER_ADMIN";
}

export function useNavItems(role: SidebarProps["role"]) {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return ADMIN;
  if (role === "RECEPTION") return RECEPTION;
  if (role === "DOCTOR") return DOCTOR;
  return PATIENT;
}

function getRoleBasePath(role: SidebarProps["role"]) {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "/admin";
  if (role === "DOCTOR") return "/doctor";
  if (role === "RECEPTION") return "/reception";
  return "/patient";
}

export function Sidebar({ role }: SidebarProps) {
  const items = useNavItems(role);
  const pathname = usePathname();
  const roleBasePath = getRoleBasePath(role);

  return (
    <aside className="hidden lg:flex sticky top-0 h-screen w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar/60 backdrop-blur-xl">
      <div className="px-5 py-5 border-b border-border/60">
        <Logo />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        <div className="px-2 pb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Workspace
        </div>
        {items.map(({ to, label, icon: Icon }) => {
          const isActive = pathname === to;
          return (
            <Link
              key={to}
              href={to}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
              )}
            >
              <Icon className={cn("h-4.5 w-4.5", isActive && "text-primary")} />
              <span>{label}</span>
              {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 glass-strong rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1.5">
          {role === "ADMIN" || role === "SUPER_ADMIN" ? (
            <ShieldCheck className="h-4 w-4 text-primary" />
          ) : (
            <Stethoscope className="h-4 w-4 text-primary" />
          )}
          <div className="text-xs font-semibold">Need help?</div>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
          Reach our 24/7 hospital coordination desk for any visit.
        </p>
        <Link 
          href={`${roleBasePath}/support`}
          className="w-full block"
        >
          <button className="w-full rounded-lg bg-gradient-emerald text-primary-foreground text-xs font-semibold py-2 shadow-glow">
            Contact support
          </button>
        </Link>
      </div>

      <div className="px-3 py-3 border-t border-border/60 flex items-center gap-2 text-[11px] text-muted-foreground">
        <LifeBuoy className="h-3.5 w-3.5" />
        <span>v1.0 · Next.js migration</span>
        <Link href={`${roleBasePath}/settings`} className="ml-auto">
          <Settings className="h-3.5 w-3.5 hover:text-foreground cursor-pointer" />
        </Link>
      </div>
    </aside>
  );
}

export function MobileNav({ role }: SidebarProps) {
  const items = useNavItems(role);
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-3 inset-x-3 z-40 glass-strong rounded-2xl px-2 py-2 flex justify-between gap-1 shadow-glass">
      {items.slice(0, 5).map(({ to, label, icon: Icon }) => {
        const isActive = pathname === to;
        return (
          <Link
            key={to}
            href={to}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-all",
              isActive
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="truncate max-w-full px-1">{label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
