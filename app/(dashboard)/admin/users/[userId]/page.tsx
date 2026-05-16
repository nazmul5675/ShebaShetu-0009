import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdminUserDetailForm } from "@/components/admin/AdminUserDetailForm";
import { prisma } from "@/lib/db";

type SessionUser = {
    role?: string;
};

async function requireAdmin() {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const role = (session.user as SessionUser).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        redirect("/unauthorized");
    }
}

export default async function AdminUserDetailPage({
    params,
}: {
    params: Promise<{ userId: string }>;
}) {
    await requireAdmin();
    const { userId } = await params;

    const [user, hospitals, departments] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            include: {
                patientProfile: true,
                doctorProfile: {
                    include: {
                        departments: { include: { hospital: true } },
                    },
                },
                receptionProfile: {
                    include: { hospital: true },
                },
            },
        }),
        prisma.hospital.findMany({
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                address: true,
            },
        }),
        prisma.department.findMany({
            orderBy: { name: "asc" },
            include: {
                hospital: {
                    select: {
                        name: true,
                    },
                },
            },
        }),
    ]);

    if (!user) redirect("/admin/users");

    const serializedUser = JSON.parse(JSON.stringify(user));
    const serializedHospitals = JSON.parse(JSON.stringify(hospitals));
    const serializedDepartments = JSON.parse(JSON.stringify(departments));

    return (
        <AdminUserDetailForm
            user={serializedUser}
            hospitals={serializedHospitals}
            departments={serializedDepartments}
        />
    );
}
