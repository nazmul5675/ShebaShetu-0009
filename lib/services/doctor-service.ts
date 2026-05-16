import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { format } from "date-fns";

export async function getDoctorStats(userId: string) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { userId },
    include: {
      _count: {
        select: {
          appointments: true,
        }
      }
    }
  });

  if (!doctor) return null;

  // Real calculation for today's appointments
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const appointmentsToday = await prisma.appointment.count({
    where: {
      doctorId: doctor.id,
      scheduledAt: {
        gte: startOfDay,
        lte: endOfDay,
      }
    }
  });

  const completedToday = await prisma.appointment.count({
    where: {
      doctorId: doctor.id,
      status: "COMPLETED",
      updatedAt: {
        gte: startOfDay,
        lte: endOfDay,
      }
    }
  });

  return {
    appointmentsToday,
    completedToday,
    totalHistory: doctor._count.appointments,
    specialization: doctor.specialization,
    avgWaitTime: await getAverageWaitTime(doctor.id)
  };
}

async function getAverageWaitTime(doctorId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const completedAppts = await prisma.appointment.findMany({
    where: {
      doctorId,
      status: "COMPLETED",
      updatedAt: { gte: startOfDay }
    },
    include: { queueToken: true }
  });

  const finishedAppointments = completedAppts.filter((appt) => appt.queueToken?.calledAt);
  if (finishedAppointments.length === 0) return "00:00";

  const totalWait = finishedAppointments.reduce((acc, appt) => {
    const calledAt = appt.queueToken?.calledAt;
    if (!calledAt) return acc;
    const wait = appt.updatedAt.getTime() - calledAt.getTime();
    return acc + wait;
  }, 0);

  const avgMs = totalWait / finishedAppointments.length;
  const minutes = Math.floor(avgMs / 60000);
  const seconds = Math.round((avgMs % 60000) / 1000);
  const normalizedMinutes = minutes + (seconds === 60 ? 1 : 0);
  const normalizedSeconds = seconds === 60 ? 0 : seconds;

  return `${String(normalizedMinutes).padStart(2, "0")}:${String(normalizedSeconds).padStart(2, "0")}`;
}

export async function getDoctorAppointments(userId: string) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { userId }
  });

  if (!doctor) return [];

  return prisma.appointment.findMany({
    where: {
      doctorId: doctor.id,
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] }
    },
    include: {
      patient: {
        include: {
          user: {
            select: { name: true, image: true }
          }
        }
      },
      queueToken: true
    },
    orderBy: {
      scheduledAt: "asc"
    },
    take: 10
  });
}

export async function getActiveAppointment(userId: string) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { userId }
  });

  if (!doctor) return null;

  return prisma.appointment.findFirst({
    where: {
      doctorId: doctor.id,
      status: "IN_PROGRESS"
    },
    include: {
      patient: {
        include: {
          user: {
            select: { name: true, image: true }
          }
        }
      },
      queueToken: true
    }
  });
}

export async function getDoctorAvailability(userId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const slots = await prisma.scheduleSlot.findMany({
    where: {
      doctor: { userId },
      startTime: { gte: startOfDay, lte: endOfDay },
      isAvailable: true
    },
    orderBy: { startTime: "asc" }
  });

  if (slots.length === 0) return null;

  const first = slots[0];
  const last = slots[slots.length - 1];

  return `${format(new Date(first.startTime), "HH:mm")} - ${format(new Date(last.endTime), "HH:mm")}`;
}

export async function getPatientHistory(patientId: string) {
  return prisma.appointment.findMany({
    where: {
      patientId,
      status: "COMPLETED"
    },
    select: {
      id: true,
      scheduledAt: true,
      clinicalNotes: true,
      prescription: true,
      doctor: {
        select: {
          user: { select: { name: true } }
        }
      }
    },
    orderBy: { scheduledAt: "desc" },
    take: 5
  });
}
