import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { GlassCard } from "@/components/GlassCard";
import { LifeBuoy, Send, MessageSquare, History, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupportTicket } from "@/app/actions/settings";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
export default async function PatientSupportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const tickets = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div>
        <div className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/80 mb-1">Help Center</div>
        <h1 className="text-4xl font-black tracking-tight">Support & Assistance</h1>
        <p className="text-sm text-muted-foreground/80 mt-1 max-w-2xl">
          Need help with your appointment? Encountered a technical issue? Our 24/7 coordination desk is here to help you.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="bg-primary/5 border-primary/10">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-primary" />
              Emergency Contact
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-background grid place-items-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Hotline</div>
                  <div className="text-sm font-black">+880 1234 567890</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-background grid place-items-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Email</div>
                  <div className="text-sm font-black">support@shebashetu.com</div>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              New Support Ticket
            </h3>
            <form action={async (formData: FormData) => {
              "use server"
              const subject = formData.get("subject") as string;
              const message = formData.get("message") as string;
              await createSupportTicket(subject, message);
            }} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Subject</label>
                <input
                  name="subject"
                  placeholder="e.g., Booking issue"
                  className="w-full glass rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Detailed Message</label>
                <textarea
                  name="message"
                  rows={4}
                  placeholder="How can we help you today?"
                  className="w-full glass rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-primary text-primary-foreground shadow-glow h-12 font-bold rounded-xl active:scale-[0.98] transition-transform">
                <Send className="h-4 w-4 mr-2" />
                Submit Ticket
              </Button>
            </form>
          </GlassCard>
        </div>

        <div className="lg:col-span-2">
          <GlassCard className="h-full">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Your Recent Tickets
            </h3>

            <div className="space-y-4">
              {tickets.length > 0 ? (
                tickets.map((t) => (
                  <div key={t.id} className="glass border-border/40 rounded-2xl p-5 flex flex-col gap-3 hover:bg-primary/[0.02] transition-colors group">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-black group-hover:text-primary transition-colors">{t.subject}</div>
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                        t.status === "OPEN" ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"
                      )}>
                        {t.status}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{t.message}</p>
                    <div className="text-[10px] text-muted-foreground/60 flex items-center gap-1.5 pt-1">
                      <Clock className="h-3 w-3" /> Submitted {format(new Date(t.createdAt), "PPP")}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-24 text-center glass rounded-3xl border-dashed border-2 border-border/60 opacity-40">
                  <LifeBuoy className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-sm font-bold uppercase tracking-tight">No active tickets</p>
                  <p className="text-xs mt-1">If you submit a ticket, it will appear here.</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
