"use server"

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AppointmentStatus } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { format } from "date-fns";

const bookingSchema = z.object({
  doctorId: z.string().min(1, "Please select a doctor"),
  departmentId: z.string().min(1, "Please select a department"),
  scheduleSlotId: z.string().min(1, "Please select an available slot"),
  symptoms: z.string().optional(),
});

type SessionUser = {
  id?: string;
  role?: string;
  name?: string | null;
};

export async function bookAppointment(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const sessionUser = session.user as SessionUser;
    if (!sessionUser.id || sessionUser.role !== "PATIENT") {
      return { success: false, error: "Only patients can book appointments." };
    }

    const userId = sessionUser.id;
    
    // Fetch and verify patient profile
    const patient = await prisma.patientProfile.findUnique({
      where: { userId }
    });

    if (!patient) {
      return { success: false, error: "Only registered patients can book appointments." };
    }

    // Safe validation
    const rawData = {
      doctorId: formData.get("doctorId"),
      departmentId: formData.get("departmentId"),
      scheduleSlotId: formData.get("scheduleSlotId"),
      symptoms: formData.get("symptoms"),
    };

    const validated = bookingSchema.safeParse(rawData);

    if (!validated.success) {
      return { 
        success: false, 
        error: "Invalid data", 
        details: validated.error.flatten().fieldErrors 
      };
    }

    const { doctorId, departmentId, scheduleSlotId, symptoms } = validated.data;

    const [slot, department] = await Promise.all([
      prisma.scheduleSlot.findUnique({
        where: { id: scheduleSlotId },
        include: {
          doctor: {
            select: {
              id: true,
              userId: true,
              departmentIds: true,
            },
          },
          appointment: { select: { id: true } },
        },
      }),
      prisma.department.findUnique({
        where: { id: departmentId },
        select: { id: true, doctorIds: true },
      }),
    ]);

    if (!slot || !department) {
      return { success: false, error: "Selected slot or department was not found." };
    }

    if (slot.doctorId !== doctorId) {
      return { success: false, error: "Selected slot does not belong to this doctor." };
    }

    if (!slot.isAvailable || slot.isBooked || slot.appointment || slot.startTime < new Date()) {
      return { success: false, error: "This slot is no longer available." };
    }

    const doctorDepartmentMatch =
      slot.doctor.departmentIds.includes(departmentId) ||
      department.doctorIds.includes(doctorId);

    if (!doctorDepartmentMatch) {
      return { success: false, error: "Doctor is not assigned to the selected department." };
    }

    const appointment = await prisma.$transaction(async (tx) => {
      const createdAppointment = await tx.appointment.create({
        data: {
          patientId: patient.id,
          doctorId,
          departmentId,
          hospitalId: slot.hospitalId,
          scheduleSlotId,
          scheduledAt: slot.startTime,
          symptoms,
          status: AppointmentStatus.PENDING,
        },
      });

      await tx.scheduleSlot.update({
        where: { id: scheduleSlotId },
        data: {
          isAvailable: false,
          isBooked: true,
        },
      });

      return createdAppointment;
    });

    // Notify Doctor
    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
      select: { userId: true }
    });

    if (doctor) {
      await prisma.notification.create({
        data: {
          userId: doctor.userId,
          title: "New Appointment Request",
          message: `A new patient (${sessionUser.name || "Patient"}) has scheduled an appointment for ${format(slot.startTime, "p")}.`,
          type: "APPOINTMENT",
          link: "/doctor/dashboard"
        }
      });
    }

    revalidatePath("/doctor/dashboard");
    revalidatePath("/patient/dashboard");
    revalidatePath("/patient/appointments");
    revalidatePath("/patient/booking");
    revalidateTag("departments");

    return { success: true, appointmentId: appointment.id };
  } catch (error) {
    console.error("[BOOK_APPOINTMENT_ERROR]", error);
    return { success: false, error: "An unexpected error occurred. Please try again later." };
  }
}
