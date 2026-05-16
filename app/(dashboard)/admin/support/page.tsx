import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getSupportTicketsForAdmin } from "@/app/actions/support";
import { AdminSupportPanel } from "@/components/support/AdminSupportPanel";

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

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ ticketId?: string }>;
}) {
  await requireAdmin();
  const { ticketId } = await searchParams;
  const tickets = await getSupportTicketsForAdmin();
  const serializedTickets = JSON.parse(JSON.stringify(tickets));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div>
        <div className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/80 mb-1">
          Administration
        </div>
        <h1 className="text-4xl font-black tracking-tight">Support Tickets</h1>
        <p className="text-sm text-muted-foreground/80 mt-1">
          Review patient, doctor, and reception support requests submitted through ShebaSetu.
        </p>
      </div>

      <AdminSupportPanel tickets={serializedTickets} activeTicketId={ticketId} />
    </div>
  );
}
