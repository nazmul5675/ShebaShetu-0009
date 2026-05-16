"use client"

import { GlassCard } from "@/components/GlassCard";
import { useRole, type Role } from "@/lib/role-store";
import { Construction, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function RolePlaceholder({ role, label }: { role: Role; label: string }) {
  const { setRole } = useRole();
  const router = useRouter();
  return (
    <div className="max-w-2xl mx-auto py-12 text-center">
      <GlassCard variant="strong" className="relative overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-primary/15 blur-[100px]" />
        <div className="relative">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/15 grid place-items-center mb-3">
            <Construction className="h-7 w-7 text-primary" />
          </div>
          <div className="text-xs uppercase tracking-wider text-primary font-semibold">Milestone 2 · {label}</div>
          <h2 className="text-2xl sm:text-3xl font-bold mt-1">{label} workspace coming next</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            We've shipped the full <span className="text-foreground font-medium">Patient experience</span> first
            (design system, login, dashboard, AI symptom flow, booking, live queue, appointments, report vault).
            <br />Reception and Doctor screens land in the next milestone.
          </p>
          <div className="flex gap-2 justify-center mt-5">
            <Button onClick={() => { setRole("patient"); router.push("/patient"); }} className="bg-gradient-emerald text-primary-foreground shadow-glow">
              Explore Patient role <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
