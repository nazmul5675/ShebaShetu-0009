"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    updateAdminUserBaseProfile,
    updatePatientProfileByAdmin,
    updateDoctorProfileByAdmin,
    updateReceptionistProfileByAdmin,
} from "@/app/actions/admin";
import { format } from "date-fns";
import { Check, Hospital, ShieldCheck, Sparkles, Stethoscope, Users2 } from "lucide-react";

const GENDERS = ["Male", "Female", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

interface HospitalOption {
    id: string;
    name: string;
}

interface DepartmentOption {
    id: string;
    name: string;
    hospital?: {
        name: string | null;
    } | null;
}

interface PatientProfile {
    age?: number | null;
    gender?: string | null;
    bloodGroup?: string | null;
    address?: string | null;
    emergencyContact?: string | null;
}

interface DoctorProfile {
    id: string;
    specialization: string;
    consultationFee?: number | null;
    licenseNo?: string | null;
    departmentIds: string[];
    departments?: DepartmentOption[];
}

interface ReceptionProfile {
    hospitalId?: string | null;
    hospital?: HospitalOption | null;
}

interface UserProps {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    patientProfile?: PatientProfile | null;
    doctorProfile?: DoctorProfile | null;
    receptionProfile?: ReceptionProfile | null;
}

interface AdminUserDetailsClientProps {
    user: UserProps;
    hospitals: HospitalOption[];
    departments: DepartmentOption[];
}

export function AdminUserDetailsClient({ user, hospitals, departments }: AdminUserDetailsClientProps) {
    const router = useRouter();
    const [baseLoading, setBaseLoading] = useState(false);
    const [patientLoading, setPatientLoading] = useState(false);
    const [doctorLoading, setDoctorLoading] = useState(false);
    const [receptionLoading, setReceptionLoading] = useState(false);
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>(
        user.doctorProfile?.departmentIds ?? []
    );

    const assignedHospitalNames = useMemo(() => {
        const selectedDepartmentsSet = new Set(selectedDepartments);
        return departments
            .filter((department) => selectedDepartmentsSet.has(department.id))
            .map((department) => department.hospital?.name)
            .filter(Boolean) as string[];
    }, [departments, selectedDepartments]);

    // Deduplicate hospital names so React keys are unique when rendering
    const uniqueAssignedHospitalNames = useMemo(() => Array.from(new Set(assignedHospitalNames)), [assignedHospitalNames]);

    const handleBaseSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setBaseLoading(true);
        const formData = new FormData(event.currentTarget as HTMLFormElement);

        const response = await updateAdminUserBaseProfile({
            userId: user.id,
            name: (formData.get("name") as string) || "",
            isActive: formData.get("isActive") === "on",
        });

        setBaseLoading(false);
        if (response.success) {
            toast.success("Basic profile saved");
            router.refresh();
        } else {
            toast.error(response.error || "Failed to save profile");
        }
    };

    const handlePatientSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setPatientLoading(true);
        const formData = new FormData(event.currentTarget as HTMLFormElement);

        const ageValue = Number(formData.get("age"));
        const response = await updatePatientProfileByAdmin({
            userId: user.id,
            age: Number.isFinite(ageValue) ? ageValue : null,
            gender: (formData.get("gender") as string) || null,
            bloodGroup: (formData.get("bloodGroup") as string) || null,
            address: (formData.get("address") as string) || null,
            emergencyContact: (formData.get("emergencyContact") as string) || null,
        });

        setPatientLoading(false);
        if (response.success) {
            toast.success("Patient profile saved");
            router.refresh();
        } else {
            toast.error(response.error || "Failed to save patient profile");
        }
    };

    const handleDoctorSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setDoctorLoading(true);
        const formData = new FormData(event.currentTarget as HTMLFormElement);

        const consultationFee = Number(formData.get("consultationFee"));
        const response = await updateDoctorProfileByAdmin({
            userId: user.id,
            specialization: (formData.get("specialization") as string) || "",
            consultationFee: Number.isFinite(consultationFee) ? consultationFee : null,
            licenseNo: (formData.get("licenseNo") as string) || null,
            departmentIds: selectedDepartments,
        });

        setDoctorLoading(false);
        if (response.success) {
            toast.success("Doctor profile saved");
            router.refresh();
        } else {
            toast.error(response.error || "Failed to save doctor profile");
        }
    };

    const handleReceptionSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setReceptionLoading(true);
        const formData = new FormData(event.currentTarget as HTMLFormElement);

        const hospitalId = (formData.get("hospitalId") as string) || null;
        const response = await updateReceptionistProfileByAdmin({
            userId: user.id,
            hospitalId: hospitalId || null,
        });

        setReceptionLoading(false);
        if (response.success) {
            toast.success("Receptionist profile saved");
            router.refresh();
        } else {
            toast.error(response.error || "Failed to save receptionist profile");
        }
    };

    const onDepartmentChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = Array.from(event.target.selectedOptions, (option) => option.value);
        setSelectedDepartments(selected);
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-[1fr_320px]">
                <div className="glass rounded-3xl p-6">
                    <div className="flex flex-col gap-4">
                        <div>
                            <div className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/80 mb-2">User profile</div>
                            <div className="text-3xl font-black tracking-tight">{user.name || "Unnamed user"}</div>
                            <div className="text-sm text-muted-foreground mt-1">{user.email || "No email provided"}</div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-3xl bg-secondary/40 p-4">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Role</div>
                                <div className="mt-2 text-lg font-semibold">{user.role.replace("_", " ")}</div>
                            </div>
                            <div className="rounded-3xl bg-secondary/40 p-4">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Status</div>
                                <div className="mt-2 text-lg font-semibold">{user.isActive ? "Active" : "Inactive"}</div>
                            </div>
                            <div className="rounded-3xl bg-secondary/40 p-4">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Created</div>
                                <div className="mt-2 text-lg font-semibold">{format(new Date(user.createdAt), "PP")}</div>
                            </div>
                            <div className="rounded-3xl bg-secondary/40 p-4">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Updated</div>
                                <div className="mt-2 text-lg font-semibold">{format(new Date(user.updatedAt), "PP")}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass rounded-3xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-primary/80">
                        <ShieldCheck className="h-4 w-4" /> Admin actions
                    </div>
                    <div className="grid gap-3">
                        <div className="rounded-3xl bg-secondary/40 p-4">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Primary email</div>
                            <div className="mt-2 text-sm font-semibold">{user.email || "No email"}</div>
                        </div>
                        <div className="rounded-3xl bg-secondary/40 p-4">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Current role</div>
                            <div className="mt-2 text-sm font-semibold">{user.role.replace("_", " ")}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
                <div className="space-y-6">
                    <form onSubmit={handleBaseSubmit} className="glass rounded-3xl p-6 space-y-6">
                        <div className="flex items-center gap-3 text-lg font-bold">
                            <Users2 className="h-5 w-5 text-primary" /> Basic profile
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full name</Label>
                                <Input id="name" name="name" defaultValue={user.name ?? ""} required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="isActive">Account active</Label>
                                <div className="flex items-center gap-2">
                                    <input id="isActive" name="isActive" type="checkbox" defaultChecked={user.isActive} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                                    <span className="text-sm text-muted-foreground">Allow login access</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button disabled={baseLoading} className="h-12 px-6 rounded-xl bg-primary text-primary-foreground shadow-glow">
                                <Check className="h-4 w-4 mr-2" /> Save basic profile
                            </Button>
                        </div>
                    </form>

                    {user.role === "PATIENT" && (
                        <form onSubmit={handlePatientSubmit} className="glass rounded-3xl p-6 space-y-6">
                            <div className="flex items-center gap-3 text-lg font-bold">
                                <Stethoscope className="h-5 w-5 text-primary" /> Patient profile
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="age">Age</Label>
                                    <Input id="age" name="age" type="number" min={0} defaultValue={user.patientProfile?.age ?? ""} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gender">Gender</Label>
                                    <select id="gender" name="gender" defaultValue={user.patientProfile?.gender ?? ""} className="h-12 w-full rounded-xl border border-border/40 bg-background/50 px-3 text-sm outline-none focus:border-primary/50">
                                        <option value="">Select gender</option>
                                        {GENDERS.map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bloodGroup">Blood group</Label>
                                    <select id="bloodGroup" name="bloodGroup" defaultValue={user.patientProfile?.bloodGroup ?? ""} className="h-12 w-full rounded-xl border border-border/40 bg-background/50 px-3 text-sm outline-none focus:border-primary/50">
                                        <option value="">Select blood group</option>
                                        {BLOOD_GROUPS.map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Input id="address" name="address" defaultValue={user.patientProfile?.address ?? ""} />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="emergencyContact">Emergency contact</Label>
                                    <Input id="emergencyContact" name="emergencyContact" defaultValue={user.patientProfile?.emergencyContact ?? ""} />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button disabled={patientLoading} className="h-12 px-6 rounded-xl bg-primary text-primary-foreground shadow-glow">
                                    <Check className="h-4 w-4 mr-2" /> Save patient profile
                                </Button>
                            </div>
                        </form>
                    )}

                    {user.role === "DOCTOR" && (
                        <form onSubmit={handleDoctorSubmit} className="glass rounded-3xl p-6 space-y-6">
                            <div className="flex items-center gap-3 text-lg font-bold">
                                <Sparkles className="h-5 w-5 text-primary" /> Doctor profile
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="specialization">Specialization</Label>
                                    <Input id="specialization" name="specialization" defaultValue={user.doctorProfile?.specialization ?? ""} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="consultationFee">Consultation fee</Label>
                                    <Input id="consultationFee" name="consultationFee" type="number" min={0} defaultValue={user.doctorProfile?.consultationFee ?? ""} />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="licenseNo">License number</Label>
                                    <Input id="licenseNo" name="licenseNo" defaultValue={user.doctorProfile?.licenseNo ?? ""} />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="departments">Assigned departments</Label>
                                    <select
                                        id="departments"
                                        multiple
                                        value={selectedDepartments}
                                        onChange={onDepartmentChange}
                                        className="h-40 w-full rounded-xl border border-border/40 bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary/50"
                                    >
                                        {departments.map((department) => (
                                            <option key={department.id} value={department.id}>
                                                {department.name} {department.hospital?.name ? `— ${department.hospital.name}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="rounded-3xl bg-secondary/40 p-5">
                                <div className="text-sm font-semibold">Assigned Hospitals</div>
                                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                    {uniqueAssignedHospitalNames.length > 0 ? (
                                        uniqueAssignedHospitalNames.map((name) => <div key={name}>{name}</div>)
                                    ) : (
                                        <div>No hospitals assigned via departments.</div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button disabled={doctorLoading} className="h-12 px-6 rounded-xl bg-primary text-primary-foreground shadow-glow">
                                    <Check className="h-4 w-4 mr-2" /> Save doctor profile
                                </Button>
                            </div>
                        </form>
                    )}

                    {user.role === "RECEPTION" && (
                        <form onSubmit={handleReceptionSubmit} className="glass rounded-3xl p-6 space-y-6">
                            <div className="flex items-center gap-3 text-lg font-bold">
                                <Hospital className="h-5 w-5 text-primary" /> Reception profile
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="hospitalId">Assigned hospital</Label>
                                <select id="hospitalId" name="hospitalId" defaultValue={user.receptionProfile?.hospitalId ?? ""} className="h-12 w-full rounded-xl border border-border/40 bg-background/50 px-3 text-sm outline-none focus:border-primary/50">
                                    <option value="">Unassigned</option>
                                    {hospitals.map((hospital) => (
                                        <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end">
                                <Button disabled={receptionLoading} className="h-12 px-6 rounded-xl bg-primary text-primary-foreground shadow-glow">
                                    <Check className="h-4 w-4 mr-2" /> Save receptionist profile
                                </Button>
                            </div>
                        </form>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="glass rounded-3xl p-6">
                        <div className="flex items-center gap-3 text-lg font-bold mb-4">
                            <Users2 className="h-5 w-5 text-primary" /> Role-specific summary
                        </div>
                        <div className="space-y-4 text-sm text-muted-foreground">
                            {user.role === "PATIENT" && (
                                <div className="space-y-2">
                                    <div className="font-semibold">Patient information</div>
                                    <div>Gender: {user.patientProfile?.gender || "Not set"}</div>
                                    <div>Blood group: {user.patientProfile?.bloodGroup || "Not set"}</div>
                                    <div>Age: {user.patientProfile?.age ?? "Not set"}</div>
                                    <div>Address: {user.patientProfile?.address || "Not set"}</div>
                                    <div>Emergency contact: {user.patientProfile?.emergencyContact || "Not set"}</div>
                                </div>
                            )}

                            {user.role === "DOCTOR" && (
                                <div className="space-y-2">
                                    <div className="font-semibold">Doctor information</div>
                                    <div>Specialization: {user.doctorProfile?.specialization || "Not set"}</div>
                                    <div>Consultation fee: {user.doctorProfile?.consultationFee != null ? `${user.doctorProfile.consultationFee} BDT` : "Not set"}</div>
                                    <div>License: {user.doctorProfile?.licenseNo || "Not set"}</div>
                                    <div>Departments: {user.doctorProfile?.departments?.length ? user.doctorProfile.departments.map((dept) => dept.name).join(", ") : "Not set"}</div>
                                    <div>Hospitals: {assignedHospitalNames.length ? assignedHospitalNames.join(", ") : "None assigned"}</div>
                                </div>
                            )}

                            {user.role === "RECEPTION" && (
                                <div className="space-y-2">
                                    <div className="font-semibold">Receptionist information</div>
                                    <div>Assigned hospital: {user.receptionProfile?.hospital?.name || "None assigned"}</div>
                                </div>
                            )}

                            {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                                <div className="space-y-2">
                                    <div className="font-semibold">Admin profile</div>
                                    <div>Admins manage users, tickets, and settings.</div>
                                    <div>Role-specific hospital or schedule fields are not applicable.</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
