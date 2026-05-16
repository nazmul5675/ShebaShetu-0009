"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Loader2, Save, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  updateAdminUserBaseProfile,
  updateDoctorProfileByAdmin,
  updatePatientProfileByAdmin,
  updateReceptionistProfileByAdmin,
  createHospitalForDoctorByAdmin,
} from "@/app/actions/admin";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";

type Hospital = {
  id: string;
  name: string;
  address: string;
};

type Department = {
  id: string;
  name: string;
  hospitalId?: string | null;
  hospital?: {
    name: string;
  } | null;
};

type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  patientProfile?: {
    age?: number | null;
    gender?: string | null;
    bloodGroup?: string | null;
    address?: string | null;
    emergencyContact?: string | null;
  } | null;
  doctorProfile?: {
    specialization: string;
    consultationFee?: number | null;
    roomNumber?: string | null;
    departmentIds: string[];
    hospitalIds?: string[];
  } | null;
  receptionProfile?: {
    hospitalId?: string | null;
  } | null;
};

interface AdminUserDetailFormProps {
  user: AdminUser;
  hospitals: Hospital[];
  departments: Department[];
}

function toggleValue(values: string[], value: string, checked: boolean) {
  if (checked) return Array.from(new Set([...values, value]));
  return values.filter((item) => item !== value);
}

