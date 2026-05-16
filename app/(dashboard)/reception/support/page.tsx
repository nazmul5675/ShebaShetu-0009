import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserSupportTickets } from "@/app/actions/support";
import { SupportPanel } from "@/components/support/SupportPanel";

export default async function ReceptionSupportPage({
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
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold">Help & Support</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Get in touch with the hospital coordination desk or report a system issue.
        </p>
      </div>

      <SupportPanel tickets={serializedTickets} activeTicketId={ticketId} />
    </div>
  );
}
