"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

type SessionUser = {
  id?: string;
  role?: string;
  name?: string | null;
};

const TICKET_STATUSES = new Set(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]);

function getSupportPath(role?: string, ticketId?: string) {
  const query = ticketId ? `?ticketId=${ticketId}` : "";

  switch (role) {
    case "DOCTOR":
      return `/doctor/support${query}`;
    case "RECEPTION":
    case "RECEPTIONIST":
      return `/reception/support${query}`;
    case "ADMIN":
    case "SUPER_ADMIN":
      return `/admin/support${query}`;
    case "PATIENT":
    default:
      return `/patient/support${query}`;
  }
}

async function requireSession() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user?.id) {
    return { error: "Unauthorized" as const };
  }

  return { user };
}

async function requireAdmin() {
  const sessionResult = await requireSession();

  if ("error" in sessionResult) {
    return sessionResult;
  }

  const role = sessionResult.user.role;

  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return { error: "Only administrators can perform this action." as const };
  }

  return sessionResult;
}

function revalidateSupportPaths(ticketId?: string) {
  revalidatePath("/admin/support");
  revalidatePath("/patient/support");
  revalidatePath("/doctor/support");
  revalidatePath("/reception/support");

  if (ticketId) {
    revalidatePath(`/admin/support?ticketId=${ticketId}`);
    revalidatePath(`/patient/support?ticketId=${ticketId}`);
    revalidatePath(`/doctor/support?ticketId=${ticketId}`);
    revalidatePath(`/reception/support?ticketId=${ticketId}`);
  }
}

export async function createSupportTicket(subject: string, message: string) {
  const sessionResult = await requireSession();

  if ("error" in sessionResult) {
    return { success: false, error: sessionResult.error };
  }

  const userId = sessionResult.user.id;

  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const safeSubject = subject.trim();
  const safeMessage = message.trim();

  if (!safeSubject || !safeMessage) {
    return { success: false, error: "Subject and message are required." };
  }

  const recentDuplicate = await prisma.supportTicket.findFirst({
    where: {
      userId,
      subject: safeSubject,
      message: safeMessage,
      createdAt: {
        gte: new Date(Date.now() - 30_000),
      },
    },
  });

  if (recentDuplicate) {
    return {
      success: false,
      error: "This support ticket was already submitted.",
    };
  }

  try {
    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        subject: safeSubject,
        message: safeMessage,
      },
    });

    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: ["ADMIN", "SUPER_ADMIN"],
        },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "NEW_MESSAGE",
          title: "New support ticket",
          message: `${sessionResult.user.name || "A user"} submitted a support ticket.`,
          link: getSupportPath("ADMIN", ticket.id),
        })),
      });
    }

    revalidateSupportPaths(ticket.id);

    return {
      success: true,
      ticketId: ticket.id,
    };
  } catch (error) {
    console.error("[CREATE_SUPPORT_TICKET_ERROR]", error);

    return {
      success: false,
      error: "Failed to submit ticket.",
    };
  }
}

export async function getSupportTicketsForAdmin() {
  const sessionResult = await requireAdmin();

  if ("error" in sessionResult) {
    return [];
  }

  return prisma.supportTicket.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      replies: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  });
}

export async function getUserSupportTickets() {
  const sessionResult = await requireSession();

  if ("error" in sessionResult) {
    return [];
  }

  return prisma.supportTicket.findMany({
    where: {
      userId: sessionResult.user.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      replies: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      },
    },
  });
}

