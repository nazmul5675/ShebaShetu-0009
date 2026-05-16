import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getFullQueue, getPendingCheckIns, getQueueMovements } from "@/lib/services/reception-service";
import { QueueContent } from "./QueueContent";
import { prisma } from "@/lib/db";

export default async function ReceptionQueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const receptionProfile = await prisma.receptionProfile.findUnique({
    where: { userId },
    include: { hospital: true },
  });

  const hospitalId = receptionProfile?.hospitalId || undefined;

  const [queue, pendingAppointments, movements] = hospitalId
    ? await Promise.all([
        getFullQueue(hospitalId),
        getPendingCheckIns(hospitalId),
        getQueueMovements(hospitalId)
      ])
    : [[], [], await getQueueMovements()];

  // Serialize to avoid hydration issues with Date objects
  const serializedQueue = JSON.parse(JSON.stringify(queue));
  const serializedPending = JSON.parse(JSON.stringify(pendingAppointments));
  const serializedMovements = JSON.parse(JSON.stringify(movements));

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <QueueContent 
        queue={serializedQueue} 
        pendingAppointments={serializedPending} 
        movements={serializedMovements}
        canManage={Boolean(hospitalId)}
        hospitalName={receptionProfile?.hospital?.name || null}
      />
    </div>
  );
}
