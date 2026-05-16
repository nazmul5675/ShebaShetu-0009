"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { AppointmentStatus, QueueStatus } from "@prisma/client";

type SessionUser = {
  id?: string;
  role?: string;
};

export async function checkInPatient(appointmentId: string) {
  const session = await auth();
  const sessionUser = session?.user as SessionUser | undefined;
  if (!sessionUser?.id || sessionUser.role !== "RECEPTION") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const receptionist = await prisma.receptionProfile.findUnique({
      where: { userId: sessionUser.id },
      select: { hospitalId: true },
    });

    if (!receptionist?.hospitalId) {
      return { success: false, error: "No hospital assigned. Please contact admin." };
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: true, queueToken: true }
    });

    if (!appointment) return { success: false, error: "Appointment not found" };
    if (appointment.hospitalId !== receptionist.hospitalId) {
      return { success: false, error: "This appointment belongs to another hospital." };
    }
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
        userId: sessionUser.id,
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
  const sessionUser = session?.user as SessionUser | undefined;
  if (!sessionUser?.id || sessionUser.role !== "RECEPTION") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const receptionist = await prisma.receptionProfile.findUnique({
      where: { userId: sessionUser.id },
      select: { hospitalId: true },
    });

    if (!receptionist?.hospitalId) {
      return { success: false, error: "No hospital assigned. Please contact admin." };
    }

    const token = await prisma.queueToken.findUnique({
      where: { id: tokenId },
      include: { appointment: { select: { hospitalId: true } } },
    });

    if (!token) return { success: false, error: "Queue token not found" };
    if (token.appointment.hospitalId !== receptionist.hospitalId) {
      return { success: false, error: "This queue token belongs to another hospital." };
    }

    await prisma.queueToken.update({
      where: { id: tokenId },
      data: {
        status,
        ...(status === QueueStatus.CALLED ? { calledAt: new Date() } : {}),
        ...(status === QueueStatus.COMPLETED ? { completedAt: new Date() } : {}),
      }
    });

    if (status === QueueStatus.IN_PROGRESS) {
      await prisma.appointment.update({
        where: { id: token.appointmentId },
        data: { status: AppointmentStatus.IN_PROGRESS },
      });
    }

    if (status === QueueStatus.COMPLETED) {
      await prisma.appointment.update({
        where: { id: token.appointmentId },
        data: { status: AppointmentStatus.COMPLETED },
      });
    }

    if (status === QueueStatus.CANCELLED || status === QueueStatus.NO_SHOW) {
      await prisma.appointment.update({
        where: { id: token.appointmentId },
        data: { status: status === QueueStatus.NO_SHOW ? AppointmentStatus.NO_SHOW : AppointmentStatus.CANCELLED },
      });
    }

    revalidatePath("/reception/queue");
    revalidatePath("/doctor/dashboard");
    revalidatePath("/patient/live-queue");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update queue status" };
  }
}

export async function moveQueuePosition(tokenId: string, direction: "UP" | "DOWN") {
  const session = await auth();
  const sessionUser = session?.user as SessionUser | undefined;
  if (!sessionUser?.id || sessionUser.role !== "RECEPTION") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const receptionist = await prisma.receptionProfile.findUnique({
      where: { userId: sessionUser.id },
      select: { hospitalId: true },
    });

    if (!receptionist?.hospitalId) {
      return { success: false, error: "No hospital assigned." };
    }

    const currentToken = await prisma.queueToken.findUnique({
      where: { id: tokenId },
      include: { appointment: true }
    });

    if (!currentToken) return { success: false, error: "Token not found" };
    if (currentToken.appointment.hospitalId !== receptionist.hospitalId) {
      return { success: false, error: "Unauthorized access to token." };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the token to swap with
    const otherToken = await prisma.queueToken.findFirst({
      where: {
        appointment: {
          doctorId: currentToken.appointment.doctorId,
          scheduledAt: { gte: today },
        },
        status: QueueStatus.WAITING,
        position: direction === "UP" ? { lt: currentToken.position } : { gt: currentToken.position }
      },
      orderBy: { position: direction === "UP" ? "desc" : "asc" }
    });

    if (!otherToken) {
      return { success: false, error: `Token is already at the ${direction === "UP" ? "top" : "bottom"} of the queue.` };
    }

    // Swap positions
    await prisma.$transaction([
      prisma.queueToken.update({
        where: { id: currentToken.id },
        data: { position: otherToken.position }
      }),
      prisma.queueToken.update({
        where: { id: otherToken.id },
        data: { position: currentToken.position }
      })
    ]);

    revalidatePath("/reception/queue");
    revalidatePath("/doctor/dashboard");
    revalidatePath("/patient/live-queue");
    return { success: true };
  } catch (error) {
    console.error("Move queue error:", error);
    return { success: false, error: "Failed to move token" };
  }
}
