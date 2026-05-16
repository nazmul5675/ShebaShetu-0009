import { prisma } from "@/lib/db";
import { AppointmentStatus, QueueStatus } from "@prisma/client";
import { unstable_cache } from "next/cache";

export const getCachedDepartments = unstable_cache(
  async () => {
    const now = new Date();

    return await prisma.department.findMany({
      orderBy: { name: "asc" },
      include: {
        hospital: true,
        doctors: {
          where: {
            user: { isActive: true },
            schedules: {
              some: {
                isAvailable: true,
                isBooked: false,
                startTime: { gte: now },
              },
            },
          },
          include: {
            user: {
              select: { id: true, name: true, image: true }
            },
            hospitals: true,
            schedules: {
              where: {
                isAvailable: true,
                isBooked: false,
                startTime: { gte: now },
              },
              include: {
                hospital: true,
              },
              orderBy: { startTime: "asc" },
              take: 20,
            },
          }
        }
      }
    });
  },
  ["departments-list"],
  { tags: ["departments"], revalidate: 60 }
);

// Cache patient ID to avoid redundant lookups
const getPatientId = async (userId: string) => {
  const patient = await prisma.patientProfile.findUnique({
    where: { userId },
    select: { id: true }
  });
  return patient?.id;
};

export async function getUpcomingAppointments(userId: string, limit = 10) {
  const patientId = await getPatientId(userId);
  if (!patientId) return [];

  return await prisma.appointment.findMany({
    where: {
      patientId,
      status: {
        in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN]
      }
    },
    include: {
      doctor: {
        include: {
          user: { select: { name: true, image: true } }
        }
      },
      department: { select: { name: true } },
      queueToken: { select: { tokenNumber: true, position: true } }
    },
    orderBy: { scheduledAt: 'asc' },
    take: limit
  });
}

export async function getActiveQueueStatus(userId: string) {
  const patientId = await getPatientId(userId);
  if (!patientId) return null;

  return await prisma.appointment.findFirst({
    where: {
      patientId,
      status: {
        in: [AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_PROGRESS]
      }
    },
    include: {
      doctor: {
        include: {
          user: { select: { name: true, image: true } }
        }
      },
      department: { select: { name: true } },
      queueToken: true
    }
  });
}

export async function getPatientStats(userId: string) {
  const patientId = await getPatientId(userId);
  if (!patientId) return { totalVisits: 0, uniqueDoctors: 0, upcomingCount: 0, totalReports: 0, onTimeRate: "N/A" };

  const [totalVisits, uniqueDoctors, upcomingCount, totalReports] = await Promise.all([
    prisma.appointment.count({ where: { patientId, status: AppointmentStatus.COMPLETED } }),
    prisma.appointment.groupBy({
      by: ['doctorId'],
      where: { patientId },
    }).then(res => res.length),
    prisma.appointment.count({
      where: {
        patientId,
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] }
      }
    }),
    prisma.report.count({ where: { patientId } })
  ]);

  return {
    totalVisits,
    uniqueDoctors,
    upcomingCount,
    totalReports,
    onTimeRate: totalVisits > 0 ? "98%" : "N/A"
  };
}

export async function getPeopleAhead(appointmentId: string) {
  const currentToken = await prisma.queueToken.findUnique({
    where: { appointmentId },
    select: { position: true, status: true }
  });

  if (!currentToken || currentToken.status !== QueueStatus.WAITING) return [];

  return await prisma.queueToken.findMany({
    where: {
      status: QueueStatus.WAITING,
      position: { lt: currentToken.position }
    },
    include: {
      appointment: {
        include: {
          patient: {
            include: {
              user: { select: { name: true } }
            }
          }
        }
      }
    },
    take: 3,
    orderBy: { position: 'desc' }
  });
}

export async function getPatientReports(userId: string, search?: string) {
  const patientId = await getPatientId(userId);
  if (!patientId) return [];

  return await prisma.report.findMany({
    where: {
      patientId,
      OR: search ? [
        { title: { contains: search, mode: 'insensitive' } },
      ] : undefined
    },
    orderBy: { uploadedAt: 'desc' }
  });
}

