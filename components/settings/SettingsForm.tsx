"use client"

import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Shield, Bell, Loader2, Camera, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateProfile, updatePreferences, updatePassword } from "@/app/actions/settings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface SettingsFormProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
    role?: string;
    patientProfile?: unknown;
    doctorProfile?: {
      specialization: string;
      consultationFee: number | null;
    } | null;
    receptionProfile?: {
      hospital?: {
        name: string;
        address: string;
        phone?: string | null;
      } | null;
    } | null;
  };
  preferences: {
    emailAlerts: boolean;
    queueUpdates: boolean;
  };
}

export function SettingsForm({ user, preferences }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState(preferences);
  const [passwordModal, setPasswordModal] = useState(false);
  const profileLabel =
    user.role === "ADMIN"
      ? "Admin"
      : user.role === "SUPER_ADMIN"
        ? "Super Admin"
        : user.doctorProfile
          ? "Doctor"
          : user.receptionProfile
            ? "Receptionist"
            : user.patientProfile
              ? "Patient"
              : "User";

  const handlePreferenceToggle = async (key: "emailAlerts" | "queueUpdates") => {
    const nextValue = !prefs[key];
    setPrefs({ ...prefs, [key]: nextValue });
    
    const res = await updatePreferences({ [key]: nextValue });
    if (!res.success) {
      toast.error(res.error);
      setPrefs({ ...prefs, [key]: !nextValue }); // Rollback
    } else {
      toast.success("Preference updated");
    }
  };

  const onProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const file = (e.currentTarget.elements.namedItem("avatar") as HTMLInputElement).files?.[0];
    let image = user.image ?? undefined;

    if (file) {
      image = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    const res = await updateProfile({
      name: formData.get("name") as string,
      image: image,
      ...(user.doctorProfile
        ? {
            specialization: formData.get("specialization") as string,
            consultationFee: Number(formData.get("consultationFee")),
          }
        : {}),
    });
    setLoading(false);
    if (res.success) toast.success("Profile updated");
    else toast.error(res.error);
  };

  return (
    <div className="grid gap-8">
      <GlassCard className="overflow-hidden border-border/40">
        <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border-b border-border/20" />
        <form onSubmit={onProfileSubmit} className="p-8 -mt-12 space-y-8">
          <div className="flex flex-col sm:flex-row items-end gap-6">
            <div className="relative group">
              <label className="cursor-pointer">
                <input type="file" name="avatar" accept="image/*" className="hidden" />
                <div className="h-32 w-32 rounded-[2rem] bg-secondary flex items-center justify-center text-4xl font-bold overflow-hidden border-4 border-background shadow-2xl group-hover:border-primary/40 transition-all duration-500 group-hover:scale-105">
                  {user.image ? <img src={user.image} alt="Avatar" className="h-full w-full object-cover" /> : user.name?.[0]}
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 grid place-items-center rounded-[2rem] text-white">
                  <Camera className="h-8 w-8" />
                  <span className="text-[10px] font-bold uppercase mt-1">Change</span>
                </div>
              </label>
            </div>
            <div className="flex-1 pb-2">
              <div className="text-2xl font-black tracking-tight">{user.name || "Unnamed user"}</div>
              <div className="text-sm text-muted-foreground font-medium">{user.email || "No email available"}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest px-2 py-0.5">
                  {profileLabel} Profile
                </Badge>
              </div>
            </div>
          </div>
          
          {user.role === "RECEPTION" && (
            user.receptionProfile?.hospital ? (
              <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4">
                <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">
                  Assigned Hospital
                </div>
                <div className="text-sm font-bold">{user.receptionProfile.hospital.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {user.receptionProfile.hospital.address}
                  {user.receptionProfile.hospital.phone ? ` - ${user.receptionProfile.hospital.phone}` : ""}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <div className="text-[10px] font-black text-destructive uppercase tracking-widest mb-1">
                    No Hospital Assigned
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You currently have no hospital assigned. Please contact your system administrator to assign a hospital so you can manage patient queues.
                  </p>
                </div>
              </div>
            )
          )}

          <div className="grid sm:grid-cols-2 gap-6">
             <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Full Name</Label>
                <Input name="name" className="h-12 rounded-xl bg-background/50 border-border/40 focus:ring-primary/20 focus:border-primary/40 transition-all" defaultValue={user.name || ""} required />
             </div>
             <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Email Address</Label>
                <Input className="h-12 rounded-xl bg-secondary/30 border-border/20 opacity-60 cursor-not-allowed" defaultValue={user.email || ""} disabled />
             </div>
             {user.doctorProfile && (
               <>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Specialization</Label>
                    <Input name="specialization" className="h-12 rounded-xl bg-background/50 border-border/40" defaultValue={user.doctorProfile.specialization} required />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Consultation Fee (BDT)</Label>
                    <Input name="consultationFee" type="number" min="0" className="h-12 rounded-xl bg-background/50 border-border/40" defaultValue={user.doctorProfile.consultationFee || 0} required />
                 </div>
               </>
             )}
          </div>
          
          <div className="flex justify-end pt-4">
            <Button disabled={loading} className="h-12 px-8 rounded-xl bg-primary text-primary-foreground shadow-glow font-bold transition-all active:scale-95">
              {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Check className="h-5 w-5 mr-2" />}
              Save Changes
            </Button>
          </div>
        </form>
      </GlassCard>

      <div className="grid sm:grid-cols-2 gap-6">
        <GlassCard>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Security
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 glass rounded-xl">
              <div>
                <div className="text-sm font-semibold">Two-Factor Auth</div>
                <div className="text-[10px] text-muted-foreground">Extra layer of security</div>
              </div>
              <button className="h-6 w-11 rounded-full bg-sidebar-accent relative opacity-50 cursor-not-allowed">
                 <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-muted-foreground" />
              </button>
            </div>

            <Dialog open={passwordModal} onOpenChange={setPasswordModal}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start glass text-xs h-10">Update Password</Button>
              </DialogTrigger>
              <DialogContent className="glass-strong border-border/60">
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const current = formData.get("current") as string;
                    const next = formData.get("next") as string;
                    const confirm = formData.get("confirm") as string;

                    if (next !== confirm) {
                      toast.error("Passwords do not match");
                      return;
                    }

                    setLoading(true);
                    const res = await updatePassword(current, next);
                    setLoading(false);

                    if (res.success) {
                      toast.success("Password updated successfully");
                      setPasswordModal(false);
                      (e.target as HTMLFormElement).reset();
                    } else {
                      toast.error(res.error || "Failed to update password");
                    }
                  }}
                  className="space-y-4 pt-4"
                >
                  <DialogHeader>
                    <DialogTitle>Update Password</DialogTitle>
                    <DialogDescription>
                      Ensure your account is using a long, random password to stay secure.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold tracking-widest ml-1">Current Password</Label>
                      <Input name="current" type="password" required className="bg-background/50" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold tracking-widest ml-1">New Password</Label>
                      <Input name="next" type="password" required className="bg-background/50" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold tracking-widest ml-1">Confirm New Password</Label>
                      <Input name="confirm" type="password" required className="bg-background/50" />
                    </div>
                  </div>

                  <DialogFooter className="pt-4">
                    <Button type="button" variant="ghost" onClick={() => setPasswordModal(false)} disabled={loading}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground shadow-glow font-bold">
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Update Password
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </GlassCard>
        
        <GlassCard>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Notifications
          </h3>
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Email Alerts</span>
                  <p className="text-[10px] text-muted-foreground">Receive appointment summaries</p>
                </div>
                <button 
                  onClick={() => handlePreferenceToggle("emailAlerts")}
                  className={cn(
                    "h-5 w-10 rounded-full transition-colors relative",
                    prefs.emailAlerts ? "bg-primary" : "bg-sidebar-accent"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 h-3 w-3 rounded-full bg-white transition-all",
                    prefs.emailAlerts ? "right-1" : "left-1"
                  )} />
                </button>
             </div>
             <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Queue Updates</span>
                  <p className="text-[10px] text-muted-foreground">Live movement notifications</p>
                </div>
                <button 
                  onClick={() => handlePreferenceToggle("queueUpdates")}
                  className={cn(
                    "h-5 w-10 rounded-full transition-colors relative",
                    prefs.queueUpdates ? "bg-primary" : "bg-sidebar-accent"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 h-3 w-3 rounded-full bg-white transition-all",
                    prefs.queueUpdates ? "right-1" : "left-1"
                  )} />
                </button>
             </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
