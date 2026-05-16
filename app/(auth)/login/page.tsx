"use client"

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  UserRound, ClipboardList, Stethoscope, ArrowRight, Mail, Lock,
  Sparkles, ShieldCheck, Activity, Eye, EyeOff, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Role = "PATIENT" | "RECEPTION" | "DOCTOR" | "ADMIN";

const ROLES: { id: Role; label: string; sub: string; icon: LucideIcon; tint: string }[] = [
  { id: "PATIENT", label: "Patient", sub: "Book, queue & track visits", icon: UserRound, tint: "from-emerald-500/20 to-emerald-500/5" },
  { id: "RECEPTION", label: "Reception", sub: "Manage queues & schedules", icon: ClipboardList, tint: "from-orange-400/20 to-orange-400/5" },
  { id: "DOCTOR", label: "Doctor", sub: "See patients & reports", icon: Stethoscope, tint: "from-sky-400/20 to-sky-400/5" },
  { id: "ADMIN", label: "Admin", sub: "Users, tickets & settings", icon: ShieldCheck, tint: "from-violet-400/20 to-violet-400/5" },
];

export default function LoginPage() {
  const [selected, setSelected] = useState<Role>("PATIENT");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [forgot, setForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append("role", selected); // Ensure role is sent

    try {
      if (mode === "register") {
        if (selected === "ADMIN") {
          toast.error("Admin accounts must be created by an existing administrator.");
          setLoading(false);
          return;
        }

        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (password !== confirmPassword) {
          toast.error("Passwords do not match.");
          setLoading(false);
          return;
        }

        const { register } = await import("@/app/actions/auth");
        const result = await register(formData);

        if (!result.success) {
          toast.error(result.error || "Registration failed");
          setLoading(false);
          return;
        }

        toast.success("Account created! Signing you in...");
      }

      // Both login and post-register sign-in
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/",
      });

      if (result?.error) {
        toast.error("Authentication failed. Please check your credentials.");
      } else {
        toast.success(mode === "login" ? "Welcome back!" : "Account ready!");
        router.push("/");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2">
      {/* left — brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden border-r border-border/60">
        <div className="absolute inset-0 -z-10 bg-gradient-page" />
        <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 w-[26rem] h-[26rem] rounded-full bg-sky-500/15 blur-[120px]" />

        <Logo />

        <div className="space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-[11px] font-medium">
            <span className="live-dot" />
            Live in 12 hospitals across Dhaka & Chattogram
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold leading-[1.05] tracking-tight">
            Skip the chaos.<br />
            <span className="text-gradient-emerald">Walk in calm.</span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            ShebaSetu uses AI to guide you to the right department, gives you a digital
            token, and shows your live position — so you only arrive when it's your turn.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: Sparkles, label: "AI Guidance" },
              { icon: Activity, label: "Live Queue" },
              { icon: ShieldCheck, label: "Private & secure" },
            ].map(({ icon: I, label }) => (
              <div key={label} className="glass rounded-xl p-3 text-center">
                <I className="h-4 w-4 mx-auto text-primary mb-1.5" />
                <div className="text-[11px] font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} ShebaSetu · Made for Bangladesh's outpatient care
        </div>
      </div>

      {/* right — auth */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex justify-center">
            <Logo />
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Choose your role to continue.
            </p>
          </div>

          {/* Role cards */}
          <div className={cn("grid gap-2.5", mode === "login" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
            {(mode === "login" ? ROLES : ROLES.filter((r) => r.id !== "ADMIN")).map((r) => {
              const I = r.icon;
              const active = selected === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelected(r.id)}
                  className={cn(
                    "relative rounded-2xl p-3 text-left transition-all overflow-hidden",
                    "glass glass-hover",
                    active && "ring-1 ring-primary/60 shadow-glow"
                  )}
                >
                  <div className={cn("absolute inset-0 -z-10 bg-gradient-to-br opacity-60", r.tint)} />
                  <I className={cn("h-5 w-5 mb-2", active ? "text-primary" : "text-muted-foreground")} />
                  <div className="text-sm font-semibold">{r.label}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{r.sub}</div>
                  {active && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary shadow-glow" />}
                </button>
              );
            })}
          </div>

          <GlassCard variant="strong">
            <form onSubmit={handleAuth} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" name="name" placeholder="Enter your full name" required />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email or phone</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" name="email" className="pl-9" placeholder="you@example.com" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "login" && (
                    <button type="button" onClick={() => setForgot(true)} className="text-[11px] text-primary hover:underline">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    className="pr-11 pl-9"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      className="pr-11 pl-9"
                      placeholder="Repeat your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full bg-gradient-emerald text-primary-foreground font-semibold hover:opacity-95 shadow-glow"
                disabled={loading}
              >
                {loading ? "Processing..." : (mode === "login" ? "Sign in" : "Create account")}
                {!loading && <ArrowRight className="ml-1 h-4 w-4" />}
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                {mode === "login" ? "New to ShebaSetu?" : "Already have an account?"}{" "}
                <button type="button" className="text-primary font-medium hover:underline"
                  onClick={() => {
                    const nextMode = mode === "login" ? "register" : "login";
                    if (nextMode === "register" && selected === "ADMIN") {
                      setSelected("PATIENT");
                    }
                    setMode(nextMode);
                  }}>
                  {mode === "login" ? "Create an account" : "Sign in"}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      </div>

      {/* Forgot password modal */}
      <Dialog open={forgot} onOpenChange={setForgot}>
        <DialogContent className="glass-strong border-border/60 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Enter the email or phone tied to your ShebaSetu account. We'll send a 6-digit OTP.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="reset">Email or phone</Label>
              <Input id="reset" placeholder="you@example.com" />
            </div>
            <Button className="w-full bg-gradient-emerald text-primary-foreground shadow-glow" onClick={() => setForgot(false)}>
              Send reset code
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Didn't receive it? Check spam or try after 60 seconds.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
