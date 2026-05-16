import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Search, ShieldCheck, UserCheck, Users2, X } from "lucide-react";

import { auth } from "@/auth";
import { GlassCard } from "@/components/GlassCard";
import { prisma } from "@/lib/db";

const ROLE_FILTERS = ["ALL", "PATIENT", "DOCTOR", "RECEPTION", "ADMIN", "SUPER_ADMIN"] as const;
const STATUS_FILTERS = ["ALL", "ACTIVE", "INACTIVE"] as const;

type RoleFilter = (typeof ROLE_FILTERS)[number];
type StatusFilter = (typeof STATUS_FILTERS)[number];
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

function matches(value: string | null | undefined, query: string) {
  return (value || "").toLowerCase().includes(query);
}

function isRoleFilter(value?: string): value is RoleFilter {
  return ROLE_FILTERS.some((item) => item === value);
}

function isStatusFilter(value?: string): value is StatusFilter {
  return STATUS_FILTERS.some((item) => item === value);
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const q = (params.q || "").trim();
  const role = isRoleFilter(params.role) ? params.role : "ALL";
  const status = isStatusFilter(params.status) ? params.status : "ALL";

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      patientProfile: { select: { id: true } },
      doctorProfile: {
        select: {
          id: true,
          specialization: true,
        },
      },
      receptionProfile: {
        select: {
          id: true,
          hospital: { select: { name: true } },
        },
      },
    },
  });

  const query = q.toLowerCase();
  const filteredUsers = users.filter((user) => {
    const roleMatch = role === "ALL" || user.role === role;
    const statusMatch =
      status === "ALL" ||
      (status === "ACTIVE" && user.isActive) ||
      (status === "INACTIVE" && !user.isActive);
    const queryMatch =
      !query ||
      matches(user.name, query) ||
      matches(user.email, query) ||
      matches(user.role, query) ||
      matches(user.doctorProfile?.specialization, query) ||
      matches(user.receptionProfile?.hospital?.name, query);

    return roleMatch && statusMatch && queryMatch;
  });

  const activeCount = users.filter((user) => user.isActive).length;
  const adminCount = users.filter((user) => user.role === "ADMIN" || user.role === "SUPER_ADMIN").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/80 mb-1">
            Administration
          </div>
          <h1 className="text-4xl font-black tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground/80 mt-1">
            Review registered users, roles, account status, and linked clinical profiles.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 min-w-[260px]">
          <GlassCard className="p-4 flex items-center gap-3">
            <UserCheck className="h-5 w-5 text-emerald-500" />
            <div>
              <div className="text-xl font-black">{activeCount}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold">Active</div>
            </div>
          </GlassCard>
          <GlassCard className="p-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <div className="text-xl font-black">{adminCount}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold">Admins</div>
            </div>
          </GlassCard>
        </div>
      </div>

      <GlassCard className="p-4">
        <form className="grid grid-cols-1 md:grid-cols-[1fr_170px_170px_auto_auto] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name, email, role, hospital, specialization"
              className="w-full h-11 rounded-xl bg-background/50 border border-border/40 pl-9 pr-3 text-sm outline-none focus:border-primary/50"
            />
          </div>

          <select
            name="role"
            defaultValue={role}
            className="h-11 rounded-xl bg-background/50 border border-border/40 px-3 text-sm outline-none focus:border-primary/50"
          >
            {ROLE_FILTERS.map((item) => (
              <option key={item} value={item}>
                {item === "ALL" ? "All roles" : item.replace("_", " ")}
              </option>
            ))}
          </select>

          <select
            name="status"
            defaultValue={status}
            className="h-11 rounded-xl bg-background/50 border border-border/40 px-3 text-sm outline-none focus:border-primary/50"
          >
            {STATUS_FILTERS.map((item) => (
              <option key={item} value={item}>
                {item === "ALL" ? "All status" : item}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-glow"
          >
            Search
          </button>

          <Link
            href="/admin/users"
            className="h-11 rounded-xl border border-border/50 px-4 text-sm font-bold text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
          >
            <X className="h-4 w-4" />
            Reset
          </Link>
        </form>
      </GlassCard>

      <GlassCard className="p-0 overflow-hidden">
        <div className="border-b border-border/40 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <Users2 className="h-5 w-5 text-primary" />
            Users
          </h2>
          <span className="text-xs text-muted-foreground">
            Showing {filteredUsers.length} of {users.length}
          </span>
        </div>

        {filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-secondary/30 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-black">User</th>
                  <th className="px-5 py-3 text-left font-black">Role</th>
                  <th className="px-5 py-3 text-left font-black">Profile</th>
                  <th className="px-5 py-3 text-left font-black">Status</th>
                  <th className="px-5 py-3 text-left font-black">Joined</th>
                  <th className="px-5 py-3 text-left font-black">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredUsers.map((user) => {
                  const profile =
                    user.doctorProfile?.specialization ||
                    user.receptionProfile?.hospital?.name ||
                    (user.patientProfile ? "Patient profile" : "No linked profile");

                  return (
                    <tr key={user.id} className="hover:bg-primary/[0.03] transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold">{user.name || "Unnamed user"}</div>
                        <div className="text-[11px] text-muted-foreground">{user.email || "No email"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                          {user.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{profile}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${user.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-muted/40 text-muted-foreground"}`}>
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {format(new Date(user.createdAt), "PP")}
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`/admin/users/${user.id}`} className="text-sm font-semibold text-primary hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center text-muted-foreground">
            <Users2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No users matched your filters.</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
