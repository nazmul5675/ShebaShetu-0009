import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserSupportTickets } from "@/app/actions/support";
import { SupportPanel } from "@/components/support/SupportPanel";

export default async function PatientSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ ticketId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { ticketId } = await searchParams;
  const tickets = await getUserSupportTickets();
  const serializedTickets = JSON.parse(JSON.stringify(tickets));

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div>
        <div className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/80 mb-1">Help Center</div>
        <h1 className="text-4xl font-black tracking-tight">Support & Assistance</h1>
        <p className="text-sm text-muted-foreground/80 mt-1 max-w-2xl">
          Need help with your appointment? Encountered a technical issue? Our 24/7 coordination desk is here to help you.
        </p>
      </div>

      <SupportPanel tickets={serializedTickets} activeTicketId={ticketId} variant="patient" />
    </div>
  );
}