export function AdminUserDetailForm({ user, hospitals, departments }: AdminUserDetailFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(user.name || "");
  const [isActive, setIsActive] = useState(user.isActive);
  const [patient, setPatient] = useState({
    age: user.patientProfile?.age ?? "",
    gender: user.patientProfile?.gender || "",
    bloodGroup: user.patientProfile?.bloodGroup || "",
    address: user.patientProfile?.address || "",
    emergencyContact: user.patientProfile?.emergencyContact || "",
  });
  const [doctor, setDoctor] = useState({
    specialization: user.doctorProfile?.specialization || "General Physician",
    consultationFee: user.doctorProfile?.consultationFee ?? "",
    roomNumber: user.doctorProfile?.roomNumber || "",
    departmentIds: user.doctorProfile?.departmentIds || [],
    hospitalIds: user.doctorProfile?.hospitalIds || [],
  });
  const [availableHospitals, setAvailableHospitals] = useState(hospitals);
  const [hospitalFilter, setHospitalFilter] = useState("");
  const [manualHospitalName, setManualHospitalName] = useState("");
  const [reception, setReception] = useState({
    hospitalId: user.receptionProfile?.hospitalId || "",
  });

  const addHospitalByName = () => {
    const typedName = manualHospitalName.trim();
    if (!typedName) {
      toast.error("Enter a hospital name to assign.");
      return;
    }

    const normalized = typedName.toLowerCase();
    const exactMatch = availableHospitals.find((hospital) => hospital.name.toLowerCase() === normalized);
    const partialMatches = availableHospitals.filter((hospital) => hospital.name.toLowerCase().includes(normalized));
    const match = exactMatch || (partialMatches.length === 1 ? partialMatches[0] : null);

    if (match) {
      if (doctor.hospitalIds.includes(match.id)) {
        toast("Hospital is already assigned.");
        return;
      }

      setDoctor((current) => ({
        ...current,
        hospitalIds: [...current.hospitalIds, match.id],
      }));
      setManualHospitalName("");
      toast.success(`${match.name} assigned.`);
      return;
    }

    if (partialMatches.length > 1) {
      const suggestions = partialMatches.slice(0, 3).map((hospital) => hospital.name).join(", ");
      toast.error(`Multiple hospitals match. Try one of: ${suggestions}`);
      return;
    }

    startTransition(async () => {
      const result = await createHospitalForDoctorByAdmin(user.id, typedName);
      if (!result.success) {
        toast.error(result.error || "Failed to create hospital.");
        return;
      }

      setAvailableHospitals((current) => [...current, result.hospital]);
      setDoctor((current) => ({
        ...current,
        hospitalIds: [...current.hospitalIds, result.hospital.id],
      }));
      setManualHospitalName("");
      toast.success(`${result.hospital.name} created and assigned.`);
    });
  };

  const save = () => {
    startTransition(async () => {
      const base = await updateAdminUserBaseProfile(user.id, { name, isActive });
      if (!base.success) {
        toast.error(base.error || "Failed to update user.");
        return;
      }

      let roleResult: { success: boolean; error?: string } = { success: true };

      if (user.role === "PATIENT") {
        roleResult = await updatePatientProfileByAdmin(user.id, {
          age: patient.age === "" ? null : Number(patient.age),
          gender: patient.gender || null,
          bloodGroup: patient.bloodGroup || null,
          address: patient.address || null,
          emergencyContact: patient.emergencyContact || null,
        });
      }

      if (user.role === "DOCTOR") {
        roleResult = await updateDoctorProfileByAdmin(user.id, {
          specialization: doctor.specialization,
          consultationFee: doctor.consultationFee === "" ? null : Number(doctor.consultationFee),
          roomNumber: doctor.roomNumber || null,
          departmentIds: doctor.departmentIds,
          hospitalIds: doctor.hospitalIds,
        });
      }

      if (user.role === "RECEPTION") {
        roleResult = await updateReceptionistProfileByAdmin(user.id, {
          hospitalId: reception.hospitalId || null,
        });
      }

      if (!roleResult.success) {
        toast.error(roleResult.error || "Failed to update role profile.");
        return;
      }

      toast.success("User profile updated.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link href="/admin/users" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 mb-3">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to users
          </Link>
          <div className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/80 mb-1">
            User Management
          </div>
          <h1 className="text-4xl font-black tracking-tight">{user.name || "Unnamed user"}</h1>
          <p className="text-sm text-muted-foreground/80 mt-1">
            Manage base account data and role-dependent workflow assignments.
          </p>
        </div>

        <Button onClick={save} disabled={isPending} className="h-12 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-glow">
          {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <GlassCard>
        <h2 className="font-bold text-lg flex items-center gap-2 mb-5">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Account
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Full Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full h-11 rounded-xl bg-background/50 border border-border/40 px-3 text-sm outline-none focus:border-primary/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Email</label>
            <input
              value={user.email || ""}
              disabled
              className="w-full h-11 rounded-xl bg-secondary/30 border border-border/30 px-3 text-sm text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Role</label>
            <input
              value={user.role.replace("_", " ")}
              disabled
              className="w-full h-11 rounded-xl bg-secondary/30 border border-border/30 px-3 text-sm text-muted-foreground"
            />
          </div>
          <label className="flex items-center gap-3 rounded-xl bg-secondary/30 border border-border/30 px-4 py-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm font-semibold">Active account</span>
          </label>
        </div>
      </GlassCard>

      {user.role === "PATIENT" && (
        <GlassCard>
          <h2 className="font-bold text-lg flex items-center gap-2 mb-5">
            <UserRound className="h-5 w-5 text-primary" />
            Patient Profile
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Age</label>
              <input
                type="number"
                min={0}
                max={130}
                value={patient.age}
                onChange={(event) => setPatient((current) => ({ ...current, age: event.target.value }))}
                className="w-full h-11 rounded-xl bg-background/50 border border-border/40 px-3 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Gender</label>
              <input
                value={patient.gender}
                onChange={(event) => setPatient((current) => ({ ...current, gender: event.target.value }))}
                className="w-full h-11 rounded-xl bg-background/50 border border-border/40 px-3 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Blood Group</label>
              <input
                value={patient.bloodGroup}
                onChange={(event) => setPatient((current) => ({ ...current, bloodGroup: event.target.value }))}
                className="w-full h-11 rounded-xl bg-background/50 border border-border/40 px-3 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Emergency Contact</label>
              <input
                value={patient.emergencyContact}
                onChange={(event) => setPatient((current) => ({ ...current, emergencyContact: event.target.value }))}
                className="w-full h-11 rounded-xl bg-background/50 border border-border/40 px-3 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Address</label>
              <textarea
                value={patient.address}
                onChange={(event) => setPatient((current) => ({ ...current, address: event.target.value }))}
                rows={3}
                className="w-full rounded-xl bg-background/50 border border-border/40 px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none"
              />
            </div>
          </div>
        </GlassCard>
      )}

      {user.role === "DOCTOR" && (
        <GlassCard>
          <h2 className="font-bold text-lg flex items-center gap-2 mb-5">
            <Stethoscope className="h-5 w-5 text-primary" />
            Doctor Assignment
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Specialization</label>
              <input
                value={doctor.specialization}
                onChange={(event) => setDoctor((current) => ({ ...current, specialization: event.target.value }))}
                className="w-full h-11 rounded-xl bg-background/50 border border-border/40 px-3 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Consultation Fee</label>
              <input
                type="number"
                min={0}
                value={doctor.consultationFee}
                onChange={(event) => setDoctor((current) => ({ ...current, consultationFee: event.target.value }))}
                className="w-full h-11 rounded-xl bg-background/50 border border-border/40 px-3 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Room Number</label>
              <input
                value={doctor.roomNumber}
                onChange={(event) => setDoctor((current) => ({ ...current, roomNumber: event.target.value }))}
                placeholder="e.g., 204"
                className="w-full h-11 rounded-xl bg-background/50 border border-border/40 px-3 text-sm outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assigned Departments</div>
              {departments.length > 0 ? (
                departments.map((department) => (
                  <label key={department.id} className="flex gap-3 rounded-xl bg-secondary/30 border border-border/30 p-3">
                    <input
                      type="checkbox"
                      checked={doctor.departmentIds.includes(department.id)}
                      onChange={(event) =>
                        setDoctor((current) => ({
                          ...current,
                          departmentIds: toggleValue(current.departmentIds, department.id, event.target.checked),
                        }))
                      }
                      className="mt-1 h-4 w-4"
                    />
                    <span>
                      <span className="block text-sm font-bold">{department.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {department.hospital?.name || "No hospital linked"}
                      </span>
                    </span>
                  </label>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                  No departments are available.
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-border/40 bg-secondary/30 p-4">
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Hospital assignment</div>
                <p className="text-sm text-muted-foreground">
                  Hospital access is inferred from the selected departments by default. Use the manual hospital assignment list below to give this doctor direct access to additional hospitals.
                </p>
              </div>

              <div className="rounded-3xl border border-border/40 bg-secondary/30 p-4 space-y-4">
                <div>
                  <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Manual Hospital Access</div>
                  <div className="grid gap-3">
                    <input
                      value={hospitalFilter}
                      onChange={(event) => setHospitalFilter(event.target.value)}
                      placeholder="Filter hospitals by name"
                      className="w-full h-11 rounded-xl bg-background/50 border border-border/40 px-3 text-sm outline-none focus:border-primary/50"
                    />
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        value={manualHospitalName}
                        onChange={(event) => setManualHospitalName(event.target.value)}
                        placeholder="Type hospital name or partial name to assign"
                        className="w-full h-11 rounded-xl bg-background/50 border border-border/40 px-3 text-sm outline-none focus:border-primary/50"
                      />
                      <Button
                        type="button"
                        onClick={addHospitalByName}
                        disabled={!manualHospitalName.trim()}
                        className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                      >
                        Add
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enter the hospital name exactly to assign it directly, or select from the list below.
                    </p>
                  </div>
                </div>
                {availableHospitals.length > 0 ? (
                  availableHospitals
                    .filter((hospital) =>
                      hospital.name.toLowerCase().includes(hospitalFilter.trim().toLowerCase())
                    )
                    .map((hospital) => (
                      <label key={hospital.id} className="flex gap-3 rounded-xl bg-background/70 border border-border/30 p-3">
                        <input
                          type="checkbox"
                          checked={doctor.hospitalIds.includes(hospital.id)}
                          onChange={(event) =>
                            setDoctor((current) => ({
                              ...current,
                              hospitalIds: toggleValue(current.hospitalIds, hospital.id, event.target.checked),
                            }))
                          }
                          className="mt-1 h-4 w-4"
                        />
                        <span>
                          <span className="block text-sm font-bold">{hospital.name}</span>
                          <span className="block text-xs text-muted-foreground">{hospital.address}</span>
                        </span>
                      </label>
                    ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                    No hospitals are available.
                  </div>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {user.role === "RECEPTION" && (
        <GlassCard>
          <h2 className="font-bold text-lg flex items-center gap-2 mb-5">
            <Building2 className="h-5 w-5 text-primary" />
            Receptionist Assignment
          </h2>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assigned Hospital</label>
            <select
              value={reception.hospitalId}
              onChange={(event) => setReception({ hospitalId: event.target.value })}
              className="w-full h-11 rounded-xl bg-background/50 border border-border/40 px-3 text-sm outline-none focus:border-primary/50"
            >
              <option value="">No hospital assigned</option>
              {hospitals.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>
                  {hospital.name}
                </option>
              ))}
            </select>
          </div>
        </GlassCard>
      )}

      {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
        <GlassCard>
          <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Administrator Profile
          </h2>
          <p className="text-sm text-muted-foreground">
            Administrator accounts use the base account profile only. Role reassignment is intentionally not exposed here.
          </p>
        </GlassCard>
      )}
    </div>
  );
}
