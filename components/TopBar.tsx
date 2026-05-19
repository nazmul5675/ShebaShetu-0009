"use client";

import { Bell, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";

import { Logo } from "./Logo";
import { RoleBadge } from "./RoleBadge";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopBarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

type Role = "PATIENT" | "RECEPTION" | "DOCTOR" | "ADMIN" | "SUPER_ADMIN";
type NotificationItem = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string | Date;
};

function getRoleBasePath(role?: string) {
  switch (role) {
    case "PATIENT":
      return "/patient";
    case "DOCTOR":
      return "/doctor";
    case "RECEPTION":
    case "RECEPTIONIST":
      return "/reception";
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin";
    default:
      return "/";
  }
}

export function TopBar({ user }: TopBarProps) {
  const router = useRouter();
  const { notifications, unreadCount, markReadAsync } = useNotifications();

  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "US";

  const roleBasePath = getRoleBasePath(user.role);

  return (
    <header className="sticky top-0 z-30 glass border-b border-border/60 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <div className="lg:hidden">
          <Logo />
        </div>

        {/* Search — desktop only */}
        <form
          className="hidden md:flex flex-1 max-w-md ml-2"
          onSubmit={(e) => {
            e.preventDefault();

            const q = new FormData(e.currentTarget).get("q");

            if (q) {
              window.dispatchEvent(
                new CustomEvent("app-search", { detail: q })
              );
            }
          }}
        >
          <div className="glass flex items-center gap-2 w-full rounded-full px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />

            <input
              name="q"
              placeholder="Search doctors, departments, tokens…"
              className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted-foreground"
            />

            <kbd className="hidden lg:inline text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
              ⌘K
            </kbd>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <RoleBadge role={user.role as Role | undefined} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative glass glass-hover h-9 w-9 grid place-items-center rounded-full">
                <Bell className="h-4 w-4" />

                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 grid place-items-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="glass-strong w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>

                {unreadCount > 0 && (
                  <span className="text-[10px] text-primary">
                    {unreadCount} unread
                  </span>
                )}
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? (
                   notifications.map((n: NotificationItem) => (
                    <DropdownMenuItem
                      key={n.id}
                      className={cn(
                        "flex flex-col items-start gap-1.5 p-3 cursor-pointer rounded-lg transition-colors",
                        !n.isRead ? "bg-primary/10 border-l-2 border-primary pl-2.5" : "hover:bg-muted"
                      )}
                      onClick={async () => {
                        await markReadAsync(n.id);
                        if (n.link) {
                          router.push(n.link);
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5 w-full">
                        {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary" />}
                        <div className="text-xs font-bold">{n.title}</div>
                      </div>

                      <div className="text-[11px] text-foreground/90 font-medium line-clamp-2 leading-relaxed">
                        {n.message}
                      </div>

                      <div className="text-[9px] text-muted-foreground/60">
                        {formatDistanceToNow(new Date(n.createdAt))} ago
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No notifications yet.
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="glass glass-hover h-9 w-9 grid place-items-center rounded-full text-xs font-semibold">
                {initials}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="glass-strong w-56">
              <DropdownMenuLabel>
                <div className="text-sm font-semibold">{user.name}</div>
                <div className="text-xs text-muted-foreground">
                  {user.email}
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={`${roleBasePath}/settings`}>
                  Profile settings
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={`${roleBasePath}/support`}>
                  Help & support
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => signOut()}
                className="cursor-pointer text-destructive focus:bg-destructive/10"
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
