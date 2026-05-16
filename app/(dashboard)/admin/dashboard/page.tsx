import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowRight,
  ClipboardList,
  LifeBuoy,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Users2,
} from "lucide-react";

import { auth } from "@/auth";
import { GlassCard } from "@/components/GlassCard";
import { prisma } from "@/lib/db";

type SessionUser = {
  role?: string;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as SessionUser).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/unauthorized");
  }

  return session;
}

export default async function AdminDashboardPage() {
  const session = await requireAdmin();

  const [
    totalUsers,
    activeUsers,
    patients,
    doctors,
    receptionists,
    admins,
    hospitals,
    departments,
    appointments,
    openTickets,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "PATIENT" } }),
    prisma.user.count({ where: { role: "DOCTOR" } }),
    prisma.user.count({ where: { role: "RECEPTION" } }),
    prisma.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } }),
    prisma.hospital.count(),
    prisma.department.count(),
    prisma.appointment.count(),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    }),
  ]);

  const stats = [
    { label: "Total Users", value: totalUsers, icon: Users2, tone: "text-primary bg-primary/10" },
    { label: "Active Users", value: activeUsers, icon: UserCheck, tone: "text-emerald-500 bg-emerald-500/10" },
    { label: "Hospitals", value: hospitals, icon: Users2, tone: "text-sky-500 bg-sky-500/10" },
    { label: "Departments", value: departments, icon: ShieldCheck, tone: "text-amber-500 bg-amber-500/10" },
    { label: "Appointments", value: appointments, icon: ClipboardList, tone: "text-violet-500 bg-violet-500/10" },
    { label: "Open Tickets", value: openTickets, icon: LifeBuoy, tone: "text-emerald-500 bg-emerald-500/10" },
  ];

  const roleBreakdown = [
    { label: "Patients", value: patients },
    { label: "Doctors", value: doctors },
    { label: "Reception", value: receptionists },
    { label: "Admins", value: admins },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/80 mb-1">
            Admin Control Center
          </div>
          <h1 className="text-4xl font-black tracking-tight">
            Welcome, {session.user?.name?.split(" ")[0] || "Admin"}
          </h1>
          <p className="text-sm text-muted-foreground/80 mt-1">
            Manage platform users, support tickets, and account settings from one workspace.
          </p>
        </div>

        <Link href="/admin/users">
          <button className="h-12 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-glow transition-all active:scale-95">
            <Users2 className="mr-2 inline h-5 w-5" />
            User Management
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <GlassCard key={stat.label} className="p-5 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-2xl ${stat.tone} flex items-center justify-center`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-black">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                {stat.label}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Recent Users
            </h2>
            <Link href="/admin/users" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentUsers.length > 0 ? (
              recentUsers.map((user) => (
                <div key={user.id} className="glass rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold">{user.name || "Unnamed user"}</div>
                    <div className="text-[11px] text-muted-foreground">{user.email || "No email"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-black tracking-widest text-primary">
                      {user.role.replace("_", " ")}
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-1">
                      {format(new Date(user.createdAt), "PP")}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No users found.
              </div>
            )}
          </div>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard>
            <h2 className="font-bold text-lg flex items-center gap-2 mb-4">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Role Summary
            </h2>
            <div className="space-y-3">
              {roleBreakdown.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-xl bg-secondary/30 px-4 py-3">
                  <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-black">{item.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="font-bold text-lg flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-primary" />
              Admin Routes
            </h2>
            <div className="space-y-2">
              {[
                { href: "/admin/users", label: "User Management" },
                { href: "/admin/support", label: "Support Tickets" },
                { href: "/admin/settings", label: "Profile Settings" },
              ].map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors"
                >
                  {route.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