export async function getSupportTicketById(ticketId: string) {
  const sessionResult = await requireSession();

  if ("error" in sessionResult) {
    return null;
  }

  const isAdmin =
    sessionResult.user.role === "ADMIN" ||
    sessionResult.user.role === "SUPER_ADMIN";

  return prisma.supportTicket.findFirst({
    where: {
      id: ticketId,
      ...(isAdmin ? {} : { userId: sessionResult.user.id }),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      replies: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  });
}

export async function replyToSupportTicket(ticketId: string, message: string) {
  const sessionResult = await requireAdmin();

  if ("error" in sessionResult) {
    return { success: false, error: sessionResult.error };
  }

  const adminUserId = sessionResult.user.id;

  if (!adminUserId) {
    return { success: false, error: "Unauthorized" };
  }

  const safeMessage = message.trim();

  if (!safeMessage) {
    return {
      success: false,
      error: "Reply message cannot be empty.",
    };
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: {
      id: ticketId,
    },
    include: {
      user: {
        select: {
          id: true,
          role: true,
        },
      },
    },
  });

  if (!ticket) {
    return {
      success: false,
      error: "Support ticket not found.",
    };
  }

  const duplicate = await prisma.supportTicketReply.findFirst({
    where: {
      ticketId,
      authorId: adminUserId,
      message: safeMessage,
      createdAt: {
        gte: new Date(Date.now() - 10_000),
      },
    },
  });

  if (duplicate) {
    return {
      success: false,
      error: "This reply was already sent.",
    };
  }

  try {
    const reply = await prisma.$transaction(async (tx) => {
      const createdReply = await tx.supportTicketReply.create({
        data: {
          ticketId,
          authorId: adminUserId,
          message: safeMessage,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      await tx.supportTicket.update({
        where: {
          id: ticketId,
        },
        data: {
          status: ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status,
        },
      });

      await tx.notification.create({
        data: {
          userId: ticket.userId,
          type: "NEW_MESSAGE",
          title: "Support replied to your ticket",
          message: "Support replied to your ticket.",
          link: getSupportPath(ticket.user.role, ticketId),
        },
      });

      return createdReply;
    });

    const nextStatus = ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status;

    revalidateSupportPaths(ticketId);

    return {
      success: true,
      reply: {
        id: reply.id,
        message: reply.message,
        createdAt: reply.createdAt.toISOString(),
        author: reply.author,
      },
      status: nextStatus,
    };
  } catch (error) {
    console.error("[SUPPORT_REPLY_ERROR]", error);

    return {
      success: false,
      error: "Failed to send support reply.",
    };
  }
}

export async function replyToOwnSupportTicket(ticketId: string, message: string) {
  const sessionResult = await requireSession();

  if ("error" in sessionResult) {
    return { success: false, error: sessionResult.error };
  }

  const userId = sessionResult.user.id;

  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const safeMessage = message.trim();

  if (!safeMessage) {
    return {
      success: false,
      error: "Reply message cannot be empty.",
    };
  }

  const ticket = await prisma.supportTicket.findFirst({
    where: {
      id: ticketId,
      userId,
    },
  });

  if (!ticket) {
    return {
      success: false,
      error: "Support ticket not found.",
    };
  }

  if (ticket.status === "CLOSED") {
    return {
      success: false,
      error: "Closed tickets cannot receive new replies.",
    };
  }

  const duplicate = await prisma.supportTicketReply.findFirst({
    where: {
      ticketId,
      authorId: userId,
      message: safeMessage,
      createdAt: {
        gte: new Date(Date.now() - 10_000),
      },
    },
  });

  if (duplicate) {
    return {
      success: false,
      error: "This reply was already sent.",
    };
  }

  try {
    const reply = await prisma.$transaction(async (tx) => {
      const createdReply = await tx.supportTicketReply.create({
        data: {
          ticketId,
          authorId: userId,
          message: safeMessage,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });

      await tx.supportTicket.update({
        where: {
          id: ticketId,
        },
        data: {
          status: "OPEN",
        },
      });

      const admins = await tx.user.findMany({
        where: {
          role: {
            in: ["ADMIN", "SUPER_ADMIN"],
          },
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: "NEW_MESSAGE",
            title: "New support reply",
            message: `${sessionResult.user.name || "A user"} replied to a support ticket.`,
            link: getSupportPath("ADMIN", ticketId),
          })),
        });
      }

      return createdReply;
    });

    revalidateSupportPaths(ticketId);

    return {
      success: true,
      reply: {
        id: reply.id,
        message: reply.message,
        createdAt: reply.createdAt.toISOString(),
        author: reply.author,
      },
      status: "OPEN",
    };
  } catch (error) {
    console.error("[USER_SUPPORT_REPLY_ERROR]", error);

    return {
      success: false,
      error: "Failed to send support reply.",
    };
  }
}

export async function updateSupportTicketStatus(ticketId: string, status: string) {
  const sessionResult = await requireAdmin();

  if ("error" in sessionResult) {
    return { success: false, error: sessionResult.error };
  }

  if (!TICKET_STATUSES.has(status)) {
    return {
      success: false,
      error: "Unsupported ticket status.",
    };
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: {
      id: ticketId,
    },
    include: {
      user: {
        select: {
          role: true,
        },
      },
    },
  });

  if (!ticket) {
    return {
      success: false,
      error: "Support ticket not found.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.supportTicket.update({
        where: {
          id: ticketId,
        },
        data: {
          status,
        },
      });

      if (status === "RESOLVED" || status === "CLOSED") {
        await tx.notification.create({
          data: {
            userId: ticket.userId,
            type: "NEW_MESSAGE",
            title: "Support ticket updated",
            message: `Your support ticket was marked ${status.toLowerCase()}.`,
            link: getSupportPath(ticket.user.role, ticketId),
          },
        });
      }
    });

    revalidateSupportPaths(ticketId);

    return {
      success: true,
      status,
    };
  } catch (error) {
    console.error("[SUPPORT_STATUS_ERROR]", error);

    return {
      success: false,
      error: "Failed to update support ticket status.",
    };
  }
}