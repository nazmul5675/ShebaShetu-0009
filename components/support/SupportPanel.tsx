"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { format } from "date-fns";
import { Clock, History, LifeBuoy, Loader2, MessageSquare, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { createSupportTicket, replyToOwnSupportTicket } from "@/app/actions/support";
import { cn } from "@/lib/utils";

type Reply = {
  id: string;
  message: string;
  createdAt: string;
  author: {
    name: string | null;
    role: string;
  };
};

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  replies: Reply[];
};

interface SupportPanelProps {
  tickets: Ticket[];
  activeTicketId?: string;
  variant?: "patient" | "compact";
}

export function SupportPanel({ tickets, activeTicketId, variant = "compact" }: SupportPanelProps) {
  const router = useRouter();
  const [localTickets, setLocalTickets] = useState(tickets);
  const [activeReplyTicketId, setActiveReplyTicketId] = useState<string | null>(activeTicketId || null);
  const [isSubmittingTicket, startTicketSubmit] = useTransition();
  const [replyingTicketId, setReplyingTicketId] = useState<string | null>(null);

  useEffect(() => {
    setLocalTickets(tickets);
  }, [tickets]);

  const sortedTickets = useMemo(() => {
    return [...localTickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [localTickets]);

  const onCreateTicket = (formData: FormData) => {
    const subject = String(formData.get("subject") || "");
    const message = String(formData.get("message") || "");

    startTicketSubmit(async () => {
      const result = await createSupportTicket(subject, message);
      if (result.success) {
        toast.success("Support ticket submitted.");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to submit ticket.");
      }
    });
  };

  const onReply = async (ticketId: string, formData: FormData) => {
    const message = String(formData.get("reply") || "");
    if (!message.trim()) {
      toast.error("Reply message cannot be empty.");
      return;
    }

    setReplyingTicketId(ticketId);
    const result = await replyToOwnSupportTicket(ticketId, message);
    setReplyingTicketId(null);

    if (result.success && result.reply) {
      setLocalTickets((current) =>
        current.map((ticket) =>
          ticket.id === ticketId
            ? {
                ...ticket,
                status: result.status || ticket.status,
                updatedAt: new Date().toISOString(),
                replies: [
                  ...ticket.replies,
                  {
                    id: result.reply.id,
                    message: result.reply.message,
                    createdAt: new Date(result.reply.createdAt).toISOString(),
                    author: result.reply.author ? {
                      name: result.reply.author.name,
                      role: result.reply.author.role,
                    } : { name: "Unknown", role: "USER" },
                  },
                ],
              }
            : ticket
        )
      );
      toast.success("Reply sent.");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to send reply.");
    }
  };

  return (
    <div className={cn("grid gap-8", variant === "patient" ? "lg:grid-cols-3" : "lg:grid-cols-3")}>
      <div className="lg:col-span-1 space-y-6">
        {variant === "patient" && (
          <GlassCard className="bg-primary/5 border-primary/10">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-primary" />
              Support Desk
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Submit appointment, queue, report, or account issues to the ShebaSetu coordination team.
            </p>
          </GlassCard>
        )}

        <GlassCard>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            New Support Ticket
          </h3>
          <form action={onCreateTicket} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                Subject
              </label>
              <input
                name="subject"
                placeholder="Brief summary of issue"
                className="w-full glass rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
                disabled={isSubmittingTicket}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                Detailed Message
              </label>
              <textarea
                name="message"
                rows={4}
                placeholder="Describe your request in detail..."
                className="w-full glass rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                required
                disabled={isSubmittingTicket}
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmittingTicket}
              className="w-full bg-primary text-primary-foreground shadow-glow h-12 font-bold rounded-xl"
            >
              {isSubmittingTicket ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Submit Ticket
            </Button>
          </form>
        </GlassCard>
      </div>

      <div className="lg:col-span-2">
        <GlassCard className="h-full">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Your Tickets
          </h3>

          <div className="space-y-4">
            {sortedTickets.length > 0 ? (
              sortedTickets.map((ticket) => {
                const expanded = activeReplyTicketId === ticket.id || activeTicketId === ticket.id;
                const closed = ticket.status === "CLOSED";

                return (
                  <div
                    key={ticket.id}
                    className={cn(
                      "glass border-border/40 rounded-2xl p-5 flex flex-col gap-4 transition-colors",
                      activeTicketId === ticket.id && "ring-1 ring-primary/50 bg-primary/[0.03]"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveReplyTicketId(expanded ? null : ticket.id)}
                      className="text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black hover:text-primary transition-colors">
                            {ticket.subject}
                          </div>
                          <div className="text-[10px] text-muted-foreground/60 flex items-center gap-1.5 pt-1">
                            <Clock className="h-3 w-3" />
                            Submitted {format(new Date(ticket.createdAt), "PPP")}
                          </div>
                        </div>
                        <div
                          className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                            ticket.status === "OPEN"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : ticket.status === "CLOSED"
                                ? "bg-muted/50 text-muted-foreground"
                                : "bg-primary/10 text-primary"
                          )}
                        >
                          {ticket.status}
                        </div>
                      </div>
                    </button>

                    <p className="text-xs text-muted-foreground leading-relaxed">{ticket.message}</p>

                    {(expanded || ticket.replies.length > 0) && (
                      <div className="space-y-3 border-t border-border/30 pt-4">
                        {ticket.replies.length > 0 ? (
                          ticket.replies.map((reply) => (
                            <div
                              key={reply.id}
                              className={cn(
                                "rounded-xl px-4 py-3 text-sm",
                                reply.author.role === "ADMIN" || reply.author.role === "SUPER_ADMIN"
                                  ? "bg-primary/10 border border-primary/15"
                                  : "bg-secondary/40"
                              )}
                            >
                              <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mb-1">
                                {reply.author.role === "ADMIN" || reply.author.role === "SUPER_ADMIN"
                                  ? "Support Team"
                                  : reply.author.name || "You"}{" "}
                                - {format(new Date(reply.createdAt), "PPp")}
                              </div>
                              <p className="text-xs leading-relaxed">{reply.message}</p>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-muted-foreground">No replies yet.</div>
                        )}

                        {!closed && (
                          <form action={(formData) => onReply(ticket.id, formData)} className="flex gap-2">
                            <input
                              name="reply"
                              placeholder="Add a follow-up reply..."
                              className="min-w-0 flex-1 glass rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                              disabled={replyingTicketId === ticket.id}
                            />
                            <Button type="submit" disabled={replyingTicketId === ticket.id} className="rounded-xl">
                              {replyingTicketId === ticket.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-24 text-center glass rounded-3xl border-dashed border-2 border-border/60 opacity-50">
                <LifeBuoy className="h-12 w-12 mx-auto mb-4" />
                <p className="text-sm font-bold uppercase tracking-tight">No active tickets</p>
                <p className="text-xs mt-1">If you submit a ticket, it will appear here.</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
