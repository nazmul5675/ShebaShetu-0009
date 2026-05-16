import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCachedDepartments } from "@/lib/services/appointment-service";
import { BookingForm } from "@/components/patient/BookingForm";

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { dept } = await searchParams;

  // Optimized: Fetching from cache
  const departments = await getCachedDepartments();
  const serializedDepartments = JSON.parse(JSON.stringify(departments));

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/80 mb-1">Appointment Center</div>
          <h1 className="text-4xl font-black tracking-tight">Book an Appointment</h1>
          <p className="text-sm text-muted-foreground/80 mt-1 max-w-md">
            Schedule your visit with our expert clinical team. Experience healthcare without the wait.
          </p>
        </div>
      </div>

      <BookingForm departments={serializedDepartments} initialDept={dept} />
    </div>
  );
}

