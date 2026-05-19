"use client"

import { useState, useTransition } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Clock, ShieldCheck, ArrowRight, CheckCircle2
} from "lucide-react";
import { bookAppointment } from "@/app/actions/appointments";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface BookingFormProps {
  departments: DepartmentOption[];
  initialDept?: string;
}

type ScheduleSlotOption = {
  id: string;
  startTime: string;
  endTime: string;
  hospitalId: string;
  hospital: {
    id: string;
    name: string;
    address?: string | null;
  };
};

type DoctorOption = {
  id: string;
  specialization: string;
  consultationFee?: number | null;
  roomNumber?: string | null;
  user: {
    name: string | null;
    image?: string | null;
  };
  hospitals: Array<{
    id: string;
    name: string;
  }>;
  schedules: ScheduleSlotOption[];
};

type DepartmentOption = {
  id: string;
  name: string;
  description?: string | null;
  hospital?: {
    id: string;
    name: string;
  } | null;
  doctors: DoctorOption[];
};

export function BookingForm({ departments, initialDept }: BookingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedDeptId, setSelectedDeptId] = useState(departments.find(d => d.name === initialDept)?.id || "");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [symptoms, setSymptoms] = useState("");

  const selectedDept = departments.find(d => d.id === selectedDeptId);
  const doctors = selectedDept?.doctors || [];
  const selectedDoctor = doctors.find((doctor) => doctor.id === selectedDocId);
  const availableSlots = selectedDoctor?.schedules || [];
  const selectedSlot = availableSlots.find((slot) => slot.id === selectedSlotId);
  const hasDepartments = departments.length > 0;

  const slotLabel = (slot: ScheduleSlotOption) => {
    const start = new Date(slot.startTime);
    const end = new Date(slot.endTime);
    return `${start.toLocaleDateString([], { month: "short", day: "numeric" })}, ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId || !selectedSlotId) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const formData = new FormData();
    formData.append("doctorId", selectedDocId);
    formData.append("departmentId", selectedDeptId);
    formData.append("scheduleSlotId", selectedSlotId);
    formData.append("symptoms", symptoms);

    startTransition(async () => {
      const result = await bookAppointment(formData);
      if (result.success) {
        toast.success("Appointment booked successfully!");
        router.push("/patient/appointments");
      } else {
        toast.error(result.error || "Booking failed.");
      }
    });
  };

  return (
    <form onSubmit={handleBooking} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Specialization</Label>
            <Select value={selectedDeptId} onValueChange={(val) => { setSelectedDeptId(val); setSelectedDocId(""); setSelectedSlotId(""); }} disabled={!hasDepartments}>
              <SelectTrigger className="h-12 glass rounded-xl border-border/40 focus:ring-primary/20">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent className="glass-strong border-border/40">
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!hasDepartments && (
              <p className="text-xs text-muted-foreground">No departments available.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Doctor</Label>
            <Select value={selectedDocId} onValueChange={(value) => { setSelectedDocId(value); setSelectedSlotId(""); }} disabled={!selectedDeptId || doctors.length === 0}>
              <SelectTrigger className="h-12 glass rounded-xl border-border/40 focus:ring-primary/20">
                <SelectValue placeholder={selectedDeptId ? "Select Doctor" : "Choose department first"} />
              </SelectTrigger>
              <SelectContent className="glass-strong border-border/40">
                {doctors.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.user.name} ({doc.specialization || "General"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDeptId && doctors.length === 0 && (
              <p className="text-xs text-muted-foreground">No doctors found for selected department.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Available Slot</Label>
            <Select value={selectedSlotId} onValueChange={setSelectedSlotId} disabled={!selectedDocId || availableSlots.length === 0}>
              <SelectTrigger className="h-12 glass rounded-xl border-border/40 focus:ring-primary/20">
                <SelectValue placeholder={selectedDocId ? "Select available slot" : "Choose doctor first"} />
              </SelectTrigger>
              <SelectContent className="glass-strong border-border/40">
                {availableSlots.map((slot) => (
                  <SelectItem key={slot.id} value={slot.id}>
                    {slotLabel(slot)} - {slot.hospital.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDocId && availableSlots.length === 0 && (
              <p className="text-xs text-muted-foreground">No slots available.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Symptoms / Notes</Label>
            <Textarea
              className="min-h-[148px] glass rounded-xl border-border/40 focus:ring-primary/20 resize-none p-4"
              placeholder="e.g., Mild fever since morning, persistent headache..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
            />
          </div>

          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Appointment Details
            </div>
            {selectedDoctor ? (
              <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1">
                <p>Dr. {selectedDoctor.user.name || "Assigned doctor"} - {selectedDoctor.specialization}</p>
                <p>Fee: {selectedDoctor.consultationFee ? `BDT ${selectedDoctor.consultationFee}` : "Not configured"}</p>
                <p>Room: {selectedDoctor.roomNumber || "Not assigned"}</p>
                <p>Hospital: {selectedSlot?.hospital.name || selectedDoctor.hospitals[0]?.name || "Select a slot"}</p>
                <p>Department: {selectedDept?.name || "Not available"}</p>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Select a department, doctor, and available schedule slot to book.
              </p>
            )}
          </div>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-primary text-primary-foreground h-14 text-md font-bold rounded-2xl shadow-glow hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50"
        disabled={isPending || !selectedDocId || !selectedSlotId}
      >
        {isPending ? "Processing your booking..." : "Confirm & Book Visit"}
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>

      <div className="flex items-center justify-center gap-6 pt-4 border-t border-border/20">
        {[
          { icon: CheckCircle2, text: "Verified Doctors" },
          { icon: ShieldCheck, text: "Secure Booking" },
          { icon: Clock, text: "Live Queue Tracking" }
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter text-muted-foreground/60">
            <item.icon className="h-3.5 w-3.5" /> {item.text}
          </div>
        ))}
      </div>
    </form>
  );
}
