"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

type SessionUser = {
    id?: string;
    role?: string;
};

const baseProfileSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    isActive: z.boolean(),
});

const patientProfileSchema = z.object({
    age: z.number().int().min(0).max(130).optional().nullable(),
    gender: z.string().optional().nullable(),
    bloodGroup: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    emergencyContact: z.string().optional().nullable(),
});

const doctorProfileSchema = z.object({
    specialization: z.string().min(2, "Specialization is required"),
    consultationFee: z.number().min(0).optional().nullable(),
    licenseNo: z.string().optional().nullable(),
    roomNumber: z.string().optional().nullable(),
    departmentIds: z.array(z.string()),
    hospitalIds: z.array(z.string()).optional(),
});

const receptionProfileSchema = z.object({
    hospitalId: z.string().optional().nullable(),
});

async function requireAdmin() {
    const session = await auth();
    const user = session?.user as SessionUser | undefined;

    if (!user?.id) {
        return { error: "Unauthorized" as const };
    }

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
        return { error: "Only administrators can perform this action." as const };
    }

    return { user };
}

function revalidateAdminUserPaths(userId: string) {
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/doctor/schedule");
    revalidatePath("/patient/booking");
    revalidatePath("/reception/dashboard");
    revalidatePath("/reception/queue");
    revalidateTag("departments");
}

function unique(values: Array<string | null | undefined>) {
    return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export async function getAdminDashboardStats() {
    const admin = await requireAdmin();
    if ("error" in admin) return null;

    const [totalUsers, activeUsers, openTickets] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    ]);

    return { totalUsers, activeUsers, openTickets };
}

export async function getAdminUsers() {
    const admin = await requireAdmin();
    if ("error" in admin) return [];

    return prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
        },
    });
}

export async function getAdminUserById(userId: string) {
    const admin = await requireAdmin();
    if ("error" in admin) return null;

    return prisma.user.findUnique({
        where: { id: userId },
        include: {
            patientProfile: true,
            doctorProfile: {
                include: {
                    departments: { include: { hospital: true } },
                    hospitals: true,
                },
            },
            receptionProfile: {
                include: {
                    hospital: true,
                },
            },
        },
    });
}

export async function updateAdminUserBaseProfile(
    userIdOrData: string | ({ userId: string } & z.infer<typeof baseProfileSchema>),
    data?: z.infer<typeof baseProfileSchema>
) {
    const admin = await requireAdmin();
    if ("error" in admin) return { success: false, error: admin.error };

    const userId = typeof userIdOrData === "string" ? userIdOrData : userIdOrData.userId;
    const payload = typeof userIdOrData === "string" ? data : userIdOrData;
    const parsed = baseProfileSchema.safeParse(payload);
    if (!parsed.success) return { success: false, error: "Invalid user profile data." };

    try {
        await prisma.user.update({
            where: { id: userId },
            data: parsed.data,
        });

        revalidateAdminUserPaths(userId);
        return { success: true };
    } catch (error) {
        console.error("[ADMIN_UPDATE_USER_BASE_ERROR]", error);
        return { success: false, error: "Failed to update user profile." };
    }
}

export async function updatePatientProfileByAdmin(
    userIdOrData: string | ({ userId: string } & z.infer<typeof patientProfileSchema>),
    data?: z.infer<typeof patientProfileSchema>
) {
    const admin = await requireAdmin();
    if ("error" in admin) return { success: false, error: admin.error };

    const userId = typeof userIdOrData === "string" ? userIdOrData : userIdOrData.userId;
    const payload = typeof userIdOrData === "string" ? data : userIdOrData;
    const parsed = patientProfileSchema.safeParse(payload);
    if (!parsed.success) return { success: false, error: "Invalid patient profile data." };

    try {
        await prisma.patientProfile.upsert({
            where: { userId },
            update: parsed.data,
            create: {
                userId,
                ...parsed.data,
            },
        });

        revalidateAdminUserPaths(userId);
        revalidatePath("/patient/settings");
        return { success: true };
    } catch (error) {
        console.error("[ADMIN_UPDATE_PATIENT_ERROR]", error);
        return { success: false, error: "Failed to update patient profile." };
    }
}

async function syncDoctorDepartments(
    doctorId: string,
    previousDepartmentIds: string[],
    nextDepartmentIds: string[],
    tx: Prisma.TransactionClient
) {
    const touchedDepartments = await tx.department.findMany({
        where: {
            OR: [
                { id: { in: unique([...previousDepartmentIds, ...nextDepartmentIds]) } },
                { doctorIds: { has: doctorId } },
            ],
        },
        select: { id: true, doctorIds: true },
    });

    await Promise.all(
        touchedDepartments.map((department) => {
            const shouldInclude = nextDepartmentIds.includes(department.id);
            const nextDoctorIds = shouldInclude
                ? unique([...department.doctorIds, doctorId])
                : department.doctorIds.filter((id) => id !== doctorId);

            return tx.department.update({
                where: { id: department.id },
                data: { doctorIds: nextDoctorIds },
            });
        })
    );
}

