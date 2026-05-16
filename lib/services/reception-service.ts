import { prisma } from "@/lib/db";
import { AppointmentStatus, QueueStatus } from "@prisma/client";
import { startOfDay, endOfDay } from "date-fns";

export async function getReceptionStats(hospitalId?: string) {
  const today = new Date();
  const start = startOfDay(today);
  const end = endOfDay(today);

  const [activeQueues, totalTokens, apptsRemaining, staffActive] = await Promise.all([
    // Active Queues: Doctors who have at least one WAITING or CALLED token today
    prisma.doctorProfile.count({
      where: {
        appointments: {
          some: {
            ...(hospitalId ? { hospitalId } : {}),
            scheduledAt: { gte: start, lte: end },
            queueToken: {
              status: { in: [QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_PROGRESS] }
            }
          }
        }
      }
    }),
    // Total Tokens issued today
    prisma.queueToken.count({
      where: {
        ...(hospitalId
          ? {
              appointment: {
                hospitalId,
              },
            }
          : {}),
        createdAt: { gte: start, lte: end }
      }
    }),
    // Appointments Remaining: PENDING or CONFIRMED for today
    prisma.appointment.count({
      where: {
        ...(hospitalId ? { hospitalId } : {}),
        scheduledAt: { gte: start, lte: end },
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] }
      }
    }),
    // Staff Active: Count doctors assigned to this hospital
    prisma.doctorProfile.count({
      where: {
        user: { isActive: true },
        ...(hospitalId
          ? {
              OR: [
                { hospitalIds: { has: hospitalId } },
                { departments: { some: { hospitalId } } },
              ],
            }
          : {}),
      }
    })
  ]);

  return {
    activeQueues,
    totalTokens,
    apptsRemaining,
    staffActive
  };
}

export async function getRecentCheckIns(limit = 5, hospitalId?: string) {
  return prisma.appointment.findMany({
    where: {
      ...(hospitalId ? { hospitalId } : {}),
      status: { in: [AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_PROGRESS] }
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
      queueToken: true,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

export async function getQueueMovements(hospitalId?: string) {
  // Filter activity logs related to tokens in the current hospital
  return prisma.activityLog.findMany({
    where: {
      entityType: { in: ["QueueToken", "Appointment"] },
      ...(hospitalId ? {
        OR: [
          { action: "CHECK_IN" },
          { action: { contains: "QUEUE" } },
          { action: { contains: "TOKEN" } }
        ],
      } : {})
    },
    include: {
      user: true
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });
}

export async function getActiveDoctors(hospitalId?: string) {
  return prisma.doctorProfile.findMany({
    where: {
      user: { isActive: true },
      ...(hospitalId
        ? {
            OR: [
              { hospitalIds: { has: hospitalId } },
              { departments: { some: { hospitalId } } },
            ],
          }
        : {}),
    },
    include: {
      user: true,
      departments: true
    }
  });
}

export async function getPendingCheckIns(hospitalId?: string) {
  const start = startOfDay(new Date());
  const end = endOfDay(new Date());

  return prisma.appointment.findMany({
    where: {
      ...(hospitalId ? { hospitalId } : {}),
      scheduledAt: { gte: start, lte: end },
      status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] }
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
      department: true,
    },
    orderBy: { scheduledAt: "asc" }
  });
}

export async function getFullQueue(hospitalId?: string) {
  const start = startOfDay(new Date());
  const end = endOfDay(new Date());

  return prisma.appointment.findMany({
    where: {
      ...(hospitalId ? { hospitalId } : {}),
      scheduledAt: { gte: start, lte: end },
      queueToken: { isNot: null }
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
      queueToken: true,
    },
    orderBy: {
      queueToken: { position: "asc" }
    }
  });
}

export async function getDoctorsWithSchedules(hospitalId?: string) {
  return prisma.doctorProfile.findMany({
    where: {
      user: { isActive: true },
      ...(hospitalId
        ? {
            OR: [
              { hospitalIds: { has: hospitalId } },
              { departments: { some: { hospitalId } } },
            ],
          }
        : {}),
    },
    include: {
      user: true,
      schedules: {
        where: {
          startTime: { gte: new Date() }
        },
        include: {
          appointment: {
            include: {
              patient: {
                include: { user: true }
              }
            }
          }
        },
        orderBy: { startTime: "asc" }
      }
    }
  });
}
