"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  Clock,
  History,
  LifeBuoy,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { replyToSupportTicket, updateSupportTicketStatus } from "@/app/actions/support";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

type Reply = {
  id: string;
  message: string;
  createdAt: string;
  author?: {
    id: string;
    name: string | null;
    email?: string | null;
    role: string;
  } | null;
};

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  };
  replies: Reply[];
};

interface AdminSupportPanelProps {
  tickets: Ticket[];
  activeTicketId?: string;
}

export function AdminSupportPanel({ tickets, activeTicketId }: AdminSupportPanelProps) {
  const router = useRouter();
  const [localTickets, setLocalTickets] = useState(tickets);
  const [selectedTicketId, setSelectedTicketId] = useState(activeTicketId || tickets[0]?.id || "");
  const [replying, startReply] = useTransition();
  const [updatingStatus, startStatusUpdate] = useTransition();

  const sortedTickets = useMemo(() => {
    return [...localTickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [localTickets]);

  const selectedTicket = sortedTickets.find((ticket) => ticket.id === selectedTicketId) || sortedTickets[0];

  const openTickets = localTickets.filter((ticket) => ticket.status !== "CLOSED").length;
  const highPriority = localTickets.filter((ticket) => ticket.priority === "URGENT" || ticket.priority === "HIGH").length;

  const handleReply = (formData: FormData) => {
    if (!selectedTicket) return;

    const message = String(formData.get("reply") || "");
    if (!message.trim()) {
      toast.error("Reply message cannot be empty.");
      return;
    }

    startReply(async () => {
      const result = await replyToSupportTicket(selectedTicket.id, message);
      if (result.success && result.reply) {
        setLocalTickets((current) =>
          current.map((ticket) =>
            ticket.id === selectedTicket.id
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
                    author: {
                      id: result.reply.author.id,
                      name: result.reply.author.name,
                      email: result.reply.author.email,
                      role: result.reply.author.role,
                    },
                  },
                ],
              }
              : ticket
          )
        );
        toast.success("Reply sent and user notified.");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to send reply.");
      }
    });
  };

  const handleStatusUpdate = (status: string) => {
    if (!selectedTicket) return;

    startStatusUpdate(async () => {
      const result = await updateSupportTicketStatus(selectedTicket.id, status);
      if (result.success) {
        setLocalTickets((current) =>
          current.map((ticket) =>
            ticket.id === selectedTicket.id
              ? { ...ticket, status: result.status || status, updatedAt: new Date().toISOString() }
              : ticket
          )
        );
        toast.success("Ticket status updated.");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update status.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-5 flex items-center gap-4">
          <LifeBuoy className="h-6 w-6 text-primary" />
          <div>
            <div className="text-2xl font-black">{localTickets.length}</div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Total Tickets</div>
          </div>
        </GlassCard>
        <GlassCard className="p-5 flex items-center gap-4">
          <MessageSquare className="h-6 w-6 text-amber-500" />
          <div>
            <div className="text-2xl font-black">{openTickets}</div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Open</div>
          </div>
        </GlassCard>
        <GlassCard className="p-5 flex items-center gap-4">
          <ShieldCheck className="h-6 w-6 text-destructive" />
          <div>
            <div className="text-2xl font-black">{highPriority}</div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">High Priority</div>
          </div>
        </GlassCard>
      </div>

      <div className="grid lg:grid-cols-[22rem_1fr] gap-6">
        <GlassCard className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40">
            <h2 className="font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Tickets
            </h2>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-3 space-y-2">
            {sortedTickets.length > 0 ? (
              sortedTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={cn(
                    "w-full rounded-2xl p-4 text-left transition-colors",
                    selectedTicket?.id === ticket.id ? "bg-primary/10 ring-1 ring-primary/30" : "glass hover:bg-primary/[0.04]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black truncate">{ticket.subject}</div>
                      <div className="text-[10px] text-muted-foreground mt-1 truncate">
                        {ticket.user.name || "Unnamed user"} - {ticket.user.role.replace("_", " ")}
                      </div>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase text-primary">
                      {ticket.status}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="py-16 text-center text-muted-foreground">
                <LifeBuoy className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-semibold">No support tickets found.</p>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          {selectedTicket ? (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">{selectedTicket.subject}</h2>
                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-2">
                    <span>{selectedTicket.user.name || "Unnamed user"}</span>
                    <span>{selectedTicket.user.role.replace("_", " ")}</span>
                    {selectedTicket.user.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {selectedTicket.user.email}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(selectedTicket.createdAt), "PPp")}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedTicket.status}
                    onChange={(event) => handleStatusUpdate(event.target.value)}
                    disabled={updatingStatus}
                    className="h-10 rounded-xl bg-background/50 border border-border/40 px-3 text-xs font-bold outline-none focus:border-primary/50"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                  <span className="h-10 rounded-xl bg-secondary/60 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center">
                    {selectedTicket.priority}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-secondary/30 p-4">
                <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-2">
                  Original message
                </div>
                <p className="text-sm leading-relaxed">{selectedTicket.message}</p>
              </div>

              <div className="space-y-3">
                <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                  Conversation
                </div>
                {selectedTicket.replies.length > 0 ? (
                  selectedTicket.replies.map((reply) => {
                    const authorRole = reply.author?.role || "PATIENT";
                    const authorLabel = authorRole === "ADMIN" || authorRole === "SUPER_ADMIN" ? "Admin" : reply.author?.name || "User";

                    return (
                      <div
                        key={reply.id}
                        className={cn(
                          "rounded-2xl p-4",
                          authorRole === "ADMIN" || authorRole === "SUPER_ADMIN"
                            ? "bg-primary/10 border border-primary/15"
                            : "bg-secondary/40"
                        )}
                      >
                        <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">
                          {authorLabel} - {format(new Date(reply.createdAt), "PPp")}
                        </div>
                        <p className="text-sm leading-relaxed">{reply.message}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                    No replies yet.
                  </div>
                )}
              </div>

              <form action={handleReply} className="space-y-3 border-t border-border/30 pt-5">
                <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                  Reply to user
                </label>
                <textarea
                  name="reply"
                  rows={4}
                  placeholder="Write a clear support response..."
                  className="w-full glass rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  disabled={replying || selectedTicket.status === "CLOSED"}
                  required
                />
                <Button
                  type="submit"
                  disabled={replying || selectedTicket.status === "CLOSED"}
                  className="bg-primary text-primary-foreground rounded-xl"
                >
                  {replying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Send Reply
                </Button>
                {selectedTicket.status === "CLOSED" && (
                  <p className="text-xs text-muted-foreground">Closed tickets cannot receive new replies.</p>
                )}
              </form>
            </div>
          ) : (
            <div className="py-20 text-center text-muted-foreground">
              <LifeBuoy className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold">Select a ticket to view details.</p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