export async function updateDoctorProfileByAdmin(
    userIdOrData: string | ({ userId: string } & z.input<typeof doctorProfileSchema>),
    data?: z.input<typeof doctorProfileSchema>
) {
    const admin = await requireAdmin();
    if ("error" in admin) return { success: false, error: admin.error };

    const userId = typeof userIdOrData === "string" ? userIdOrData : userIdOrData.userId;
    const payload = typeof userIdOrData === "string" ? data : userIdOrData;
    const parsed = doctorProfileSchema.safeParse(payload);
    if (!parsed.success) return { success: false, error: "Invalid doctor profile data." };

    try {
        await prisma.$transaction(async (tx) => {
            const selectedDepartments = await tx.department.findMany({
                where: { id: { in: parsed.data.departmentIds } },
                select: { id: true, hospitalId: true },
            });

            const normalizedDepartmentIds = selectedDepartments.map((department) => department.id);
            const selectedHospitals = await tx.hospital.findMany({
                where: { id: { in: parsed.data.hospitalIds || [] } },
                select: { id: true },
            });
            const normalizedHospitalIds = selectedHospitals.map((hospital) => hospital.id);

            const existingDoctor = await tx.doctorProfile.findUnique({
                where: { userId },
                select: { id: true, departmentIds: true },
            });

            const doctor = existingDoctor
                ? await tx.doctorProfile.update({
                    where: { userId },
                    data: {
                        specialization: parsed.data.specialization,
                        consultationFee: parsed.data.consultationFee,
                        licenseNo: parsed.data.licenseNo?.trim() || null,
                        roomNumber: parsed.data.roomNumber?.trim() || null,
                        departmentIds: normalizedDepartmentIds,
                        hospitalIds: normalizedHospitalIds,
                    },
                    select: { id: true },
                })
                : await tx.doctorProfile.create({
                    data: {
                        userId,
                        specialization: parsed.data.specialization,
                        consultationFee: parsed.data.consultationFee,
                        licenseNo: parsed.data.licenseNo?.trim() || null,
                        roomNumber: parsed.data.roomNumber?.trim() || null,
                        departmentIds: normalizedDepartmentIds,
                        hospitalIds: normalizedHospitalIds,
                    },
                    select: { id: true },
                });

            await syncDoctorDepartments(
                doctor.id,
                existingDoctor?.departmentIds || [],
                normalizedDepartmentIds,
                tx
            );
        });

        revalidateAdminUserPaths(userId);
        return { success: true };
    } catch (error) {
        console.error("[ADMIN_UPDATE_DOCTOR_ERROR]", error);
        return { success: false, error: "Failed to update doctor profile." };
    }
}

export async function assignDoctorHospitalDepartment(
    userId: string,
    data: z.infer<typeof doctorProfileSchema>
) {
    return updateDoctorProfileByAdmin(userId, data);
}

export async function createHospitalForDoctorByAdmin(userId: string, hospitalName: string) {
    const admin = await requireAdmin();
    if ("error" in admin) return { success: false, error: admin.error };

    const parsedName = z.string().min(2, "Hospital name is required").parse(hospitalName.trim());

    try {
        const hospital = await prisma.hospital.create({
            data: {
                name: parsedName,
                address: "",
                phone: null,
            },
        });

        const existingDoctor = await prisma.doctorProfile.findUnique({
            where: { userId },
            select: { hospitalIds: true },
        });

        const nextHospitalIds = unique([...(existingDoctor?.hospitalIds || []), hospital.id]);

        if (existingDoctor) {
            await prisma.doctorProfile.update({
                where: { userId },
                data: {
                    hospitalIds: nextHospitalIds,
                },
            });
        } else {
            await prisma.doctorProfile.create({
                data: {
                    userId,
                    specialization: "General Physician",
                    consultationFee: null,
                    licenseNo: null,
                    roomNumber: null,
                    departmentIds: [],
                    hospitalIds: [hospital.id],
                },
            });
        }

        revalidateAdminUserPaths(userId);
        return { success: true, hospital };
    } catch (error) {
        console.error("[ADMIN_CREATE_HOSPITAL_ERROR]", error);
        return { success: false, error: "Failed to create hospital." };
    }
}

export async function updateReceptionistProfileByAdmin(
    userIdOrData: string | ({ userId: string } & z.infer<typeof receptionProfileSchema>),
    data?: z.infer<typeof receptionProfileSchema>
) {
    const admin = await requireAdmin();
    if ("error" in admin) return { success: false, error: admin.error };

    const userId = typeof userIdOrData === "string" ? userIdOrData : userIdOrData.userId;
    const payload = typeof userIdOrData === "string" ? data : userIdOrData;
    const parsed = receptionProfileSchema.safeParse(payload);
    if (!parsed.success) return { success: false, error: "Invalid receptionist profile data." };

    try {
        await prisma.receptionProfile.upsert({
            where: { userId },
            update: {
                hospitalId: parsed.data.hospitalId || null,
            },
            create: {
                userId,
                hospitalId: parsed.data.hospitalId || null,
            },
        });

        revalidateAdminUserPaths(userId);
        return { success: true };
    } catch (error) {
        console.error("[ADMIN_UPDATE_RECEPTION_ERROR]", error);
        return { success: false, error: "Failed to update receptionist profile." };
    }
}

export async function assignReceptionistHospital(userId: string, hospitalId: string | null) {
    return updateReceptionistProfileByAdmin(userId, { hospitalId });
}
