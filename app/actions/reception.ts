"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { AppointmentStatus, QueueStatus } from "@prisma/client";

export async function checkInPatient(appointmentId: string) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "RECEPTION") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: true, queueToken: true }
    });

    if (!appointment) return { success: false, error: "Appointment not found" };
    if (appointment.queueToken) return { success: false, error: "Patient already checked in" };

    // Get the next token number for this doctor today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await prisma.queueToken.count({
      where: {
        appointment: {
          doctorId: appointment.doctorId,
          scheduledAt: { gte: today }
        }
      }
    });

    const tokenNumber = `${appointment.doctor.specialization[0].toUpperCase()}-${count + 1}`;

    // Create token and update appointment
    await prisma.queueToken.create({
      data: {
        appointmentId,
        tokenNumber,
        position: count + 1,
        status: QueueStatus.WAITING,
      }
    });

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CHECKED_IN }
    });

    // Log movement
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "CHECK_IN",
        entityId: appointmentId,
        entityType: "Appointment",
        details: `Patient checked in. Token: ${tokenNumber}`
      }
    });

    revalidatePath("/reception/dashboard");
    revalidatePath("/reception/queue");
    return { success: true, tokenNumber };
  } catch (error) {
    console.error("Check-in error:", error);
    return { success: false, error: "Failed to process check-in" };
  }
}

export async function updateQueueStatus(tokenId: string, status: QueueStatus) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "RECEPTION") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.queueToken.update({
      where: { id: tokenId },
      data: { status }
    });

    revalidatePath("/reception/queue");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update queue status" };
  }
}

export async function moveQueuePosition(tokenId: string, direction: "UP" | "DOWN") {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "RECEPTION") {
    return { success: false, error: "Unauthorized" };
  }

  // This is a bit complex for a simple move, usually involves swapping positions
  // For now, let's just return a placeholder error to avoid complexity if not strictly needed
  return { success: false, error: "Manual reordering coming soon" };
}
