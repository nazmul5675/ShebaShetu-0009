"use server"

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

const slotSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  hospitalId: z.string(),
});

type SessionUser = {
  id?: string;
  role?: string;
};

export async function createScheduleSlot(formData: FormData) {
  const session = await auth();
  const sessionUser = session?.user as SessionUser | undefined;
  if (!sessionUser?.id || sessionUser.role !== "DOCTOR") {
    return { success: false, error: "Unauthorized" };
  }

  const doctor = await prisma.doctorProfile.findUnique({
    where: { userId: sessionUser.id },
    include: {
      departments: { select: { hospitalId: true } },
      hospitals: { select: { id: true } },
    },
  });

  if (!doctor) return { success: false, error: "Doctor profile not found" };

  try {
    const parsed = slotSchema.safeParse({
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      hospitalId: formData.get("hospitalId"),
    });

    if (!parsed.success) {
      return { success: false, error: "Invalid schedule slot data." };
    }

    const data = {
      startTime: new Date(parsed.data.startTime),
      endTime: new Date(parsed.data.endTime),
      hospitalId: parsed.data.hospitalId,
      doctorId: doctor.id,
    };

    if (data.endTime <= data.startTime) {
      return { success: false, error: "End time must be after start time." };
    }

    const departmentHospitalIds = doctor.departments
      .map((department) => department.hospitalId)
      .filter((id): id is string => Boolean(id));
    const manualHospitalIds = doctor.hospitals.map((hospital) => hospital.id);
    const assignedHospitalIds = Array.from(new Set([...departmentHospitalIds, ...manualHospitalIds]));

    if (!assignedHospitalIds.includes(data.hospitalId)) {
      return { success: false, error: "You can only create slots for assigned hospitals." };
    }

    const overlappingSlot = await prisma.scheduleSlot.findFirst({
      where: {
        doctorId: doctor.id,
        hospitalId: data.hospitalId,
        startTime: { lt: data.endTime },
        endTime: { gt: data.startTime },
      },
    });

    if (overlappingSlot) {
      return { success: false, error: "This slot overlaps with an existing slot." };
    }

    const slot = await prisma.scheduleSlot.create({ data });

    revalidatePath("/doctor/schedule");
    revalidatePath("/patient/booking");
    revalidateTag("departments");
    return { success: true, slot };
  } catch (error) {
    return { success: false, error: "Failed to create slot" };
  }
}

export async function toggleSlotAvailability(slotId: string, isAvailable: boolean) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    await prisma.scheduleSlot.update({
      where: { id: slotId },
      data: { isAvailable }
    });
    revalidatePath("/doctor/schedule");
    revalidatePath("/patient/booking");
    revalidateTag("departments");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update slot" };
  }
}

export async function startAppointment(appointmentId: string) {
  const session = await auth();
  const sessionUser = session?.user as SessionUser | undefined;
  if (!sessionUser?.id || sessionUser.role !== "DOCTOR") return { success: false, error: "Unauthorized" };

  try {
    const doctor = await prisma.doctorProfile.findUnique({
      where: { userId: sessionUser.id },
      select: { id: true },
    });

    if (!doctor) return { success: false, error: "Doctor profile not found" };

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { queueToken: true }
    });

    if (!appointment) return { success: false, error: "Appointment not found" };
    if (appointment.doctorId !== doctor.id) return { success: false, error: "Unauthorized appointment access" };

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "IN_PROGRESS",
        ...(appointment.queueToken ? {
          queueToken: {
            update: {
              status: "IN_PROGRESS",
              calledAt: new Date()
            }
          }
        } : {})
      }
    });

    revalidatePath("/doctor/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to start session" };
  }
}

export async function completeAppointment(appointmentId: string, clinicalNotes: string, prescription: string) {
  const session = await auth();
  const sessionUser = session?.user as SessionUser | undefined;
  if (!sessionUser?.id || sessionUser.role !== "DOCTOR") return { success: false, error: "Unauthorized" };

  try {
    const doctor = await prisma.doctorProfile.findUnique({
      where: { userId: sessionUser.id },
      select: { id: true },
    });

    if (!doctor) return { success: false, error: "Doctor profile not found" };

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { queueToken: true }
    });

    if (!appointment) return { success: false, error: "Appointment not found" };
    if (appointment.doctorId !== doctor.id) return { success: false, error: "Unauthorized appointment access" };

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "COMPLETED",
        clinicalNotes,
        prescription,
        ...(appointment.queueToken ? {
          queueToken: {
            update: {
              status: "COMPLETED",
              completedAt: new Date()
            }
          }
        } : {})
      }
    });

    revalidatePath("/doctor/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to complete session" };
  }
}

export async function deleteScheduleSlot(slotId: string) {
  const session = await auth();
  const sessionUser = session?.user as SessionUser | undefined;
  if (!sessionUser?.id || sessionUser.role !== "DOCTOR") {
    return { success: false, error: "Unauthorized" };
  }

  const userId = sessionUser.id;

  try {
    // Ensure the slot belongs to the logged-in doctor
    const slot = await prisma.scheduleSlot.findUnique({
      where: { id: slotId },
      include: { doctor: true }
    });

    if (!slot) return { success: false, error: "Slot not found" };
    if (slot.doctor.userId !== userId) return { success: false, error: "Unauthorized access to slot" };
    if (slot.isBooked) return { success: false, error: "Cannot delete a booked slot" };

    await prisma.scheduleSlot.delete({
      where: { id: slotId }
    });

    revalidatePath("/doctor/schedule");
    revalidatePath("/patient/booking");
    revalidateTag("departments");
    return { success: true };
  } catch (error) {
    console.error("Delete slot error:", error);
    return { success: false, error: "Failed to delete slot" };
  }
}
